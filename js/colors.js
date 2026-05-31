/* =========================================================
   osu!web SR colors
========================================================= */

const difficultyColourSpectrum =
  window.d3.scaleLinear()
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
    .interpolate(window.d3.interpolateRgb.gamma(2.2))
    .clamp(true);

export function getDiffColour(rating) {
  if (rating < 0.1) {
    return "#AAAAAA";
  }

  if (rating >= 9) {
    return "#000000";
  }

  return difficultyColourSpectrum(rating);
}

const difficultyTextColourSpectrum =
  window.d3.scaleLinear()
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
    .interpolate(window.d3.interpolateRgb.gamma(2.2))
    .clamp(true);

export function getDiffTextColour(rating) {
  if (rating < 6.5) {
    return "#000000";
  }

  if (rating < 9) {
    return "#F6F05C";
  }

  return difficultyTextColourSpectrum(rating);
}

export function getReadableSrColor(srColor) {
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

export function rgbToHex(rgb) {
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
