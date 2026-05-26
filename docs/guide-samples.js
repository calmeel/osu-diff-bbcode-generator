const SAMPLE_DIFFS = [
  [1, "Kantan"],
  [2, "Futsuu"],
  [3, "Muzukashii"],
  [4, "Oni"],
  [5, "Inner Oni"],
  [6, "Ura Oni"],
  [7, "Hell Oni"],
  [8, "Lunatic Oni"],
  [9, "Psychopathic Oni"],
  [10, "Speed Insanity"],
];

const DIFFICULTY_COLOUR_STOPS = [
  [0.1, "#4290FB"],
  [1.25, "#4FC0FF"],
  [2, "#4FFFD5"],
  [2.5, "#7CFF4F"],
  [3.3, "#F6F05C"],
  [4.2, "#FF8068"],
  [4.9, "#FF4E6F"],
  [5.8, "#C645B8"],
  [6.7, "#6563DE"],
  [7.7, "#18158E"],
  [9, "#000000"],
];

const DIFFICULTY_TEXT_COLOUR_STOPS = [
  [9, "#F6F05C"],
  [9.9, "#FF8068"],
  [10.6, "#FF4E6F"],
  [11.5, "#C645B8"],
  [12.4, "#6563DE"],
];

for (const container of document.querySelectorAll("[data-sample-mode]")) {
  renderSamples(container, container.dataset.sampleMode);
}

function renderSamples(container, mode) {
  const fragment = document.createDocumentFragment();

  for (const [sr, name] of SAMPLE_DIFFS) {
    const line = document.createElement("div");
    const srLabel = document.createElement("span");
    const icon = document.createElement("img");
    const title = document.createElement("span");

    line.className = "sample-line";
    srLabel.className = "sample-sr";
    srLabel.textContent = `SR ${sr}`;
    icon.src = `../assets/i/taiko/${Math.min(sr, 9).toFixed(2)}.png`;
    icon.alt = "";
    title.className = "sample-title";
    title.style.color = getTextColor(sr, mode);
    title.textContent = name;

    line.append(srLabel, icon, title);
    fragment.appendChild(line);
  }

  container.appendChild(fragment);
}

function getTextColor(sr, mode) {
  if (mode === "white") {
    return "#ffffff";
  }

  if (mode === "badge") {
    return sr < 6.5 ? "#ffffff" : getDiffTextColour(sr);
  }

  const srColor = getDiffColour(sr);

  if (mode === "readable") {
    return getReadableSrColor(srColor);
  }

  return srColor;
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

function getDiffColour(rating) {
  if (rating < 0.1) {
    return "#AAAAAA";
  }

  if (rating >= 9) {
    return "#000000";
  }

  return scaleColour(rating, DIFFICULTY_COLOUR_STOPS);
}

function getDiffTextColour(rating) {
  if (rating < 6.5) {
    return "#000000";
  }

  if (rating < 9) {
    return "#F6F05C";
  }

  return scaleColour(rating, DIFFICULTY_TEXT_COLOUR_STOPS);
}

function scaleColour(rating, stops) {
  if (rating <= stops[0][0]) {
    return stops[0][1];
  }

  if (rating >= stops[stops.length - 1][0]) {
    return stops[stops.length - 1][1];
  }

  for (let index = 1; index < stops.length; index += 1) {
    const [stopRating, stopColour] = stops[index];
    const [previousRating, previousColour] = stops[index - 1];

    if (rating <= stopRating) {
      const amount = (rating - previousRating) / (stopRating - previousRating);
      return rgbToHex(interpolateRgbGamma(
        hexToRgb(previousColour),
        hexToRgb(stopColour),
        amount,
      ));
    }
  }

  return stops[stops.length - 1][1];
}

function interpolateRgbGamma(start, end, amount, gamma = 2.2) {
  return start.map((startValue, index) => {
    const endValue = end[index];
    const startGamma = (startValue / 255) ** gamma;
    const endGamma = (endValue / 255) ** gamma;
    const interpolated = startGamma + (endGamma - startGamma) * amount;
    return Math.round((interpolated ** (1 / gamma)) * 255);
  });
}

function getRelativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex);
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
  const rgb = from.map((value, index) => Math.round(value + (to[index] - value) * amount));
  return rgbToHex(rgb);
}

function hexToRgb(value) {
  const hex = value.replace("#", "");
  return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16));
}

function rgbToHex(rgb) {
  return `#${rgb.map(value => value.toString(16).padStart(2, "0")).join("")}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
