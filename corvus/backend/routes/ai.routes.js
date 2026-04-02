const express = require('express');
const router = express.Router();
const { generateContentWithProfile } = require('../services/ai.service');

// POST /api/ai/generate
router.post('/generate', async (req, res) => {
  const { platform, profileId, contentType, topic } = req.body;

  if (!platform || !topic) {
    return res.status(400).json({ error: 'Faltan campos: platform y topic son requeridos' });
  }

  try {
    const { profile, parsed, rawText, usage } = await generateContentWithProfile({
      platform,
      profileId,
      contentType: contentType || 'post',
      topic,
    });

    return res.json({
      success: true,
      data: {
        content: parsed.content || rawText,
        hashtags: parsed.hashtags || '',
        imagePrompt: parsed.imagePrompt || topic,
        contentNotes: parsed.contentNotes || '',
        profileName: profile?.name || null,
      },
      usage,
    });
  } catch (error) {
    console.error('Error generando contenido:', error.message);

    if (error.message?.includes('Perfil no encontrado')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.status === 401) {
      return res.status(401).json({ error: 'API Key de Anthropic invalida' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Limite de API alcanzado. Espera un momento.' });
    }

    return res.status(500).json({ error: `Error generando contenido: ${error.message}` });
  }
});

module.exports = router;
