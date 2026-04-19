function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function getEasternParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function getEasternDateString(date = new Date()) {
  const parts = getEasternParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function buildUrl(baseUrl, path, query = {}) {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function getHexaConfig() {
  return {
    baseUrl: normalizeBaseUrl(process.env.HEXA_BASE_URL),
    apiKey: String(process.env.HEXA_CONTENT_API_KEY || '').trim(),
  };
}

function isHexaConfigured() {
  const config = getHexaConfig();
  return Boolean(config.baseUrl && config.apiKey);
}

async function fetchJson(baseUrl, path, { query, apiKey = true, timeoutMs = 15000 } = {}) {
  const config = getHexaConfig();
  const url = buildUrl(baseUrl || config.baseUrl, path, query);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(apiKey && config.apiKey ? { 'X-API-Key': config.apiKey } : {}),
      },
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

    if (!response.ok) {
      const error = new Error(
        body?.error
          || body?.message
          || `HEXA request failed (${response.status})`
      );
      error.statusCode = response.status;
      error.path = path;
      throw error;
    }

    if (body && typeof body === 'object' && body.success === false) {
      const error = new Error(body.error || body.message || 'HEXA returned success=false');
      error.statusCode = 502;
      error.path = path;
      throw error;
    }

    return {
      ok: true,
      url,
      path,
      data: body?.data !== undefined ? body.data : body,
      raw: body,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithFallback(candidates) {
  let lastError = null;

  for (const candidate of candidates) {
    try {
      const result = await fetchJson(candidate.baseUrl, candidate.path, {
        query: candidate.query,
        apiKey: candidate.apiKey,
        timeoutMs: candidate.timeoutMs,
      });

      return {
        ...result,
        candidate: {
          path: candidate.path,
          apiKey: candidate.apiKey !== false,
        },
      };
    } catch (error) {
      lastError = error;
      if (error.statusCode && error.statusCode !== 404) {
        continue;
      }
    }
  }

  throw lastError || new Error('No HEXA candidate endpoint responded');
}

async function getHexaGames(date = getEasternDateString()) {
  return fetchWithFallback([
    { path: '/api/content/v1/games', query: { date }, apiKey: true },
    { path: '/api/games', query: { date }, apiKey: false },
  ]);
}

async function getHexaBoard(date = getEasternDateString()) {
  return fetchWithFallback([
    { path: '/api/content/v1/board', query: { date }, apiKey: true },
    { path: '/api/hexa/board', query: { date }, apiKey: false },
  ]);
}

async function getHexaPlayByPlay(gamePk) {
  return fetchWithFallback([
    { path: `/api/content/v1/games/${encodeURIComponent(gamePk)}/play-by-play`, apiKey: true },
    { path: `/api/games/${encodeURIComponent(gamePk)}/play-by-play`, apiKey: false },
  ]);
}

async function getHexaHighlightsLink(gamePk) {
  return fetchWithFallback([
    { path: `/api/content/v1/games/${encodeURIComponent(gamePk)}/highlights-link`, apiKey: true },
    { path: `/api/games/${encodeURIComponent(gamePk)}/highlights-link`, apiKey: false },
  ]);
}

async function getHexaTodayPicks({ lang, model } = {}) {
  return fetchJson(null, '/api/content/v1/picks/today', {
    query: { lang, model },
    apiKey: true,
  });
}

async function getHexaPicksRange({ from, to, limit, offset } = {}) {
  return fetchJson(null, '/api/content/v1/picks', {
    query: { from, to, limit, offset },
    apiKey: true,
  });
}

async function getHexaPick(pickId) {
  return fetchJson(null, `/api/content/v1/picks/${encodeURIComponent(pickId)}`, {
    apiKey: true,
  });
}

async function getHexaPostmortem(pickId) {
  return fetchJson(null, `/api/content/v1/postmortems/${encodeURIComponent(pickId)}`, {
    apiKey: true,
  });
}

async function getHexaInsights({ week } = {}) {
  return fetchJson(null, '/api/content/v1/insights', {
    query: { week },
    apiKey: true,
  });
}

async function getHexaPerformanceSummary(period = '30') {
  return fetchJson(null, '/api/content/v1/performance/summary', {
    query: { period },
    apiKey: true,
  });
}

async function checkHexaHealth() {
  const config = getHexaConfig();
  if (!config.baseUrl || !config.apiKey) {
    return {
      configured: false,
      baseUrl: config.baseUrl || null,
      endpoints: {},
      message: 'HEXA_BASE_URL o HEXA_CONTENT_API_KEY no configurados',
    };
  }

  const date = getEasternDateString();
  const checks = [
    ['picks', () => getHexaTodayPicks()],
    ['performance', () => getHexaPerformanceSummary('7')],
    ['board', () => getHexaBoard(date)],
    ['games', () => getHexaGames(date)],
  ];

  const endpoints = {};
  for (const [name, fn] of checks) {
    try {
      const result = await fn();
      endpoints[name] = {
        ok: true,
        path: result.candidate?.path || result.path,
        url: result.url,
      };
    } catch (error) {
      endpoints[name] = {
        ok: false,
        path: error.path || null,
        error: error.message,
        statusCode: error.statusCode || null,
      };
    }
  }

  return {
    configured: true,
    baseUrl: config.baseUrl,
    endpoints,
    checkedAt: new Date().toISOString(),
  };
}

module.exports = {
  checkHexaHealth,
  getEasternDateString,
  getEasternParts,
  getHexaBoard,
  getHexaConfig,
  getHexaGames,
  getHexaHighlightsLink,
  getHexaInsights,
  getHexaPerformanceSummary,
  getHexaPick,
  getHexaPicksRange,
  getHexaPlayByPlay,
  getHexaPostmortem,
  getHexaTodayPicks,
  isHexaConfigured,
};
