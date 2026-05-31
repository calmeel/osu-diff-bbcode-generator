import { getDiffColour, getDiffTextColour } from "./colors.js";

export function normalizeBeatmaps(beatmapset) {
  const beatmapsetUserId = beatmapset.user_id;
  const usersById = buildUsersById(beatmapset);
  const hostUser = beatmapset.user || usersById[beatmapsetUserId];

  const diffs = beatmapset.beatmaps.map(beatmap => {
    const isGuestDiff = beatmap.user_id !== beatmapsetUserId;
    const mappers = getBeatmapMappers({
      beatmap,
      beatmapset,
      usersById,
      hostUser,
      isGuestDiff,
    });
    const starRating = beatmap.difficulty_rating;

    return {
      mode: beatmap.mode,
      difficultyName: beatmap.version,
      starRating,
      keyCount: extractManiaKeyCount(beatmap.version),
      mapperName: formatMapperNames(mappers),
      mappers,
      beatmapId: beatmap.id,
      isGuestDiff,
      bgColor: getDiffColour(starRating),
      textColor: getDiffTextColour(starRating),
    };
  });

  return diffs.sort(compareDiffsByStarRating);
}

function getBeatmapMappers({ beatmap, beatmapset, usersById, hostUser, isGuestDiff }) {
  const owners = Array.isArray(beatmap.owners) ? beatmap.owners : [];

  if (owners.length) {
    const ownerMappers = owners
      .map(owner => normalizeMapper(owner, usersById))
      .filter(Boolean);

    if (ownerMappers.length) {
      return ownerMappers;
    }
  }

  const mapper = usersById[beatmap.user_id] || beatmap.user || null;
  const fallbackGuestName = isGuestDiff
    ? extractGuestNameFromVersion(beatmap.version)
    : null;
  const mapperId = beatmap.user_id || beatmapset.user_id;
  const mapperName =
    mapper?.username ||
    fallbackGuestName ||
    hostUser?.username ||
    beatmapset.creator ||
    "Unknown";

  return [{
    id: mapperId,
    username: mapperName,
    url: `https://osu.ppy.sh/users/${mapperId}`,
  }];
}

function normalizeMapper(mapper, usersById) {
  const id = mapper.id || mapper.user_id;
  const user = usersById[id] || mapper;
  const username = user.username || mapper.username;

  if (!id || !username) {
    return null;
  }

  return {
    id,
    username,
    url: `https://osu.ppy.sh/users/${id}`,
  };
}

function formatMapperNames(mappers) {
  return mappers.map(mapper => mapper.username).join(" & ");
}

function compareDiffsByStarRating(a, b) {
  if (a.mode === "mania" && b.mode === "mania") {
    return compareManiaDiffs(a, b);
  }

  return a.starRating - b.starRating;
}

function compareManiaDiffs(a, b) {
  return compareNullableNumbers(a.keyCount, b.keyCount) ||
    a.starRating - b.starRating ||
    a.difficultyName.localeCompare(b.difficultyName);
}

function compareNullableNumbers(a, b) {
  if (a === null && b === null) {
    return 0;
  }

  if (a === null) {
    return 1;
  }

  if (b === null) {
    return -1;
  }

  return a - b;
}

export function extractManiaKeyCount(version) {
  const match = version.match(/(?:^|[\s\[])(1[0-2]|[1-9])K(?:\]|(?=\s|$))/i);
  return match ? Number(match[1]) : null;
}

function buildUsersById(beatmapset) {
  const usersById = {};

  for (const user of beatmapset.users || []) {
    usersById[user.id] = user;
  }

  for (const user of beatmapset.related_users || []) {
    usersById[user.id] = user;
  }

  return usersById;
}

function extractGuestNameFromVersion(version) {
  const match = version.match(/^(.+?)'s\s+/);
  return match ? match[1].trim() : null;
}
