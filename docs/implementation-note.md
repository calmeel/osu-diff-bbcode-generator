# Implementation Note

## Goal

Generate osu! forum BBCode from an osu! beatmapset URL while keeping the app deployable as a static page.

## Input

Example:

```text
https://osu.ppy.sh/beatmapsets/2552409#taiko/5663322
```

The parser reads the beatmapset ID from `/beatmapsets/{id}`.

## Data source

The app fetches beatmapset JSON through the Cloudflare Worker proxy:

```text
https://osu-diff-bbcode-proxy.vanity-rhythm.workers.dev/?id={beatmapsetId}
```

The Worker calls osu!api v2 with OAuth client credentials and returns the public `GET /api/v2/beatmapsets/{beatmapset}` JSON response to the static page. The client still keeps a legacy HTML fallback so a temporarily old Worker response can be parsed from `#json-beatmapset`.

Reference Worker code:

```text
docs/cloudflare-worker-api-v2.js
```

## Required data

For each beatmap difficulty:

- mode
- difficulty name
- star rating
- beatmap ID
- mapper username or usernames
- mapper profile URL or URLs
- whether the diff is a host diff or guest diff

Normalized difficulties are sorted by `starRating` from low to high before preview and BBCode rendering. For osu!mania, key-count markers such as `4K` or `[4K]` are detected first; mania diffs are ordered by key count, then SR.

osu!mania output is split into key-count sections. Each key section uses a heading such as `[b]4 Key[/b]`, matching the existing mode-heading style.

For collab diffs, use `beatmap.owners` when it is present. Each owner is rendered as a separate profile link and owner names are joined with ` & `. If `beatmap.owners` is missing or empty, fall back to the single `beatmap.user_id` mapper logic.

## Guest diff detection

Guest diff detection must use IDs from the beatmapset JSON:

- host diff: `beatmap.user_id === beatmapset.user_id`
- guest diff: `beatmap.user_id !== beatmapset.user_id`

Difficulty name parsing is only a fallback for a missing guest mapper name. It must not be used as the source of truth for guest diff detection.

The `Hide guest name prefix in diff names` option only changes rendered difficulty names. When enabled, guest diff names with a leading ownership prefix such as `Vanity's Oni` or `Anders' Oni` are displayed as `Oni` in both preview and BBCode output. The original beatmap JSON and guest diff detection are unchanged.

## SR colors

Use the osu!web difficulty badge color formula.

Important:

- background color uses gamma 2.2 RGB interpolation
- text color also uses gamma 2.2 RGB interpolation
- generated HEX values can be used directly
- no extra gamma correction is needed
- BBCode `[color=#xxxxxx]` uses the SR-based background color

## Icon URL

Preview icons are loaded from locally generated files:

```text
assets/i/{mode}/{sr}.png
```

BBCode output uses the GitHub Pages absolute URL so the images can be loaded from osu! forum posts and other external pages:

```text
https://calmeel.github.io/osu-diff-bbcode-generator/assets/i/{mode}/{sr}.png
```

The `{mode}` segment uses generated directory names:

- osu! `osu` mode -> `std`
- osu! `fruits` mode -> `catch`
- `taiko` and `mania` stay unchanged

The `{sr}` segment must be `Math.min(sr, 9).toFixed(2)`.

## Icon generation

The icon generator is `tools/generate-icons.py`. It renders glyphs from `assets/fonts/extra.ttf` with Pillow and writes PNGs to `assets/i/`.

Glyph mapping:

- `std`: `U+E800`
- `catch`: `U+E801`
- `mania`: `U+E802`
- `taiko`: `U+E803`

Generated range:

- `0.00.png` through `9.00.png`
- step: `0.01`
- total: 901 files per mode
- image size: `16x16`

The generated icons use the osu!web-like SR background color formula for the icon glyph itself, including gamma 2.2 RGB interpolation. The app's difficulty text color formula is not baked into the PNG files.

## BBCode generation

The BBCode output uses the standard grouped format:

```text
[b]taiko[/b]
[img]ICON_URL[/img][b][color=#4fe1ec] Kantan[/color][/b] by me
```

Difficulty name colors are controlled by the `Difficulty text color` option:

- `White`: always outputs `#ffffff`
- `SR color`: uses the SR background color, matching the original behavior
- `Readable SR color`: starts from the SR background color, outputs `#ffffff` for SR 9.00 and above, and smoothly blends other very dark colors toward `#d8d6ff`; this is the default
- `SR badge color`: uses the osu!web difficulty badge text color formula, but outputs `#ffffff` below SR 6.5 for forum readability

Mode headings such as `[b]taiko[/b]` are emitted only when the beatmapset contains multiple game modes. Single-mode beatmapsets output difficulty lines directly.

Host diffs can be rendered as `me` or as the host username profile link by toggling the host diff checkbox. Collab diffs always render all owner profile links, even when one owner is the beatmapset host. Guest diffs do not receive an extra `[GD]` label because the mapper credit already identifies them.

The `Hide osu!mania key prefix in diff names` option removes leading key markers such as `[7K] Enhance` -> `Enhance` and `7K Enhance` -> `Enhance`. It also handles guest-name variants such as `Blocko's 7K Otherworldly Judgment` -> `Blocko's Otherworldly Judgment`; if guest owner prefixes are hidden too, the same title becomes `Otherworldly Judgment`.

## Localization

UI strings are stored in the `I18N` table in `script.js`.

Current languages:

- English
- Japanese

Changing language updates the web app UI labels and status messages. Generated BBCode stays in the same forum-facing format, including `by me` when the host checkbox is enabled.

## Current structure

- `index.html`: static markup and controls
- `style.css`: layout and visual styling
- `script.js`: client logic
- `tools/generate-icons.py`: local icon generation script
- `assets/fonts/extra.ttf`: osu! icon font asset
- `assets/i/`: generated local mode icons used by preview and BBCode output

The header includes project credits, language toggle buttons, a GitHub repository link, and a link to `docs/color-table.html`.

The main script is organized around:

- DOM element lookup and event handlers
- beatmapset JSON fetch, with legacy HTML JSON extraction as fallback
- beatmap normalization
- preview rendering that mirrors the BBCode line layout
- BBCode line formatting
- osu!web SR color helpers

## Deployment notes

The project can be served by GitHub Pages or any static host. No build step is required.

External runtime dependencies:

- d3 from jsDelivr
- Cloudflare Worker proxy with osu! OAuth client credentials
