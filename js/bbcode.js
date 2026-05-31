import { CONFIG, TEXT_COLOR_MODES } from "./config.js";
import { getDiffSections } from "./sections.js";
import { getReadableSrColor, rgbToHex } from "./colors.js";

export function generateBBCode(diffs, options) {
  const sections = [];

  for (const sectionData of getDiffSections(diffs)) {
    const lines = [];

    if (sectionData.heading) {
      lines.push(`[b]${sectionData.heading}[/b]`);
    }

    for (const diff of sectionData.diffs) {
      lines.push(formatDiffLine(diff, options));
    }

    sections.push(lines.join("\n"));
  }

  return sections.join("\n\n");
}

function formatDiffLine(diff, options) {
  return (
    formatDiffIcon(diff) +
    `[b][color=${formatDiffTextColor(diff, options)}] ${formatDifficultyName(diff, options)}[/color][/b]` +
    ` by ${formatMapperText(diff, options)}`
  );
}

export function formatDifficultyName(diff, options) {
  let difficultyName = diff.difficultyName;

  if (options.stripManiaKeyPrefix && diff.mode === "mania") {
    difficultyName = stripManiaKeyPrefixFromDifficultyName(difficultyName);
  }

  if (options.stripGuestOwnerPrefix && diff.isGuestDiff) {
    difficultyName = stripOwnerPrefixFromDifficultyName(difficultyName);
  }

  if (options.stripManiaKeyPrefix && diff.mode === "mania") {
    difficultyName = stripManiaKeyPrefixFromDifficultyName(difficultyName);
  }

  return difficultyName;
}

function stripOwnerPrefixFromDifficultyName(difficultyName) {
  return difficultyName
    .replace(
      /^(\s*(?:\[\s*(?:1[0-2]|[1-9])K\s*\]\s*|(?:1[0-2]|[1-9])K\s+)).+?[\x27\u2019]s\s+/i,
      "$1",
    )
    .replace(/^.+?[\x27\u2019]s\s+/i, "");
}

function stripManiaKeyPrefixFromDifficultyName(difficultyName) {
  return difficultyName
    .replace(/^(\s*\[\s*(?:1[0-2]|[1-9])K\s*\]\s*|\s*(?:1[0-2]|[1-9])K\s+)/i, "")
    .replace(
      /^(.+?[\x27\u2019]s\s+)(\[\s*(?:1[0-2]|[1-9])K\s*\]\s*|(?:1[0-2]|[1-9])K\s+)/i,
      "$1",
    );
}

function formatDiffIcon(diff) {
  return `[img]${generateIconUrl(diff.mode, diff.starRating, CONFIG.bbcodeIconBaseUrl)}[/img]`;
}

function formatDiffColor(diff) {
  return rgbToHex(diff.bgColor);
}

export function formatDiffTextColor(diff, options) {
  if (options.textColorMode === TEXT_COLOR_MODES.WHITE) {
    return "#ffffff";
  }

  if (options.textColorMode === TEXT_COLOR_MODES.OSU_TEXT) {
    return formatForumOsuTextColor(diff);
  }

  const srColor = formatDiffColor(diff);

  if (options.textColorMode === TEXT_COLOR_MODES.READABLE_SR) {
    return getReadableSrColor(srColor);
  }

  return srColor;
}

function formatForumOsuTextColor(diff) {
  if (diff.starRating < 6.5) {
    return "#ffffff";
  }

  return rgbToHex(diff.textColor);
}

function formatMapperText(diff, options) {
  if (!diff.isGuestDiff && diff.mappers.length === 1 && options.showHostAsMe) {
    return "me";
  }

  return diff.mappers
    .map(formatMapperProfileText)
    .join(" & ");
}

function formatMapperProfileText(mapper) {
  if (mapper.id && mapper.username) {
    return `[profile=${mapper.id}]${mapper.username}[/profile]`;
  }

  if (mapper.url && mapper.username) {
    return `[url=${mapper.url}]${mapper.username}[/url]`;
  }

  return mapper.username || "Unknown";
}

export function formatMapperPreviewText(diff, options) {
  if (!diff.isGuestDiff && diff.mappers.length === 1 && options.showHostAsMe) {
    return "me";
  }

  return diff.mapperName;
}

export function generateIconUrl(mode, sr, iconBaseUrl) {
  const iconMode = getIconMode(mode);
  const rounded = Math.min(sr, 9).toFixed(2);

  return `${iconBaseUrl}/${iconMode}/${rounded}.png`;
}

function getIconMode(mode) {
  const iconModeByBeatmapMode = {
    osu: "std",
    fruits: "catch",
  };

  return iconModeByBeatmapMode[mode] || mode;
}

