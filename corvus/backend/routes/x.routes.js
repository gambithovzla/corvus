const express = require('express');
const router = express.Router();
const {
  createAuthUrl,
  handleOAuthCallback,
  getProfileXStatus,
  disconnectXFromProfile,
  createThreadPreview,
  createPreviewFromPost,
  publishPostToX,
} = require('../services/x.service');

function getFrontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

function buildRedirectUrl(params = {}) {
  const baseUrl = getFrontendUrl();
  const query = new URLSearchParams(params).toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}

router.get('/auth-url', async (req, res) => {
  const { profileId } = req.query;

  if (!profileId) {
    return res.status(400).json({ error: 'profileId es requerido' });
  }

  try {
    const result = await createAuthUrl(profileId);
    return res.json({
      success: true,
      data: {
        profileId,
        authUrl: result.authUrl,
      },
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/callback', async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;
  const profileIdFromState = typeof state === 'string' ? state.trim() : '';

  if (error) {
    return res.redirect(buildRedirectUrl({
      success: 'false',
      x_connected: '0',
      x_error: `${error}: ${errorDescription || 'autorizacion cancelada'}`,
    }));
  }

  if (!profileIdFromState) {
    return res.redirect(buildRedirectUrl({
      success: 'false',
      x_connected: '0',
      x_error: 'State OAuth invalido: no se encontro profileId',
    }));
  }

  try {
    const profile = await handleOAuthCallback({ code, state: profileIdFromState });
    return res.redirect(buildRedirectUrl({
      success: 'true',
      x_connected: '1',
      profileId: profileIdFromState || profile.id,
      x_username: profile.xUsername || '',
    }));
  } catch (callbackError) {
    return res.redirect(buildRedirectUrl({
      success: 'false',
      x_connected: '0',
      x_error: callbackError.message || 'error en callback OAuth',
    }));
  }
});

router.get('/status/:profileId', async (req, res) => {
  const { profileId } = req.params;

  try {
    const status = await getProfileXStatus(profileId);
    return res.json({ success: true, data: status });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.delete('/disconnect/:profileId', async (req, res) => {
  const { profileId } = req.params;

  try {
    await disconnectXFromProfile(profileId);
    return res.json({ message: 'Cuenta de X desconectada correctamente' });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ error: error.message });
  }
});

router.post('/preview', async (req, res) => {
  const { postId, content } = req.body || {};

  try {
    const preview = postId
      ? await createPreviewFromPost(postId)
      : createThreadPreview(content);

    return res.json({ success: true, data: preview });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/publish/:postId', async (req, res) => {
  const { postId } = req.params;

  try {
    const result = await publishPostToX(postId);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;
