const { Queue, Worker, QueueEvents } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const { createRedisConnection, REDIS_URL } = require('../config/redis');
const { publishPostToX } = require('../../services/x.service');

const prisma = new PrismaClient();

const QUEUE_NAME = 'publish-queue';
const JOB_NAME = 'publish-post';
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 5000;

let queueConnection = null;
let workerConnection = null;
let eventsConnection = null;
let publishQueue = null;
let publishWorker = null;
let queueEvents = null;
let initialized = false;

async function publishGenericPost(post) {
  return prisma.post.update({
    where: { id: post.id },
    data: {
      status: 'published',
      publishedAt: new Date(),
      publishError: null,
    },
  });
}

async function processPublishJob(job) {
  const postId = job.data?.postId;

  if (!postId) {
    throw new Error('Trabajo invalido: postId es requerido');
  }

  console.log(`[PublishQueue] Procesando post ${postId} (attempt ${job.attemptsMade + 1}/${job.opts.attempts || MAX_ATTEMPTS})`);

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      profileId: true,
      platform: true,
      status: true,
    },
  });

  if (!post) {
    throw new Error(`Post ${postId} no encontrado`);
  }

  if (String(post.status).toLowerCase() !== 'approved') {
    console.log(`[PublishQueue] Post ${postId} omitido. Estado actual: ${post.status}`);
    return { skipped: true, reason: `Estado ${post.status} no publicable` };
  }

  const platform = String(post.platform || '').toLowerCase();
  if (platform === 'twitter') {
    const result = await publishPostToX(postId);
    return {
      published: true,
      platform: post.platform,
      externalPostId: result?.publication?.rootTweetId || null,
    };
  }

  await publishGenericPost(post);
  return {
    published: true,
    platform: post.platform,
    simulated: true,
  };
}

function createResources() {
  queueConnection = createRedisConnection({ connectionName: 'corvus-publish-queue' });
  workerConnection = createRedisConnection({ connectionName: 'corvus-publish-worker' });
  eventsConnection = createRedisConnection({ connectionName: 'corvus-publish-events' });

  publishQueue = new Queue(QUEUE_NAME, {
    connection: queueConnection,
    defaultJobOptions: {
      attempts: MAX_ATTEMPTS,
      backoff: {
        type: 'exponential',
        delay: BASE_BACKOFF_MS,
      },
      removeOnComplete: true,
      removeOnFail: true,
    },
  });

  queueEvents = new QueueEvents(QUEUE_NAME, {
    connection: eventsConnection,
  });

  publishWorker = new Worker(
    QUEUE_NAME,
    processPublishJob,
    {
      connection: workerConnection,
      concurrency: 3,
    }
  );
}

function initializePublishQueue() {
  if (initialized) {
    return;
  }

  initialized = true;
  createResources();

  queueEvents.on('waiting', ({ jobId }) => {
    console.log(`[PublishQueue] Job en espera: ${jobId}`);
  });

  publishWorker.on('completed', (job, result) => {
    console.log(`[PublishQueue] Job completado (${job.id}):`, result);
  });

  publishWorker.on('failed', async (job, error) => {
    if (!job) {
      console.error('[PublishQueue] Job fallido sin metadata:', error?.message || error);
      return;
    }

    const attempts = job.opts?.attempts || MAX_ATTEMPTS;
    const attemptsMade = job.attemptsMade || 0;
    const finalFailure = attemptsMade >= attempts;

    console.error(`[PublishQueue] Job fallido (${job.id}) intento ${attemptsMade}/${attempts}: ${error?.message || error}`);

    if (finalFailure && job.data?.postId) {
      await prisma.post.update({
        where: { id: job.data.postId },
        data: {
          status: 'failed',
          publishError: String(error?.message || 'Error desconocido publicando').slice(0, 2000),
        },
      }).catch((dbError) => {
        console.error('[PublishQueue] No se pudo marcar el post como failed:', dbError?.message || dbError);
      });
    }
  });

  queueEvents.on('error', (error) => {
    console.error('[PublishQueue] QueueEvents error:', error?.message || error);
  });

  publishWorker.on('error', (error) => {
    console.error('[PublishQueue] Worker error:', error?.message || error);
  });

  console.log(`[PublishQueue] Inicializada (${QUEUE_NAME}) con Redis ${REDIS_URL}`);
}

async function enqueuePostForPublishing(postId) {
  if (!initialized) {
    initializePublishQueue();
  }

  if (!postId) {
    throw new Error('postId es requerido para encolar publicacion');
  }

  const jobId = `publish_${postId}`;
  const existingJob = await publishQueue.getJob(jobId);

  if (existingJob) {
    const state = await existingJob.getState();
    return {
      jobId: existingJob.id,
      duplicated: true,
      state,
    };
  }

  const job = await publishQueue.add(JOB_NAME, { postId }, { jobId });
  console.log(`[PublishQueue] Trabajo a\u00f1adido a la cola con ID: ${job.id}`);

  return {
    jobId: job.id,
    duplicated: false,
    state: 'waiting',
  };
}

async function closePublishQueue() {
  if (!initialized) {
    return;
  }

  initialized = false;

  await Promise.allSettled([
    publishWorker?.close(),
    queueEvents?.close(),
    publishQueue?.close(),
    workerConnection?.quit(),
    eventsConnection?.quit(),
    queueConnection?.quit(),
  ]);

  publishWorker = null;
  queueEvents = null;
  publishQueue = null;
  workerConnection = null;
  eventsConnection = null;
  queueConnection = null;
}

module.exports = {
  QUEUE_NAME,
  enqueuePostForPublishing,
  initializePublishQueue,
  closePublishQueue,
};
