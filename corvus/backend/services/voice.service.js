const { PrismaClient } = require('@prisma/client');
const {
  VOICE_PROFILES,
  CONTENT_TYPE_INSTRUCTIONS,
  PLATFORMS,
} = require('../voiceProfiles');

const prisma = new PrismaClient();

function getDefaultVoicePrompt(platform) {
  return VOICE_PROFILES.hexa?.[platform]
    || VOICE_PROFILES.hexa?.instagram
    || '';
}

function buildSystemPromptFromVoice(voicePrompt, platform, contentType) {
  const typeInstruction = CONTENT_TYPE_INSTRUCTIONS[contentType] || CONTENT_TYPE_INSTRUCTIONS.post;
  const platformInfo = PLATFORMS[platform] || PLATFORMS.instagram;

  return `${voicePrompt}

Tipo de contenido solicitado: ${typeInstruction}
Plataforma: ${platformInfo.name} (maximo ${platformInfo.maxChars} caracteres)

FORMATO DE RESPUESTA OBLIGATORIO:
Responde UNICAMENTE con un JSON valido, sin markdown, sin backticks, sin texto adicional.
La estructura debe ser exactamente:
{
  "content": "el texto completo del post aqui",
  "hashtags": "#hashtag1 #hashtag2 #hashtag3",
  "imagePrompt": "descripcion en ingles de la imagen ideal para acompanar este post (1 frase)",
  "contentNotes": "notas breves sobre el contenido generado"
}`;
}

async function getSystemPromptForProfile({ profileId, platform, contentType = 'post' }) {
  let profile = null;

  if (profileId) {
    profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true, name: true, voicePrompts: true },
    });

    if (!profile) {
      throw new Error('Perfil no encontrado para generar contenido');
    }
  }

  const voicePrompts = profile && profile.voicePrompts && typeof profile.voicePrompts === 'object'
    ? profile.voicePrompts
    : {};

  const profileVoice = typeof voicePrompts[platform] === 'string'
    ? voicePrompts[platform].trim()
    : '';

  const voicePrompt = profileVoice || getDefaultVoicePrompt(platform);

  return {
    profile,
    systemPrompt: buildSystemPromptFromVoice(voicePrompt, platform, contentType),
  };
}

module.exports = {
  getSystemPromptForProfile,
  buildSystemPromptFromVoice,
  getDefaultVoicePrompt,
};
