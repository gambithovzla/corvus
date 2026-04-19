const DEFAULT_HEXA_CHANNEL_ACCOUNTS = [
  { platform: 'twitter', language: 'es', market: 'latam', label: 'HEXA X ES', handle: '@hexa_es', isPrimary: true, publishMode: 'hybrid' },
  { platform: 'twitter', language: 'en', market: 'us', label: 'HEXA X EN', handle: '@hexa_en', isPrimary: false, publishMode: 'hybrid' },
  { platform: 'instagram', language: 'es', market: 'latam', label: 'HEXA IG ES', handle: '@hexa_es', isPrimary: true, publishMode: 'hybrid' },
  { platform: 'instagram', language: 'en', market: 'us', label: 'HEXA IG EN', handle: '@hexa_en', isPrimary: false, publishMode: 'hybrid' },
  { platform: 'tiktok', language: 'es', market: 'latam', label: 'HEXA TikTok ES', handle: '@hexa_es', isPrimary: true, publishMode: 'draft' },
  { platform: 'tiktok', language: 'en', market: 'us', label: 'HEXA TikTok EN', handle: '@hexa_en', isPrimary: false, publishMode: 'draft' },
];

async function upsertChannelAccount(prisma, profileId, template) {
  return prisma.channelAccount.upsert({
    where: {
      profileId_platform_language_market: {
        profileId,
        platform: template.platform,
        language: template.language,
        market: template.market,
      },
    },
    update: {
      label: template.label,
      handle: template.handle || null,
      publishMode: template.publishMode || 'manual',
      isPrimary: Boolean(template.isPrimary),
      metadata: template.metadata || {},
    },
    create: {
      profileId,
      platform: template.platform,
      language: template.language,
      market: template.market,
      label: template.label,
      handle: template.handle || null,
      publishMode: template.publishMode || 'manual',
      isPrimary: Boolean(template.isPrimary),
      metadata: template.metadata || {},
    },
  });
}

async function ensureDefaultHexaChannelAccounts(prisma, profile) {
  if (!profile?.id || String(profile.name || '').trim().toUpperCase() !== 'HEXA') {
    return [];
  }

  const accounts = [];
  for (const template of DEFAULT_HEXA_CHANNEL_ACCOUNTS) {
    const account = await upsertChannelAccount(prisma, profile.id, template);
    accounts.push(account);
  }

  return accounts;
}

async function findPreferredChannelAccount(prisma, { profileId, platform, language }) {
  if (!profileId || !platform) {
    return null;
  }

  const candidates = await prisma.channelAccount.findMany({
    where: {
      profileId,
      platform,
      ...(language ? { language } : {}),
    },
    orderBy: [
      { isPrimary: 'desc' },
      { updatedAt: 'desc' },
    ],
    take: 1,
  });

  return candidates[0] || null;
}

module.exports = {
  DEFAULT_HEXA_CHANNEL_ACCOUNTS,
  ensureDefaultHexaChannelAccounts,
  findPreferredChannelAccount,
  upsertChannelAccount,
};
