const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SAFE_PROFILE_SELECT = {
  id: true,
  name: true,
  avatar: true,
  color: true,
  voicePrompts: true,
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
  const { name, avatar, color, voicePrompts } = req.body;

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

module.exports = router;
