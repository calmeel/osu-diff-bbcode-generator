const CONFIG = {
  proxyUrl: "https://osu-diff-bbcode-proxy.vanity-rhythm.workers.dev",
  previewIconBaseUrl: "assets/i",
  bbcodeIconBaseUrl: "https://calmeel.github.io/osu-diff-bbcode-generator/assets/i",
};

const MODE_ORDER = ["osu", "taiko", "fruits", "mania"];

const MODE_LABELS = {
  osu: "std",
  taiko: "taiko",
  fruits: "catch",
  mania: "mania",
};

const TEXT_COLOR_MODES = {
  WHITE: "white",
  SR: "sr",
  READABLE_SR: "readable-sr",
  OSU_TEXT: "osu-text",
};

const I18N = {
  en: {
    appTitle: "osu! Diff BBCode Generator",
    languageLabel: "Language",
    programCreditLabel: "Program",
    planningCreditLabel: "Planning",
    lastUpdatedLabel: "Last updated",
    colorTableLink: "Color table",
    generateButton: "Generate BBCode",
    optionsLabel: "Options",
    textColorModeLabel: "Difficulty text color",
    textColorWhite: "White",
    textColorSr: "SR color",
    textColorReadableSr: "Readable SR color",
    textColorSrBadge: "SR badge color",
    showHostAsMeLabel: "Show host diffs as by me",
    stripGuestOwnerPrefixLabel: "Hide guest name prefix in diff names",
    stripManiaKeyPrefixLabel: "Hide osu!mania key prefix in diff names",
    previewHeading: "Preview",
    bbcodeHeading: "BBCode",
    copyButton: "Copy",
    statusHeading: "Status",
    ready: "Ready.",
    loading: "Loading beatmapset...",
    invalidUrl: "Paste a valid osu! beatmapset URL.",
    fetching: id => `Fetching beatmapset ${id}...`,
    generated: "BBCode generated.",
    copySuccess: "Copied BBCode to clipboard.",
    copyFailed: "Failed to copy BBCode.",
    genericError: "Something went wrong.",
    proxyFetchFailed: "Failed to fetch beatmapset page via proxy.",
    missingBeatmapsetData: "Failed to find beatmapset data in the page HTML.",
  },
  ja: {
    appTitle: "osu! 難易度 BBCode ジェネレーター",
    languageLabel: "言語",
    programCreditLabel: "プログラム",
    planningCreditLabel: "立案",
    lastUpdatedLabel: "最終更新",
    colorTableLink: "カラー表",
    generateButton: "BBCode を生成",
    optionsLabel: "オプション",
    textColorModeLabel: "難易度名の文字色",
    textColorWhite: "白",
    textColorSr: "SR 色",
    textColorReadableSr: "読みやすい SR 色",
    textColorSrBadge: "SR バッジ色",
    showHostAsMeLabel: "ホスト難易度を by me と表示",
    stripGuestOwnerPrefixLabel: "GD の Diff 名から所有格を隠す",
    stripManiaKeyPrefixLabel: "osu!mania の key 表記を隠す",
    previewHeading: "プレビュー",
    bbcodeHeading: "BBCode",
    copyButton: "コピー",
    statusHeading: "ステータス",
    ready: "待機中です。",
    loading: "beatmapset を読み込んでいます...",
    invalidUrl: "有効な osu! beatmapset URL を入力してください。",
    fetching: id => `beatmapset ${id} を取得しています...`,
    generated: "BBCode を生成しました。",
    copySuccess: "BBCode をクリップボードにコピーしました。",
    copyFailed: "BBCode のコピーに失敗しました。",
    genericError: "エラーが発生しました。",
    proxyFetchFailed: "プロキシ経由で beatmapset ページを取得できませんでした。",
    missingBeatmapsetData: "ページ HTML 内に beatmapset データが見つかりませんでした。",
  },
};

const elements = {
  beatmapUrl: document.getElementById("beatmap-url"),
  generateBtn: document.getElementById("generate-btn"),
  copyBtn: document.getElementById("copy-btn"),
  preview: document.getElementById("preview"),
  bbcodeOutput: document.getElementById("bbcode-output"),
  statusText: document.getElementById("status"),
  language: document.getElementById("language"),
  languageButtons: document.querySelectorAll(".language-btn"),
  textColorMode: document.getElementById("text-color-mode"),
  showHostAsMe: document.getElementById("show-host-as-me"),
  stripGuestOwnerPrefix: document.getElementById("strip-guest-owner-prefix"),
  stripManiaKeyPrefix: document.getElementById("strip-mania-key-prefix"),
};

let latestDiffs = [];
let latestStatusKey = "ready";
let latestStatusArgs = [];

elements.generateBtn.addEventListener("click", handleGenerate);
elements.copyBtn.addEventListener("click", handleCopy);
for (const button of elements.languageButtons) {
  button.addEventListener("click", handleLanguageButtonClick);
}
elements.showHostAsMe.addEventListener("change", refreshGeneratedOutput);
elements.stripGuestOwnerPrefix.addEventListener("change", refreshGeneratedOutput);
elements.stripManiaKeyPrefix.addEventListener("change", refreshGeneratedOutput);
elements.textColorMode.addEventListener("change", refreshGeneratedOutput);

applyLanguage();
setStatus("ready");

async function handleGenerate() {
  try {
    resetOutput();
    setStatus("loading");

    const beatmapsetId = parseBeatmapsetId(elements.beatmapUrl.value.trim());

    if (!beatmapsetId) {
      throw new Error(t("invalidUrl"));
    }

    setStatus("fetching", beatmapsetId);

    const html = await fetchBeatmapsetHtml(beatmapsetId);
    const beatmapset = extractBeatmapsetJson(html);
    const diffs = normalizeBeatmaps(beatmapset);

    latestDiffs = diffs;
    renderPreview(diffs);

    elements.bbcodeOutput.value = generateBBCode(diffs, getBBCodeOptions());

    setStatus("generated");
  }
  catch (err) {
    console.error(err);
    setStatusText(err.message || t("genericError"));
  }
}

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(elements.bbcodeOutput.value);
    setStatus("copySuccess");
  }
  catch (err) {
    console.error(err);
    setStatus("copyFailed");
  }
}

function handleLanguageButtonClick(event) {
  elements.language.value = event.currentTarget.dataset.language || "en";
  handleLanguageChange();
}

function handleLanguageChange() {
  applyLanguage();
  refreshGeneratedOutput();
  setStatus(latestStatusKey, ...latestStatusArgs);
}

function refreshGeneratedOutput() {
  if (latestDiffs.length) {
    renderPreview(latestDiffs);
    elements.bbcodeOutput.value = generateBBCode(latestDiffs, getBBCodeOptions());
  }
}

function resetOutput() {
  elements.preview.innerHTML = "";
  elements.bbcodeOutput.value = "";
  latestDiffs = [];
}

function setStatus(key, ...args) {
  latestStatusKey = key;
  latestStatusArgs = args;
  setStatusText(t(key, ...args));
}

function setStatusText(text) {
  elements.statusText.textContent = text;
}

function applyLanguage() {
  document.documentElement.lang = getLanguage();
  updateLanguageButtons();

  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
}

function updateLanguageButtons() {
  const language = getLanguage();

  for (const button of elements.languageButtons) {
    button.classList.toggle("is-active", button.dataset.language === language);
  }
}

function getLanguage() {
  return elements.language?.value || "en";
}

function t(key, ...args) {
  const value = I18N[getLanguage()]?.[key] || I18N.en[key] || key;
  return typeof value === "function" ? value(...args) : value;
}

function getBBCodeOptions() {
  return {
    showHostAsMe: elements.showHostAsMe?.checked ?? true,
    stripGuestOwnerPrefix: elements.stripGuestOwnerPrefix?.checked || false,
    stripManiaKeyPrefix: elements.stripManiaKeyPrefix?.checked || false,
    textColorMode: elements.textColorMode?.value || TEXT_COLOR_MODES.READABLE_SR,
  };
}

function parseBeatmapsetId(url) {
  const match = url.match(/beatmapsets\/(\d+)/);
  return match ? match[1] : null;
}

async function fetchBeatmapsetHtml(beatmapsetId) {
  const response = await fetch(
    `${CONFIG.proxyUrl}/?id=${encodeURIComponent(beatmapsetId)}`
  );

  if (!response.ok) {
    throw new Error(t("proxyFetchFailed"));
  }

  return await response.text();
}

function extractBeatmapsetJson(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const script = doc.querySelector("#json-beatmapset");

  if (!script) {
    throw new Error(t("missingBeatmapsetData"));
  }

  return JSON.parse(script.textContent);
}

function normalizeBeatmaps(beatmapset) {
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

function extractManiaKeyCount(version) {
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

function renderPreview(diffs) {
  elements.preview.innerHTML = "";
  const options = getBBCodeOptions();

  for (const sectionData of getDiffSections(diffs)) {
    const section = document.createElement("div");
    section.className = "mode-section";

    if (sectionData.heading) {
      const title = document.createElement("div");
      title.className = "mode-title";
      title.textContent = sectionData.heading;
      section.appendChild(title);
    }

    const row = document.createElement("div");
    row.className = "diff-row";

    for (const diff of sectionData.diffs) {
      row.appendChild(createDiffPreviewLine(diff, options));
    }

    section.appendChild(row);
    elements.preview.appendChild(section);
  }
}

function createDiffPreviewLine(diff, options) {
  const line = document.createElement("div");
  line.className = "diff-preview-line";

  const icon = document.createElement("img");
  icon.className = "diff-icon";
  icon.src = generateIconUrl(diff.mode, diff.starRating, CONFIG.previewIconBaseUrl);
  icon.alt = "";

  const difficultyName = document.createElement("span");
  difficultyName.className = "preview-diff-name";
  difficultyName.style.color = formatDiffTextColor(diff, options);
  difficultyName.textContent = formatDifficultyName(diff, options);

  const mapperText = document.createElement("span");
  mapperText.className = "preview-mapper";
  mapperText.textContent = ` by ${formatMapperPreviewText(diff, options)}`;

  line.append(icon, difficultyName, mapperText);

  return line;
}

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

function generateBBCode(diffs, options) {
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

function hasMultipleModes(diffs) {
  return new Set(diffs.map(diff => diff.mode)).size > 1;
}

function getDiffSections(diffs) {
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

function formatDiffLine(diff, options) {
  return (
    formatDiffIcon(diff) +
    `[b][color=${formatDiffTextColor(diff, options)}] ${formatDifficultyName(diff, options)}[/color][/b]` +
    ` by ${formatMapperText(diff, options)}`
  );
}

function formatDifficultyName(diff, options) {
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

function formatDiffTextColor(diff, options) {
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

function getReadableSrColor(srColor) {
  if (srColor.toLowerCase() === "#000000") {
    return "#ffffff";
  }

  const luminance = getRelativeLuminance(srColor);
  const start = 0.24;
  const end = 0.06;

  if (luminance >= start) {
    return srColor;
  }

  const amount = clamp((start - luminance) / (start - end), 0, 1);
  return mixHexColors(srColor, "#d8d6ff", amount * 0.9);
}

function getRelativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [linearR, linearG, linearB] = [r, g, b].map(value => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return linearR * 0.2126 + linearG * 0.7152 + linearB * 0.0722;
}

function mixHexColors(fromHex, toHex, amount) {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  const rgb = {
    r: Math.round(from.r + (to.r - from.r) * amount),
    g: Math.round(from.g + (to.g - from.g) * amount),
    b: Math.round(from.b + (to.b - from.b) * amount),
  };

  return rgbObjectToHex(rgb);
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbObjectToHex({ r, g, b }) {
  return (
    "#" +
    [r, g, b]
      .map(value => value.toString(16).padStart(2, "0"))
      .join("")
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatMapperText(diff, options) {
  if (!diff.isGuestDiff && diff.mappers.length === 1 && options.showHostAsMe) {
    return "me";
  }

  return diff.mappers
    .map(mapper => `[url=${mapper.url}]${mapper.username}[/url]`)
    .join(" & ");
}

function formatMapperPreviewText(diff, options) {
  if (!diff.isGuestDiff && diff.mappers.length === 1 && options.showHostAsMe) {
    return "me";
  }

  return diff.mapperName;
}

function generateIconUrl(mode, sr, iconBaseUrl) {
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

function rgbToHex(rgb) {
  if (rgb.startsWith("#")) {
    return rgb;
  }

  const values = rgb.match(/\d+/g);

  if (!values || values.length < 3) {
    return rgb;
  }

  return (
    "#" +
    values
      .slice(0, 3)
      .map(value => Number(value).toString(16).padStart(2, "0"))
      .join("")
  );
}

/* =========================================================
   osu!web SR colors
========================================================= */

const difficultyColourSpectrum =
  d3.scaleLinear()
    .domain([
      0.1,
      1.25,
      2,
      2.5,
      3.3,
      4.2,
      4.9,
      5.8,
      6.7,
      7.7,
      9
    ])
    .range([
      "#4290FB",
      "#4FC0FF",
      "#4FFFD5",
      "#7CFF4F",
      "#F6F05C",
      "#FF8068",
      "#FF4E6F",
      "#C645B8",
      "#6563DE",
      "#18158E",
      "#000000"
    ])
    .interpolate(d3.interpolateRgb.gamma(2.2))
    .clamp(true);

function getDiffColour(rating) {
  if (rating < 0.1) {
    return "#AAAAAA";
  }

  if (rating >= 9) {
    return "#000000";
  }

  return difficultyColourSpectrum(rating);
}

const difficultyTextColourSpectrum =
  d3.scaleLinear()
    .domain([
      9,
      9.9,
      10.6,
      11.5,
      12.4
    ])
    .range([
      "#F6F05C",
      "#FF8068",
      "#FF4E6F",
      "#C645B8",
      "#6563DE"
    ])
    .interpolate(d3.interpolateRgb.gamma(2.2))
    .clamp(true);

function getDiffTextColour(rating) {
  if (rating < 6.5) {
    return "#000000";
  }

  if (rating < 9) {
    return "#F6F05C";
  }

  return difficultyTextColourSpectrum(rating);
}
