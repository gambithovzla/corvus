const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/posts - Listar posts con filtros
router.get('/', async (req, res) => {
  const { status, platform, profileId, limit = 50 } = req.query;

  try {
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (platform) where.platform = platform;
    if (profileId) where.profileId = profileId;

    const posts = await prisma.post.findMany({
      where,
      include: { profile: true },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    res.json({ success: true, data: posts });
  } catch (error) {
    console.error('Error listando posts:', error.message);
    res.status(500).json({ error: 'Error obteniendo posts' });
  }
});

// POST /api/posts - Crear un post nuevo
router.post('/', async (req, res) => {
  const { profileId, platform, contentType, topic, content, hashtags, imageUrl, status } = req.body;

  if (!profileId || !platform || !content) {
    return res.status(400).json({ error: 'Faltan campos requeridos: profileId, platform, content' });
  }

  try {
    const post = await prisma.post.create({
      data: {
        profileId,
        platform,
        contentType: contentType || 'post',
        topic: topic || '',
        content,
        hashtags: hashtags || '',
        imageUrl: imageUrl || '',
        status: status || 'review',
      },
      include: { profile: true },
    });

    res.json({ success: true, data: post });
  } catch (error) {
    console.error('Error creando post:', error.message);
    res.status(500).json({ error: 'Error creando post: ' + error.message });
  }
});

// PATCH /api/posts/:id - Actualizar estado de un post
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, content, hashtags, scheduledAt } = req.body;

  try {
    const data = {};
    if (status) data.status = status;
    if (content) data.content = content;
    if (hashtags !== undefined) data.hashtags = hashtags;
    if (scheduledAt) data.scheduledAt = new Date(scheduledAt);
    if (status === 'published') data.publishedAt = new Date();

    const post = await prisma.post.update({
      where: { id },
      data,
      include: { profile: true },
    });

    res.json({ success: true, data: post });
  } catch (error) {
    console.error('Error actualizando post:', error.message);
    res.status(500).json({ error: 'Error actualizando post' });
  }
});

// DELETE /api/posts/:id - Eliminar un post
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.post.delete({ where: { id } });
    res.json({ success: true, message: 'Post eliminado' });
  } catch (error) {
    console.error('Error eliminando post:', error.message);
    res.status(500).json({ error: 'Error eliminando post' });
  }
});

module.exports = router;
