const Anthropic = require('@anthropic-ai/sdk');
const { PrismaClient } = require('@prisma/client');
const {
  VOICE_PROFILES,
  CONTENT_TYPE_INSTRUCTIONS,
  PLATFORMS,
} = require('../voiceProfiles');

let PLATFORM_CONSTRAINTS;
try {
  PLATFORM_CONSTRAINTS = require('../../frontend/src/constants/platformConstraints.json');
} catch {
  PLATFORM_CONSTRAINTS = Object.fromEntries(
    Object.entries(PLATFORMS || {}).map(([platform, config]) => ([
      platform,
      {
        name: config.name,
        icon: platform.slice(0, 2).toUpperCase(),
        color: '#6366f1',
        bg: '#111827',
        maxChars: config.maxChars || 280,
        hashtagLimit: config.hashtagLimit || 5,
        styleRules: [],
      },
    ]))
  );
}

const prisma = new PrismaClient();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function getDefaultVoicePrompt(platform) {
  return VOICE_PROFILES.hexa?.[platform]
    || VOICE_PROFILES.hexa?.instagram
    || '';
}

function getPlatformConfig(platform) {
  return PLATFORM_CONSTRAINTS[platform] || PLATFORM_CONSTRAINTS.instagram;
}

function normalizeExamples(examples, platform) {
  if (!Array.isArray(examples)) {
    return [];
  }

  return examples
    .map((example) => {
      if (typeof example === 'string') {
        return { text: example, platform: null };
      }

      if (example && typeof example === 'object') {
        const text = typeof example.text === 'string'
          ? example.text
          : typeof example.content === 'string'
            ? example.content
            : '';

        return {
          text,
          platform: typeof example.platform === 'string' ? example.platform : null,
          notes: typeof example.notes === 'string' ? example.notes : '',
        };
      }

      return null;
    })
    .filter(Boolean)
    .filter((item) => item.text && (!item.platform || item.platform === platform))
    .slice(0, 6);
}

function formatExamplesSection(examples) {
  if (!examples.length) {
    return 'No hay ejemplos historicos cargados para este perfil.';
  }

  return examples
    .map((example, index) => {
      const notes = example.notes ? `\nNotas de exito: ${example.notes}` : '';
      return `Ejemplo ${index + 1}:\n${example.text}${notes}`;
    })
    .join('\n\n');
}

function buildPlatformRules(platform) {
  const config = getPlatformConfig(platform);
  const ruleList = Array.isArray(config.styleRules) ? config.styleRules : [];

  const coreRules = [
    `Plataforma objetivo: ${config.name}`,
    `Maximo de caracteres: ${config.maxChars}`,
    `Limite sugerido de hashtags: ${config.hashtagLimit}`,
    ...ruleList.map((rule, index) => `Regla de estilo ${index + 1}: ${rule}`),
  ];

  return coreRules.join('\n');
}

function buildSystemPromptFromProfile({
  voicePrompt,
  examples,
  platform,
  contentType,
}) {
  const typeInstruction = CONTENT_TYPE_INSTRUCTIONS[contentType] || CONTENT_TYPE_INSTRUCTIONS.post;
  const platformRules = buildPlatformRules(platform);
  const examplesSection = formatExamplesSection(examples);

  return [
    'Eres el motor de copywriting de CORVUS.',
    '',
    '=== VOZ BASE DEL PERFIL ===',
    voicePrompt,
    '',
    '=== FEW-SHOT EXAMPLES (posts exitosos del perfil) ===',
    examplesSection,
    '',
    '=== REGLAS DE PLATAFORMA ===',
    platformRules,
    '',
    '=== TIPO DE CONTENIDO ===',
    typeInstruction,
    '',
    '=== FORMATO DE RESPUESTA OBLIGATORIO ===',
    'Responde UNICAMENTE con JSON valido y sin markdown.',
    'Estructura exacta:',
    '{',
    '  "content": "texto final del post",',
    '  "hashtags": "#tag1 #tag2 #tag3",',
    '  "imagePrompt": "english visual prompt in one sentence",',
    '  "contentNotes": "notas cortas de por que el copy funciona"',
    '}',
  ].join('\n');
}

async function getPromptContextForProfile({ profileId, platform, contentType = 'post' }) {
  let profile = null;

  if (profileId) {
    profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        name: true,
        voicePrompts: true,
        examples: true,
      },
    });

    if (!profile) {
      throw new Error('Perfil no encontrado para generar contenido');
    }
  }

  const voicePrompts = profile?.voicePrompts && typeof profile.voicePrompts === 'object'
    ? profile.voicePrompts
    : {};

  const platformVoice = typeof voicePrompts[platform] === 'string'
    ? voicePrompts[platform].trim()
    : '';

  const voicePrompt = platformVoice || getDefaultVoicePrompt(platform);
  const examples = normalizeExamples(profile?.examples, platform);
  const systemPrompt = buildSystemPromptFromProfile({
    voicePrompt,
    examples,
    platform,
    contentType,
  });

  return {
    profile,
    systemPrompt,
    voicePrompt,
    examples,
  };
}

function parseModelJson(rawText, fallbackTopic = '') {
  try {
    const clean = rawText.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return {
      content: rawText,
      hashtags: '',
      imagePrompt: fallbackTopic,
      contentNotes: 'Respuesta en texto libre (no JSON)',
    };
  }
}

async function generateContentWithProfile({
  platform,
  profileId,
  contentType = 'post',
  topic,
}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY no configurada');
  }

  const promptContext = await getPromptContextForProfile({
    profileId,
    platform,
    contentType,
  });

  console.log('[AI] Prompt enviado a Anthropic:');
  console.log(promptContext.systemPrompt);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: promptContext.systemPrompt,
    messages: [{ role: 'user', content: `Tema: ${topic}` }],
  });

  const rawText = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  const parsed = parseModelJson(rawText, topic);

  return {
    profile: promptContext.profile,
    parsed,
    rawText,
    usage: {
      inputTokens: message.usage?.input_tokens || 0,
      outputTokens: message.usage?.output_tokens || 0,
    },
  };
}

async function refineProfileVoicePrompt({
  profileId,
  platform = 'instagram',
  userDescription,
}) {
  if (!userDescription || !String(userDescription).trim()) {
    throw new Error('La descripcion informal es requerida para refinar el perfil');
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY no configurada');
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      name: true,
      voicePrompts: true,
      examples: true,
    },
  });

  if (!profile) {
    throw new Error('Perfil no encontrado');
  }

  const voicePrompts = profile.voicePrompts && typeof profile.voicePrompts === 'object'
    ? profile.voicePrompts
    : {};

  const currentVoicePrompt = typeof voicePrompts[platform] === 'string' && voicePrompts[platform].trim()
    ? voicePrompts[platform].trim()
    : getDefaultVoicePrompt(platform);

  const examples = normalizeExamples(profile.examples, platform);
  const platformRules = buildPlatformRules(platform);

  const refinementPrompt = [
    'Actua como prompt engineer para un equipo de social media.',
    'Debes mejorar el prompt de voz para que sea claro, accionable y consistente.',
    'No expliques nada: devuelve solo el nuevo prompt en texto plano.',
    '',
    `Perfil: ${profile.name}`,
    `Plataforma: ${platform}`,
    '',
    'Prompt actual:',
    currentVoicePrompt,
    '',
    'Descripcion informal del usuario:',
    String(userDescription).trim(),
    '',
    'Ejemplos exitosos del perfil:',
    formatExamplesSection(examples),
    '',
    'Reglas obligatorias de plataforma:',
    platformRules,
  ].join('\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    messages: [{ role: 'user', content: refinementPrompt }],
  });

  const refinedPrompt = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .replace(/```/g, '')
    .trim();

  if (!refinedPrompt) {
    throw new Error('Claude no devolvio un prompt refinado');
  }

  const updatedProfile = await prisma.profile.update({
    where: { id: profileId },
    data: {
      voicePrompts: {
        ...voicePrompts,
        [platform]: refinedPrompt,
      },
    },
    select: {
      id: true,
      name: true,
      voicePrompts: true,
      examples: true,
      updatedAt: true,
    },
  });

  return {
    profile: updatedProfile,
    platform,
    refinedPrompt,
    usage: {
      inputTokens: message.usage?.input_tokens || 0,
      outputTokens: message.usage?.output_tokens || 0,
    },
  };
}

module.exports = {
  generateContentWithProfile,
  refineProfileVoicePrompt,
  getPromptContextForProfile,
  buildSystemPromptFromProfile,
};
