const IORedis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const DEFAULT_REDIS_OPTIONS = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
};

function createRedisConnection(extraOptions = {}) {
  return new IORedis(REDIS_URL, {
    ...DEFAULT_REDIS_OPTIONS,
    ...extraOptions,
  });
}

module.exports = {
  REDIS_URL,
  createRedisConnection,
};
