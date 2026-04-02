const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { refineProfileVoicePrompt } = require('../services/ai.service');

const prisma = new PrismaClient();

const SAFE_PROFILE_SELECT = {
  id: true,
  name: true,
  avatar: true,
  color: true,
  voicePrompts: true,
  examples: true,
  xUserId: true,
  xUsername: true,
  xConnectedAt: true,
  xTokenExpiresAt: true,
  createdAt: true,
  updatedAt: true,
};

function mapProfile(profile) {
  if (!profile) return profile;

  return {
    ...profile,
    xConnected: Boolean(profile.xUsername && profile.xConnectedAt),
  };
}

// GET /api/profiles - Listar todas las marcas/perfiles
router.get('/', async (req, res) => {
  try {
    const profiles = await prisma.profile.findMany({
      select: {
        ...SAFE_PROFILE_SELECT,
        _count: { select: { posts: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: profiles.map(mapProfile) });
  } catch (error) {
    console.error('Error listando perfiles:', error.message);
    res.status(500).json({ error: 'Error obteniendo perfiles' });
  }
});

// POST /api/profiles - Crear un perfil nuevo
router.post('/', async (req, res) => {
  const { name, avatar, color, voicePrompts, examples } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  try {
    const profile = await prisma.profile.create({
      data: {
        name,
        avatar: avatar || name.substring(0, 2).toUpperCase(),
        color: color || '#6366f1',
        voicePrompts: voicePrompts || {},
        examples: Array.isArray(examples) ? examples : [],
      },
      select: SAFE_PROFILE_SELECT,
    });
    res.json({ success: true, data: mapProfile(profile) });
  } catch (error) {
    console.error('Error creando perfil:', error.message);
    res.status(500).json({ error: 'Error creando perfil' });
  }
});

// POST /api/profiles/seed - Crear perfiles iniciales
router.post('/seed', async (req, res) => {
  try {
    const existing = await prisma.profile.count();
    if (existing > 0) {
      return res.json({ success: true, message: 'Perfiles ya existen', seeded: false });
    }

    const profiles = await prisma.profile.createMany({
      data: [
        { name: 'HEXA', avatar: 'H', color: '#6366f1' },
        { name: 'Marca 2', avatar: 'M2', color: '#0ea5e9' },
        { name: 'Marca 3', avatar: 'M3', color: '#10b981' },
      ],
    });

    res.json({ success: true, message: `${profiles.count} perfiles creados`, seeded: true });
  } catch (error) {
    console.error('Error en seed:', error.message);
    res.status(500).json({ error: 'Error creando perfiles iniciales' });
  }
});

// PATCH /api/profiles/:id - Actualizar campos editables del perfil
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    name,
    avatar,
    color,
    voicePrompts,
    examples,
  } = req.body || {};

  if (examples !== undefined && !Array.isArray(examples)) {
    return res.status(400).json({ error: 'examples debe ser un arreglo JSON' });
  }

  const data = {};
  if (name !== undefined) data.name = name;
  if (avatar !== undefined) data.avatar = avatar;
  if (color !== undefined) data.color = color;
  if (voicePrompts !== undefined) data.voicePrompts = voicePrompts;
  if (examples !== undefined) data.examples = examples;

  if (!Object.keys(data).length) {
    return res.status(400).json({ error: 'No hay campos para actualizar' });
  }

  try {
    const profile = await prisma.profile.update({
      where: { id },
      data,
      select: SAFE_PROFILE_SELECT,
    });

    return res.json({ success: true, data: mapProfile(profile) });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    console.error('Error actualizando perfil:', error.message);
    return res.status(500).json({ error: 'Error actualizando perfil' });
  }
});

// PATCH /api/profiles/:id/refine - Refinar prompt de voz con Claude
router.patch('/:id/refine', async (req, res) => {
  const { id } = req.params;
  const { platform = 'instagram', description } = req.body || {};

  if (!description || !String(description).trim()) {
    return res.status(400).json({ error: 'description es requerido para refinar el prompt' });
  }

  try {
    const result = await refineProfileVoicePrompt({
      profileId: id,
      platform,
      userDescription: description,
    });

    return res.json({
      success: true,
      data: {
        profileId: result.profile.id,
        profileName: result.profile.name,
        platform: result.platform,
        refinedPrompt: result.refinedPrompt,
        voicePrompts: result.profile.voicePrompts,
        examples: result.profile.examples,
        updatedAt: result.profile.updatedAt,
      },
      usage: result.usage,
    });
  } catch (error) {
    console.error('Error refinando perfil:', error.message);

    if (error.message?.includes('Perfil no encontrado')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.status === 401) {
      return res.status(401).json({ error: 'API Key de Anthropic invalida' });
    }

    if (error.status === 429) {
      return res.status(429).json({ error: 'Limite de API alcanzado. Espera un momento.' });
    }

    return res.status(500).json({ error: `No se pudo refinar el prompt: ${error.message}` });
  }
});

module.exports = router;
