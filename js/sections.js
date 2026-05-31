import { MODE_LABELS, MODE_ORDER } from "./config.js";

function forEachModeGroup(diffs, callback) {
  const groups = groupDiffsByMode(diffs);

  for (const mode of MODE_ORDER) {
    const modeDiffs = groups[mode];

    if (modeDiffs?.length) {
      callback(mode, modeDiffs);
    }
  }
}

function groupDiffsByMode(diffs) {
  const groups = {};

  for (const diff of diffs) {
    groups[diff.mode] ||= [];
    groups[diff.mode].push(diff);
  }

  return groups;
}

function hasMultipleModes(diffs) {
  return new Set(diffs.map(diff => diff.mode)).size > 1;
}

export function getDiffSections(diffs) {
  const sections = [];
  const showModeHeaders = hasMultipleModes(diffs);

  forEachModeGroup(diffs, (mode, modeDiffs) => {
    if (mode === "mania") {
      sections.push(...getManiaKeySections(modeDiffs));
      return;
    }

    sections.push({
      heading: showModeHeaders ? MODE_LABELS[mode] || mode : null,
      diffs: modeDiffs,
    });
  });

  return sections;
}

function getManiaKeySections(diffs) {
  const sections = [];
  const groups = {};

  for (const diff of diffs) {
    const key = diff.keyCount ?? "unknown";
    groups[key] ||= [];
    groups[key].push(diff);
  }

  for (const key of Object.keys(groups).sort(compareManiaKeyGroupNames)) {
    sections.push({
      heading: key === "unknown" ? "Unknown Key" : `${key} Key`,
      diffs: groups[key],
    });
  }

  return sections;
}

function compareManiaKeyGroupNames(a, b) {
  if (a === "unknown" && b === "unknown") {
    return 0;
  }

  if (a === "unknown") {
    return 1;
  }

  if (b === "unknown") {
    return -1;
  }

  return Number(a) - Number(b);
}
