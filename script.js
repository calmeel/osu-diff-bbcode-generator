import { CONFIG, TEXT_COLOR_MODES } from "./js/config.js";
import { I18N } from "./js/i18n.js";
import { fetchBeatmapset, parseBeatmapsetId } from "./js/api.js";
import { normalizeBeatmaps } from "./js/beatmaps.js";
import {
  formatDifficultyName,
  formatDiffTextColor,
  formatMapperPreviewText,
  generateBBCode,
  generateIconUrl,
} from "./js/bbcode.js";
import { getDiffSections } from "./js/sections.js";

const STORAGE_KEY = "osu-diff-bbcode-generator:settings";

const elements = {
  beatmapUrl: document.getElementById("beatmap-url"),
  generateBtn: document.getElementById("generate-btn"),
  copyBtn: document.getElementById("copy-btn"),
  preview: document.getElementById("preview"),
  bbcodeOutput: document.getElementById("bbcode-output"),
  statusText: document.getElementById("status"),
  language: document.getElementById("language"),
  languageButtons: document.querySelectorAll(".language-btn"),
  guideLink: document.getElementById("guide-link"),
  updateLogBtn: document.getElementById("update-log-btn"),
  updateLogModal: document.getElementById("update-log-modal"),
  updateLogClose: document.getElementById("update-log-close"),
  textColorMode: document.getElementById("text-color-mode"),
  showHostAsMe: document.getElementById("show-host-as-me"),
  stripGuestOwnerPrefix: document.getElementById("strip-guest-owner-prefix"),
  stripManiaKeyPrefix: document.getElementById("strip-mania-key-prefix"),
};

let latestDiffs = [];
let latestStatusKey = "ready";
let latestStatusArgs = [];

loadSettings();

elements.generateBtn.addEventListener("click", handleGenerate);
elements.copyBtn.addEventListener("click", handleCopy);
elements.updateLogBtn.addEventListener("click", openUpdateLog);
elements.updateLogClose.addEventListener("click", closeUpdateLog);
elements.updateLogModal.addEventListener("click", handleUpdateLogBackdropClick);
document.addEventListener("keydown", handleDocumentKeydown);
for (const button of elements.languageButtons) {
  button.addEventListener("click", handleLanguageButtonClick);
}
elements.showHostAsMe.addEventListener("change", refreshGeneratedOutput);
elements.stripGuestOwnerPrefix.addEventListener("change", refreshGeneratedOutput);
elements.stripManiaKeyPrefix.addEventListener("change", refreshGeneratedOutput);
elements.textColorMode.addEventListener("change", refreshGeneratedOutput);
elements.showHostAsMe.addEventListener("change", saveSettings);
elements.stripGuestOwnerPrefix.addEventListener("change", saveSettings);
elements.stripManiaKeyPrefix.addEventListener("change", saveSettings);
elements.textColorMode.addEventListener("change", saveSettings);

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

    const beatmapset = await fetchBeatmapset(beatmapsetId, {
      proxyUrl: CONFIG.proxyUrl,
      messages: getApiMessages(),
    });
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
  saveSettings();
  refreshGeneratedOutput();
  setStatus(latestStatusKey, ...latestStatusArgs);
}

function openUpdateLog() {
  elements.updateLogModal.classList.remove("is-hidden");
  elements.updateLogClose.focus();
}

function closeUpdateLog() {
  elements.updateLogModal.classList.add("is-hidden");
  elements.updateLogBtn.focus();
}

function handleUpdateLogBackdropClick(event) {
  if (event.target.hasAttribute("data-update-log-close")) {
    closeUpdateLog();
  }
}

function handleDocumentKeydown(event) {
  if (event.key === "Escape" && !elements.updateLogModal.classList.contains("is-hidden")) {
    closeUpdateLog();
  }
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
  updateGuideLink();

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

function updateGuideLink() {
  if (elements.guideLink) {
    elements.guideLink.href = getLanguage() === "ja"
      ? "docs/guide.html"
      : "docs/guide.en.html";
  }
}

function getLanguage() {
  return elements.language?.value || "en";
}

function t(key, ...args) {
  const value = I18N[getLanguage()]?.[key] || I18N.en[key] || key;
  return typeof value === "function" ? value(...args) : value;
}

function getApiMessages() {
  return {
    proxyFetchFailed: t("proxyFetchFailed"),
    proxyRateLimited: t("proxyRateLimited"),
    proxyTemporaryUnavailable: t("proxyTemporaryUnavailable"),
    missingBeatmapsetData: t("missingBeatmapsetData"),
  };
}

function getBBCodeOptions() {
  return {
    showHostAsMe: elements.showHostAsMe?.checked ?? true,
    stripGuestOwnerPrefix: elements.stripGuestOwnerPrefix?.checked || false,
    stripManiaKeyPrefix: elements.stripManiaKeyPrefix?.checked || false,
    textColorMode: elements.textColorMode?.value || TEXT_COLOR_MODES.SR,
  };
}

function loadSettings() {
  const settings = readStoredSettings();

  if (!settings) {
    return;
  }

  if (settings.language && I18N[settings.language]) {
    elements.language.value = settings.language;
  }

  if (settings.textColorMode && hasSelectOption(elements.textColorMode, settings.textColorMode)) {
    elements.textColorMode.value = settings.textColorMode;
  }

  setCheckboxValue(elements.showHostAsMe, settings.showHostAsMe);
  setCheckboxValue(elements.stripGuestOwnerPrefix, settings.stripGuestOwnerPrefix);
  setCheckboxValue(elements.stripManiaKeyPrefix, settings.stripManiaKeyPrefix);
}

function readStoredSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  }
  catch (err) {
    console.warn("Failed to read stored settings.", err);
    return null;
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      language: getLanguage(),
      textColorMode: elements.textColorMode?.value || TEXT_COLOR_MODES.SR,
      showHostAsMe: elements.showHostAsMe?.checked ?? true,
      stripGuestOwnerPrefix: elements.stripGuestOwnerPrefix?.checked || false,
      stripManiaKeyPrefix: elements.stripManiaKeyPrefix?.checked || false,
    }));
  }
  catch (err) {
    console.warn("Failed to save settings.", err);
  }
}

function hasSelectOption(select, value) {
  return Array.from(select?.options || []).some(option => option.value === value);
}

function setCheckboxValue(checkbox, value) {
  if (typeof value === "boolean") {
    checkbox.checked = value;
  }
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
