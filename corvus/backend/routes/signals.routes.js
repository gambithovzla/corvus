const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  const {
    source,
    kind,
    sourceType,
    profileId,
    language,
    limit = 50,
  } = req.query;

  try {
    const parsedLimit = Number.parseInt(limit, 10);
    const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 50;

    const where = {};
    if (source) where.source = String(source);
    if (kind) where.editorialKind = String(kind);
    if (sourceType) where.sourceType = String(sourceType);
    if (profileId) where.profileId = String(profileId);
    if (language) where.language = String(language);

    const signals = await prisma.externalSignal.findMany({
      where,
      include: {
        profile: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
        contentItems: {
          select: {
            id: true,
            title: true,
            status: true,
            language: true,
            pillar: true,
            approvalMode: true,
          },
        },
      },
      orderBy: [
        { editorialScore: 'desc' },
        { importedAt: 'desc' },
      ],
      take: safeLimit,
    });

    return res.json({ success: true, data: signals });
  } catch (error) {
    console.error('Error listando señales:', error.message);
    return res.status(500).json({ error: 'Error obteniendo señales externas' });
  }
});

module.exports = router;
