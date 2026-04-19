const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const {
  checkHexaHealth,
  getEasternDateString,
  getEasternParts,
  getHexaBoard,
  getHexaGames,
  getHexaHighlightsLink,
  getHexaInsights,
  getHexaPerformanceSummary,
  getHexaPlayByPlay,
  getHexaPostmortem,
  getHexaTodayPicks,
  isHexaConfigured,
} = require('./hexa.client');
const {
  ensureDefaultHexaChannelAccounts,
} = require('./channel-account.service');

const prisma = new PrismaClient();

const schedulerState = {
  started: false,
  running: false,
  lastAutoSyncAt: null,
  lastManualSyncAt: null,
  lastCompletedAt: null,
  lastError: null,
  lastSummary: null,
  lastCadenceMinutes: null,
};

let schedulerTimer = null;

function sha1(value) {
  return crypto.createHash('sha1').update(String(value || '')).digest('hex');
}

function toJsonString(value) {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return '{}';
  }
}

function normalizeText(value, max = 200) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function pickIsResolved(result) {
  return ['win', 'loss', 'push'].includes(String(result || '').toLowerCase());
}

function isTrackableStoryPick(pickText) {
  const value = String(pickText || '');
  return /\bHits?\b|\bHome Runs?\b|\bJonrones?\b|\bto record a hit\b|\bhit\b/i.test(value);
}

function parseTrackableDescriptor(pickText) {
  const clean = String(pickText || '').replace(/\s+/g, ' ').trim();
  if (!clean) {
    return null;
  }

  const hitPatterns = [
    /^(.*?)\s+(?:Over|Under)\s+\d+(?:\.\d+)?\s+Hits?$/i,
    /^(.*?)\s+(?:to record a hit|consiga un hit|registre un hit)$/i,
  ];
  for (const pattern of hitPatterns) {
    const match = clean.match(pattern);
    if (match?.[1]) {
      return {
        propType: 'hit',
        playerName: normalizeText(match[1], 120),
      };
    }
  }

  const homeRunPatterns = [
    /^(.*?)\s+(?:Over|Under)\s+\d+(?:\.\d+)?\s+Home Runs?$/i,
    /^(.*?)\s+(?:pegara un jonron|to hit a home run)$/i,
  ];
  for (const pattern of homeRunPatterns) {
    const match = clean.match(pattern);
    if (match?.[1]) {
      return {
        propType: 'home_run',
        playerName: normalizeText(match[1], 120),
      };
    }
  }

  return null;
}

function findRelevantPlay(playByPlayData, descriptor) {
  if (!descriptor || !Array.isArray(playByPlayData?.plays)) {
    return null;
  }

  const playerName = String(descriptor.playerName || '').toLowerCase();
  const playerLastName = playerName.split(' ').filter(Boolean).pop();
  if (!playerLastName) {
    return null;
  }

  const candidates = playByPlayData.plays.filter((play) => {
    const batterName = String(play?.batter?.name || '').toLowerCase();
    if (!batterName.includes(playerLastName)) {
      return false;
    }

    if (descriptor.propType === 'hit') {
      return Boolean(play.hasHit);
    }

    if (descriptor.propType === 'home_run') {
      return String(play.eventType || '').toLowerCase() === 'home_run';
    }

    return false;
  });

  return candidates[0] || null;
}

function getRiskForEditorialKind(editorialKind) {
  const riskMap = {
    pick_alert: 'high',
    result_recap: 'medium',
    postmortem: 'medium',
    education: 'low',
    hexa_called_it: 'medium',
    performance_snapshot: 'high',
    insight: 'medium',
  };
  return riskMap[editorialKind] || 'medium';
}

function getApprovalModeForRisk(riskLevel) {
  return riskLevel === 'low' ? 'auto_low_only' : 'manual_review';
}

function getPillarForEditorialKind(editorialKind) {
  const pillarMap = {
    pick_alert: 'pick',
    result_recap: 'results',
    postmortem: 'analysis',
    education: 'education',
    hexa_called_it: 'community',
    performance_snapshot: 'product',
    insight: 'analysis',
  };
  return pillarMap[editorialKind] || 'analysis';
}

function getObjectiveForEditorialKind(editorialKind) {
  const objectiveMap = {
    pick_alert: 'traffic',
    result_recap: 'authority',
    postmortem: 'authority',
    education: 'engagement',
    hexa_called_it: 'engagement',
    performance_snapshot: 'authority',
    insight: 'authority',
  };
  return objectiveMap[editorialKind] || 'authority';
}

function scorePickAlert(pick) {
  const confidence = Number(pick.oracle_confidence || 0);
  const betValue = String(pick.bet_value || '').toUpperCase();
  const boost = betValue === 'HIGH VALUE' ? 12 : 6;
  return Math.min(100, confidence + boost);
}

function scoreResultRecap(pick) {
  const confidence = Number(pick.oracle_confidence || 0);
  const result = String(pick.result || '').toLowerCase();
  const resultBoost = result === 'win' ? 10 : result === 'loss' ? 4 : 2;
  return Math.min(100, confidence + resultBoost);
}

function scoreBoardSignal(signal, index) {
  const priority = Number(signal?.priority || 0);
  const rankBonus = Math.max(0, 10 - index);
  return Math.min(100, priority + rankBonus);
}

function buildDedupeKey(parts) {
  return parts.filter(Boolean).join(':');
}

async function ensureHexaProfile(profileId) {
  if (profileId) {
    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) {
      throw new Error('Perfil HEXA no encontrado');
    }
    await ensureDefaultHexaChannelAccounts(prisma, profile);
    return profile;
  }

  let profile = await prisma.profile.findFirst({
    where: { name: 'HEXA' },
    orderBy: { createdAt: 'asc' },
  });

  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        name: 'HEXA',
        avatar: 'HX',
        color: '#0f172a',
      },
    });
  }

  await ensureDefaultHexaChannelAccounts(prisma, profile);
  return profile;
}

async function upsertExternalSignal({
  profileId,
  sourceType,
  externalId,
  gamePk,
  language,
  title,
  summary,
  editorialKind,
  editorialScore,
  riskLevel,
  payload,
  metadata,
  dedupeKey,
}) {
  const importedAt = new Date();
  const signal = await prisma.externalSignal.upsert({
    where: { dedupeKey },
    update: {
      externalId,
      gamePk: gamePk ?? null,
      language: language || null,
      title: title || null,
      summary: summary || null,
      editorialKind: editorialKind || null,
      editorialScore: editorialScore ?? 0,
      riskLevel: riskLevel || 'medium',
      payload,
      metadata: metadata || {},
      importedAt,
    },
    create: {
      profileId,
      source: 'hexa',
      sourceType,
      externalId,
      gamePk: gamePk ?? null,
      language: language || null,
      title: title || null,
      summary: summary || null,
      editorialKind: editorialKind || null,
      editorialScore: editorialScore ?? 0,
      riskLevel: riskLevel || 'medium',
      payload,
      metadata: metadata || {},
      dedupeKey,
      importedAt,
    },
  });

  const contentItem = await prisma.contentItem.upsert({
    where: { primarySignalId: signal.id },
    update: {
      title: signal.title || `${signal.sourceType} ${signal.externalId}`,
      summary: signal.summary || null,
      language: signal.language || null,
      pillar: getPillarForEditorialKind(signal.editorialKind),
      objective: getObjectiveForEditorialKind(signal.editorialKind),
      riskLevel: signal.riskLevel,
      approvalMode: getApprovalModeForRisk(signal.riskLevel),
      status: signal.riskLevel === 'low' ? 'ready' : 'review',
      brief: {
        signalId: signal.id,
        sourceType: signal.sourceType,
        editorialKind: signal.editorialKind,
      },
      sourceSignalIds: [signal.id],
    },
    create: {
      profileId,
      primarySignalId: signal.id,
      sourceSignalIds: [signal.id],
      title: signal.title || `${signal.sourceType} ${signal.externalId}`,
      summary: signal.summary || null,
      language: signal.language || null,
      pillar: getPillarForEditorialKind(signal.editorialKind),
      objective: getObjectiveForEditorialKind(signal.editorialKind),
      riskLevel: signal.riskLevel,
      approvalMode: getApprovalModeForRisk(signal.riskLevel),
      status: signal.riskLevel === 'low' ? 'ready' : 'review',
      brief: {
        signalId: signal.id,
        sourceType: signal.sourceType,
        editorialKind: signal.editorialKind,
      },
    },
  });

  return { signal, contentItem };
}

async function persistBoardSignals(profileId, boardPayload) {
  const insights = Array.isArray(boardPayload?.insights) ? boardPayload.insights : [];
  const selectedSignals = insights
    .filter((signal, index) => Number(signal?.priority || 0) >= 75 || index < 10)
    .slice(0, 10);

  const persisted = [];
  for (const [index, signal] of selectedSignals.entries()) {
    for (const language of ['es', 'en']) {
      const textValue = signal?.text?.[language] || signal?.text?.es || signal?.text?.en || '';
      const title = normalizeText(textValue, 120);
      const summary = normalizeText(
        `${signal?.type || 'board_signal'} | prioridad ${signal?.priority || 0}`,
        160
      );

      persisted.push(await upsertExternalSignal({
        profileId,
        sourceType: 'board_signal',
        externalId: `board:${boardPayload?.date || getEasternDateString()}:${sha1(toJsonString(signal?.meta || {})).slice(0, 12)}`,
        gamePk: Number(signal?.meta?.gamePk || signal?.meta?.game_pk || 0) || null,
        language,
        title,
        summary,
        editorialKind: 'education',
        editorialScore: scoreBoardSignal(signal, index),
        riskLevel: 'low',
        payload: {
          ...signal,
          selectedText: textValue,
          boardDate: boardPayload?.date || null,
        },
        metadata: {
          sourcePath: '/board',
        },
        dedupeKey: buildDedupeKey([
          'hexa',
          'board',
          boardPayload?.date || getEasternDateString(),
          sha1(toJsonString(signal?.meta || {})).slice(0, 12),
          language,
        ]),
      }));
    }
  }

  return persisted;
}

async function persistInsightSignals(profileId, insightsPayload) {
  const insights = Array.isArray(insightsPayload) ? insightsPayload : [];
  const persisted = [];

  for (const insight of insights) {
    persisted.push(await upsertExternalSignal({
      profileId,
      sourceType: 'insight',
      externalId: `insight:${insight.id}`,
      gamePk: null,
      language: null,
      title: normalizeText(insight.title || `Insight ${insight.id}`, 140),
      summary: normalizeText(insight.explanation, 220),
      editorialKind: 'insight',
      editorialScore: 72,
      riskLevel: 'medium',
      payload: insight,
      metadata: {
        sourcePath: '/insights',
      },
      dedupeKey: buildDedupeKey(['hexa', 'insight', insight.id]),
    }));
  }

  return persisted;
}

async function persistPerformanceSnapshot(profileId, performancePayload, date) {
  return upsertExternalSignal({
    profileId,
    sourceType: 'insight',
    externalId: `performance:${date}`,
    language: null,
    title: `HEXA performance snapshot ${date}`,
    summary: normalizeText(
      `ROI ${performancePayload?.roi ?? 0}% | Win rate ${performancePayload?.winRate ?? 0}% | ${performancePayload?.totalPicks ?? 0} picks`,
      180
    ),
    editorialKind: 'performance_snapshot',
    editorialScore: 68,
    riskLevel: 'high',
    payload: performancePayload,
    metadata: {
      sourcePath: '/performance/summary',
      period: '30',
    },
    dedupeKey: buildDedupeKey(['hexa', 'performance', date]),
  });
}

async function persistPickSignal(profileId, pick, gamesByPk) {
  const isResolved = pickIsResolved(pick.result);
  const sourceType = isResolved ? 'result' : 'pick';
  const editorialKind = isResolved ? 'result_recap' : 'pick_alert';
  const riskLevel = getRiskForEditorialKind(editorialKind);
  const editorialScore = isResolved ? scoreResultRecap(pick) : scorePickAlert(pick);
  const gameContext = gamesByPk.get(String(pick.game_pk || '')) || null;

  return upsertExternalSignal({
    profileId,
    sourceType,
    externalId: `pick:${pick.id}`,
    gamePk: Number(pick.game_pk || 0) || null,
    language: pick.language || null,
    title: normalizeText(`${pick.matchup || 'MLB'} - ${pick.pick || 'Pick'}`, 140),
    summary: normalizeText(
      `${pick.bet_value || 'NO VALUE'} | Oracle ${pick.oracle_confidence || 0}%${isResolved ? ` | ${pick.result}` : ''}`,
      180
    ),
    editorialKind,
    editorialScore,
    riskLevel,
    payload: {
      ...pick,
      gameContext,
    },
    metadata: {
      sourcePath: isResolved ? '/picks/today#result' : '/picks/today#pick',
    },
    dedupeKey: buildDedupeKey(['hexa', sourceType, pick.id, pick.language || 'na']),
  });
}

async function persistPickPostmortemSignal(profileId, pickId, postmortemPayload, pick) {
  return upsertExternalSignal({
    profileId,
    sourceType: 'postmortem',
    externalId: `postmortem:${pickId}`,
    gamePk: Number(pick?.game_pk || 0) || null,
    language: postmortemPayload.language || pick?.language || null,
    title: normalizeText(`Postmortem - ${pick?.matchup || pick?.pick || `Pick ${pickId}`}`, 140),
    summary: normalizeText(postmortemPayload.summary || `Postmortem available for pick ${pickId}`, 220),
    editorialKind: 'postmortem',
    editorialScore: 74,
    riskLevel: 'medium',
    payload: {
      ...postmortemPayload,
      pick,
    },
    metadata: {
      sourcePath: `/postmortems/${pickId}`,
    },
    dedupeKey: buildDedupeKey(['hexa', 'postmortem', pickId, postmortemPayload.language || pick?.language || 'na']),
  });
}

async function maybePersistHighlightSignal(profileId, pick) {
  if (!pickIsResolved(pick.result) || String(pick.result).toLowerCase() !== 'win' || !pick.game_pk || !isTrackableStoryPick(pick.pick)) {
    return null;
  }

  const descriptor = parseTrackableDescriptor(pick.pick);
  if (!descriptor) {
    return null;
  }

  const [playByPlayResult, highlightsResult] = await Promise.all([
    getHexaPlayByPlay(pick.game_pk),
    getHexaHighlightsLink(pick.game_pk),
  ]);

  if (!highlightsResult?.data?.available) {
    return null;
  }

  const matchedPlay = findRelevantPlay(playByPlayResult?.data, descriptor);
  if (!matchedPlay) {
    return null;
  }

  return upsertExternalSignal({
    profileId,
    sourceType: 'highlight_ref',
    externalId: `highlight:${pick.id}`,
    gamePk: Number(pick.game_pk || 0) || null,
    language: pick.language || null,
    title: normalizeText(`HEXA called it: ${pick.pick}`, 140),
    summary: normalizeText(
      `${descriptor.playerName} - ${matchedPlay.eventLabel?.en || matchedPlay.event || 'play'} | official highlight available`,
      220
    ),
    editorialKind: 'hexa_called_it',
    editorialScore: 82,
    riskLevel: 'medium',
    payload: {
      pick,
      descriptor,
      matchedPlay,
      highlights: highlightsResult.data,
    },
    metadata: {
      sourcePath: highlightsResult.candidate?.path || highlightsResult.path,
      playByPlayPath: playByPlayResult.candidate?.path || playByPlayResult.path,
    },
    dedupeKey: buildDedupeKey(['hexa', 'highlight', pick.id, pick.language || 'na']),
  });
}

function shouldCreatePickAlert(pick) {
  return !pickIsResolved(pick.result)
    && Number(pick.oracle_confidence || 0) >= 58
    && ['HIGH VALUE', 'MODERATE VALUE'].includes(String(pick.bet_value || '').toUpperCase());
}

function getCadenceMinutesForEasternTime(date = new Date()) {
  const parts = getEasternParts(date);
  const hour = Number(parts.hour || 0);
  const minute = Number(parts.minute || 0);
  const minutesSinceMidnight = (hour * 60) + minute;

  if (minutesSinceMidnight >= 540 && minutesSinceMidnight < 1080) {
    return 15;
  }
  if (minutesSinceMidnight >= 1080) {
    return 5;
  }
  if (minutesSinceMidnight <= 240) {
    return 15;
  }
  return null;
}

async function syncHexaSignals({
  date = getEasternDateString(),
  profileId = null,
  trigger = 'manual',
} = {}) {
  if (!isHexaConfigured()) {
    throw new Error('HEXA integration no configurada');
  }

  if (schedulerState.running) {
    throw new Error('Ya hay una sincronizacion HEXA en progreso');
  }

  schedulerState.running = true;
  const startedAt = new Date();

  try {
    const profile = await ensureHexaProfile(profileId);
    const summary = {
      trigger,
      startedAt: startedAt.toISOString(),
      profileId: profile.id,
      date,
      byType: {
        board_signal: 0,
        pick: 0,
        result: 0,
        postmortem: 0,
        insight: 0,
        highlight_ref: 0,
      },
      contentItems: 0,
    };

    const [gamesResult, boardResult] = await Promise.all([
      getHexaGames(date),
      getHexaBoard(date),
    ]);

    const games = Array.isArray(gamesResult?.data) ? gamesResult.data : [];
    const boardPayload = boardResult?.data || {};
    const gamesByPk = new Map(games.map((game) => [String(game.gamePk), game]));

    const boardSignals = await persistBoardSignals(profile.id, boardPayload);
    summary.byType.board_signal += boardSignals.length;
    summary.contentItems += boardSignals.length;

    const picksResult = await getHexaTodayPicks();
    const picks = Array.isArray(picksResult?.data) ? picksResult.data : [];

    for (const pick of picks) {
      if (shouldCreatePickAlert(pick) || pickIsResolved(pick.result)) {
        const persistedPick = await persistPickSignal(profile.id, pick, gamesByPk);
        summary.byType[persistedPick.signal.sourceType] += 1;
        summary.contentItems += 1;
      }

      if (pick.postmortem_available) {
        try {
          const postmortemResult = await getHexaPostmortem(pick.id);
          const persistedPostmortem = await persistPickPostmortemSignal(profile.id, pick.id, postmortemResult.data, pick);
          summary.byType[persistedPostmortem.signal.sourceType] += 1;
          summary.contentItems += 1;
        } catch (error) {
          console.warn(`[HEXA Sync] No se pudo sincronizar postmortem ${pick.id}: ${error.message}`);
        }
      }

      if (pickIsResolved(pick.result) && String(pick.result).toLowerCase() === 'win') {
        try {
          const highlightSignal = await maybePersistHighlightSignal(profile.id, pick);
          if (highlightSignal) {
            summary.byType.highlight_ref += 1;
            summary.contentItems += 1;
          }
        } catch (error) {
          console.warn(`[HEXA Sync] No se pudo sincronizar highlight para pick ${pick.id}: ${error.message}`);
        }
      }
    }

    try {
      const insightsResult = await getHexaInsights();
      const insightSignals = await persistInsightSignals(profile.id, Array.isArray(insightsResult?.data) ? insightsResult.data : []);
      summary.byType.insight += insightSignals.length;
      summary.contentItems += insightSignals.length;
    } catch (error) {
      console.warn(`[HEXA Sync] No se pudieron sincronizar insights: ${error.message}`);
    }

    try {
      const performanceResult = await getHexaPerformanceSummary('30');
      const performanceSignal = await persistPerformanceSnapshot(profile.id, performanceResult.data || {}, date);
      if (performanceSignal) {
        summary.byType.insight += 1;
        summary.contentItems += 1;
      }
    } catch (error) {
      console.warn(`[HEXA Sync] No se pudo sincronizar performance summary: ${error.message}`);
    }

    summary.completedAt = new Date().toISOString();
    summary.durationMs = Date.now() - startedAt.getTime();
    schedulerState.lastCompletedAt = summary.completedAt;
    schedulerState.lastSummary = summary;
    schedulerState.lastError = null;
    if (trigger === 'manual') {
      schedulerState.lastManualSyncAt = summary.completedAt;
    } else {
      schedulerState.lastAutoSyncAt = summary.completedAt;
    }

    return summary;
  } catch (error) {
    schedulerState.lastError = {
      message: error.message,
      at: new Date().toISOString(),
    };
    throw error;
  } finally {
    schedulerState.running = false;
  }
}

async function runSchedulerTick() {
  schedulerState.lastCadenceMinutes = getCadenceMinutesForEasternTime();

  if (!isHexaConfigured() || !schedulerState.lastCadenceMinutes || schedulerState.running) {
    return;
  }

  const lastAutoTime = schedulerState.lastAutoSyncAt
    ? new Date(schedulerState.lastAutoSyncAt).getTime()
    : 0;

  if (Date.now() - lastAutoTime < (schedulerState.lastCadenceMinutes * 60 * 1000)) {
    return;
  }

  try {
    await syncHexaSignals({ trigger: 'auto' });
  } catch (error) {
    console.warn(`[HEXA Scheduler] ${error.message}`);
  }
}

function startHexaScheduler() {
  if (schedulerTimer) {
    return;
  }

  schedulerState.started = true;
  schedulerTimer = setInterval(runSchedulerTick, 60 * 1000);
  schedulerTimer.unref?.();
  runSchedulerTick().catch(() => {});
}

async function stopHexaScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  schedulerState.started = false;
}

async function getHexaSourceHealth() {
  return {
    ...(await checkHexaHealth()),
    scheduler: {
      started: schedulerState.started,
      running: schedulerState.running,
      lastAutoSyncAt: schedulerState.lastAutoSyncAt,
      lastManualSyncAt: schedulerState.lastManualSyncAt,
      lastCompletedAt: schedulerState.lastCompletedAt,
      lastCadenceMinutes: schedulerState.lastCadenceMinutes,
      lastError: schedulerState.lastError,
      lastSummary: schedulerState.lastSummary,
    },
  };
}

module.exports = {
  getCadenceMinutesForEasternTime,
  getHexaSourceHealth,
  startHexaScheduler,
  stopHexaScheduler,
  syncHexaSignals,
};
