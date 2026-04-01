const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { getSystemPromptForProfile } = require('../services/voice.service');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// POST /api/ai/generate
router.post('/generate', async (req, res) => {
  const { platform, profileId, contentType, topic } = req.body;

  if (!platform || !topic) {
    return res.status(400).json({ error: 'Faltan campos: platform y topic son requeridos' });
  }

  try {
    const { profile, systemPrompt } = await getSystemPromptForProfile({
      profileId,
      platform,
      contentType: contentType || 'post',
    });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        { role: 'user', content: `Tema: ${topic}` },
      ],
    });

    const rawText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    let parsed;
    try {
      const clean = rawText.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = {
        content: rawText,
        hashtags: '',
        imagePrompt: topic,
        contentNotes: 'Respuesta en texto libre (no JSON)',
      };
    }

    return res.json({
      success: true,
      data: {
        content: parsed.content || rawText,
        hashtags: parsed.hashtags || '',
        imagePrompt: parsed.imagePrompt || topic,
        contentNotes: parsed.contentNotes || '',
        profileName: profile?.name || null,
      },
      usage: {
        inputTokens: message.usage?.input_tokens || 0,
        outputTokens: message.usage?.output_tokens || 0,
      },
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