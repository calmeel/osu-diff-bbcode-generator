const allowedOrigins = new Set([
  "https://calmeel.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

let tokenCache = null;

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin");

  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin)
      ? origin
      : "https://calmeel.github.io",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}

function errorResponse(message, status, headers) {
  return jsonResponse({ error: message }, { status, headers });
}

async function getAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);

  if (tokenCache && tokenCache.expiresAt > now + 60) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    client_id: env.OSU_CLIENT_ID,
    client_secret: env.OSU_CLIENT_SECRET,
    grant_type: "client_credentials",
    scope: "public",
  });

  const response = await fetch("https://osu.ppy.sh/oauth/token", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Token request failed with status ${response.status}`);
  }

  const token = await response.json();
  tokenCache = {
    accessToken: token.access_token,
    expiresAt: now + Number(token.expires_in || 0),
  };

  return tokenCache.accessToken;
}

async function fetchBeatmapset(beatmapsetId, env) {
  const accessToken = await getAccessToken(env);
  const response = await fetch(
    `https://osu.ppy.sh/api/v2/beatmapsets/${beatmapsetId}`,
    {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
    },
  );

  return response;
}

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = getCorsHeaders(request);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method !== "GET") {
      return errorResponse("Method not allowed", 405, corsHeaders);
    }

    if (!env.OSU_CLIENT_ID || !env.OSU_CLIENT_SECRET) {
      return errorResponse("osu! API credentials are not configured", 500, corsHeaders);
    }

    const url = new URL(request.url);
    const beatmapsetId = url.searchParams.get("id");

    if (!beatmapsetId || !/^\d+$/.test(beatmapsetId)) {
      return errorResponse("Invalid beatmapset id", 400, corsHeaders);
    }

    const cache = caches.default;
    const cacheKey = new Request(`${url.origin}/beatmapsets/${beatmapsetId}`);
    const cached = await cache.match(cacheKey);

    if (cached) {
      return new Response(cached.body, {
        status: cached.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    try {
      const osuResponse = await fetchBeatmapset(beatmapsetId, env);
      const body = await osuResponse.text();
      const response = new Response(body, {
        status: osuResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });

      if (osuResponse.ok) {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }

      return response;
    }
    catch (err) {
      return errorResponse("Failed to fetch beatmapset data", 502, corsHeaders);
    }
  },
};
