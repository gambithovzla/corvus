const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { TwitterApi } = require('twitter-api-v2');

const prisma = new PrismaClient();

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const oauthStateStore = new Map();
const TOKEN_REFRESH_SKEW_MS = 60 * 1000;
const SAFE_PROFILE_SELECT = {
  id: true,
  name: true,
  avatar: true,
  color: true,
  xUsername: true,
  xConnectedAt: true,
};

function cleanupExpiredOAuthStates() {
  const now = Date.now();
  for (const [state, value] of oauthStateStore.entries()) {
    if (!value || value.expiresAt <= now) {
      oauthStateStore.delete(state);
    }
  }
}

setInterval(cleanupExpiredOAuthStates, 60 * 1000).unref();

function getXConfig() {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const redirectUri = process.env.X_REDIRECT_URI;
  const scopes = (process.env.X_SCOPES || 'tweet.read tweet.write users.read offline.access')
    .split(' ')
    .map((scope) => scope.trim())
    .filter(Boolean);

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Faltan variables de entorno de X: X_CLIENT_ID, X_CLIENT_SECRET, X_REDIRECT_URI');
  }

  return { clientId, clientSecret, redirectUri, scopes };
}

function createOAuthClient() {
  const { clientId, clientSecret } = getXConfig();
  return new TwitterApi({ clientId, clientSecret });
}

function saveOAuthState({ state, profileId, codeVerifier }) {
  oauthStateStore.set(state, {
    profileId,
    codeVerifier,
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
  });
}

function consumeOAuthState(state) {
  const value = oauthStateStore.get(state);
  oauthStateStore.delete(state);

  if (!value || value.expiresAt <= Date.now()) {
    throw new Error('Estado OAuth expirado o invalido. Vuelve a conectar X.');
  }

  return value;
}

async function createAuthUrl(profileId) {
  if (!profileId) {
    throw new Error('profileId es requerido');
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true },
  });

  if (!profile) {
    throw new Error('Perfil no encontrado');
  }

  const { redirectUri, scopes } = getXConfig();
  const generatedState = crypto.randomBytes(16).toString('hex');
  const authClient = createOAuthClient();

  const { url, state, codeVerifier } = authClient.generateOAuth2AuthLink(
    redirectUri,
    {
      scope: scopes,
      state: generatedState,
    }
  );

  saveOAuthState({ state, profileId, codeVerifier });

  return { authUrl: url, state };
}

async function handleOAuthCallback({ code, state }) {
  if (!code || !state) {
    throw new Error('Faltan parametros OAuth en callback');
  }

  const { profileId, codeVerifier } = consumeOAuthState(state);
  const { redirectUri } = getXConfig();
  const authClient = createOAuthClient();

  const {
    client: loggedClient,
    accessToken,
    refreshToken,
    expiresIn,
  } = await authClient.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri,
  });

  const me = await loggedClient.v2.me();
  const xUserId = me?.data?.id || null;
  const xUsername = me?.data?.username || null;
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + (expiresIn * 1000))
    : null;

  const updatedProfile = await prisma.profile.update({
    where: { id: profileId },
    data: {
      xUserId,
      xUsername,
      xAccessToken: accessToken || null,
      xRefreshToken: refreshToken || null,
      xTokenExpiresAt: tokenExpiresAt,
      xConnectedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      xUserId: true,
      xUsername: true,
      xConnectedAt: true,
      xTokenExpiresAt: true,
    },
  });

  return updatedProfile;
}

function splitIntoChunks(text, maxChars = 280) {
  const sanitized = String(text || '').replace(/\r/g, '').trim();
  if (!sanitized) return [];

  if (sanitized.length <= maxChars) {
    return [sanitized];
  }

  const chunks = [];
  let remaining = sanitized;

  while (remaining.length > maxChars) {
    let cutIndex = remaining.lastIndexOf('\n', maxChars);
    if (cutIndex < 0) {
      cutIndex = remaining.lastIndexOf(' ', maxChars);
    }
    if (cutIndex < 1) {
      cutIndex = maxChars;
    }

    const chunk = remaining.slice(0, cutIndex).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    remaining = remaining.slice(cutIndex).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

function splitThreadContent(content) {
  const rawContent = String(content || '');
  if (!rawContent.trim()) {
    return [];
  }

  const manualParts = rawContent
    .split('---TWEET---')
    .map((part) => part.trim())
    .filter(Boolean);

  if (manualParts.length > 1) {
    return manualParts.flatMap((part) => splitIntoChunks(part, 280));
  }

  return splitIntoChunks(rawContent, 280);
}

async function getProfileXStatus(profileId) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      name: true,
      xUserId: true,
      xUsername: true,
      xConnectedAt: true,
      xTokenExpiresAt: true,
      xAccessToken: true,
    },
  });

  if (!profile) {
    throw new Error('Perfil no encontrado');
  }

  const connected = Boolean(profile.xAccessToken && profile.xUsername);

  return {
    profileId: profile.id,
    profileName: profile.name,
    connected,
    xUserId: profile.xUserId || null,
    xUsername: profile.xUsername || null,
    xConnectedAt: profile.xConnectedAt || null,
    xTokenExpiresAt: profile.xTokenExpiresAt || null,
  };
}

async function disconnectXFromProfile(profileId) {
  if (!profileId) {
    throw new Error('profileId es requerido');
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true },
  });

  if (!profile) {
    const error = new Error('Perfil no encontrado');
    error.statusCode = 404;
    throw error;
  }

  await prisma.profile.update({
    where: { id: profileId },
    data: {
      xUserId: null,
      xUsername: null,
      xAccessToken: null,
      xRefreshToken: null,
      xTokenExpiresAt: null,
      xConnectedAt: null,
    },
  });
}

function canAttemptTokenRefresh(profile) {
  return Boolean(
    profile.xRefreshToken
    && profile.xTokenExpiresAt
    && profile.xTokenExpiresAt.getTime() <= (Date.now() + TOKEN_REFRESH_SKEW_MS)
  );
}

async function maybeRefreshProfileToken(profile) {
  if (!canAttemptTokenRefresh(profile)) {
    return profile;
  }

  const { clientId, clientSecret } = getXConfig();

  try {
    const currentClient = new TwitterApi({
      clientId,
      clientSecret,
      accessToken: profile.xAccessToken,
      refreshToken: profile.xRefreshToken,
    });

    const refreshed = await currentClient.refreshOAuth2Token(profile.xRefreshToken);

    const refreshedAccessToken = refreshed.accessToken || profile.xAccessToken;
    const refreshedRefreshToken = refreshed.refreshToken || profile.xRefreshToken;
    const refreshedExpiresAt = refreshed.expiresIn
      ? new Date(Date.now() + (refreshed.expiresIn * 1000))
      : profile.xTokenExpiresAt;

    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        xAccessToken: refreshedAccessToken,
        xRefreshToken: refreshedRefreshToken,
        xTokenExpiresAt: refreshedExpiresAt,
      },
    });

    return updated;
  } catch (error) {
    // No bloqueamos todo el flujo por refresh. Se intentara publicar con token actual.
    return profile;
  }
}

async function buildAuthenticatedClient(profileId) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
  });

  if (!profile) {
    throw new Error('Perfil no encontrado');
  }

  if (!profile.xAccessToken || !profile.xUsername) {
    throw new Error('El perfil no tiene X conectado');
  }

  const refreshedProfile = await maybeRefreshProfileToken(profile);

  const client = new TwitterApi(refreshedProfile.xAccessToken);

  return { client, profile: refreshedProfile };
}

function createThreadPreview(content) {
  const tweets = splitThreadContent(content);
  if (!tweets.length) {
    throw new Error('No hay contenido para generar preview');
  }

  return {
    totalTweets: tweets.length,
    tweets: tweets.map((text, index) => ({
      index: index + 1,
      text,
      characters: text.length,
    })),
  };
}

async function createPreviewFromPost(postId) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      platform: true,
      status: true,
      content: true,
      topic: true,
    },
  });

  if (!post) {
    throw new Error('Post no encontrado');
  }

  return {
    postId: post.id,
    platform: post.platform,
    status: post.status,
    topic: post.topic,
    ...createThreadPreview(post.content),
  };
}

async function publishPostToX(postId) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { profile: true },
  });

  if (!post) {
    throw new Error('Post no encontrado');
  }

  if (post.platform !== 'twitter') {
    throw new Error('Solo se permite publicar en X para posts de Twitter');
  }

  if (String(post.status).toLowerCase() !== 'approved') {
    throw new Error('Solo se pueden publicar posts con estado approved');
  }

  const tweets = splitThreadContent(post.content);
  if (!tweets.length) {
    throw new Error('El contenido del post esta vacio');
  }

  try {
    const { client } = await buildAuthenticatedClient(post.profileId);
    const publishedTweets = [];
    let rootTweetId = null;
    let previousTweetId = null;

    for (const text of tweets) {
      const payload = previousTweetId
        ? { text, reply: { in_reply_to_tweet_id: previousTweetId } }
        : { text };

      const response = await client.v2.tweet(payload);
      const tweetId = response?.data?.id;

      if (!tweetId) {
        throw new Error('X no devolvio un tweet ID valido');
      }

      if (!rootTweetId) {
        rootTweetId = tweetId;
      }

      previousTweetId = tweetId;
      publishedTweets.push({
        id: tweetId,
        text,
        characters: text.length,
      });
    }

    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        externalPostId: rootTweetId,
        threadRootId: rootTweetId,
        publishError: null,
      },
      include: { profile: { select: SAFE_PROFILE_SELECT } },
    });

    return {
      success: true,
      post: updatedPost,
      publication: {
        rootTweetId,
        totalTweets: publishedTweets.length,
        tweets: publishedTweets,
      },
    };
  } catch (error) {
    const errorMessage = String(error?.message || 'Error publicando en X').slice(0, 2000);

    await prisma.post.update({
      where: { id: post.id },
      data: {
        publishError: errorMessage,
      },
    });

    throw new Error(errorMessage);
  }
}

module.exports = {
  createAuthUrl,
  handleOAuthCallback,
  getProfileXStatus,
  disconnectXFromProfile,
  createThreadPreview,
  createPreviewFromPost,
  publishPostToX,
  splitThreadContent,
};
