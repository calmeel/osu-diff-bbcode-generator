export function parseBeatmapsetId(url) {
  const match = url.match(/beatmapsets\/(\d+)/);
  return match ? match[1] : null;
}

export async function fetchBeatmapset(beatmapsetId, { proxyUrl, messages }) {
  const response = await fetch(
    `${proxyUrl}/?id=${encodeURIComponent(beatmapsetId)}`
  );

  if (!response.ok) {
    throw new Error(messages.proxyFetchFailed);
  }

  const contentType = response.headers.get("Content-Type") || "";

  if (contentType.includes("application/json")) {
    return normalizeBeatmapsetResponse(await response.json(), messages);
  }

  return extractBeatmapsetJson(await response.text(), messages);
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
