export function parseBeatmapsetId(url) {
  const match = url.match(/beatmapsets\/(\d+)/);
  return match ? match[1] : null;
}

export async function fetchBeatmapset(beatmapsetId, { proxyUrl, messages }) {
  const response = await fetch(
    `${proxyUrl}/?id=${encodeURIComponent(beatmapsetId)}`
  );

  if (!response.ok) {
    throw new Error(await getFetchErrorMessage(response, messages));
  }

  const contentType = response.headers.get("Content-Type") || "";

  if (contentType.includes("application/json")) {
    return normalizeBeatmapsetResponse(await response.json(), messages);
  }

  return extractBeatmapsetJson(await response.text(), messages);
}

async function getFetchErrorMessage(response, messages) {
  const responseText = await response.clone().text().catch(() => "");

  if (response.status === 429 || responseText.includes("429 Too Many Requests")) {
    return messages.proxyRateLimited;
  }

  if (response.status >= 500) {
    return messages.proxyTemporaryUnavailable;
  }

  return messages.proxyFetchFailed;
}

function normalizeBeatmapsetResponse(data, messages) {
  const beatmapset = data?.beatmapset || data;

  if (!beatmapset?.beatmaps?.length) {
    throw new Error(messages.missingBeatmapsetData);
  }

  return beatmapset;
}

function extractBeatmapsetJson(html, messages) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const script = doc.querySelector("#json-beatmapset");

  if (!script) {
    throw new Error(messages.missingBeatmapsetData);
  }

  return JSON.parse(script.textContent);
}
