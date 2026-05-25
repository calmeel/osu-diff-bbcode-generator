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

The app fetches beatmapset HTML through the existing Cloudflare Worker proxy:

```text
https://osu-diff-bbcode-proxy.vanity-rhythm.workers.dev/?id={beatmapsetId}
```

Do not change the proxy behavior in this repository. The client expects the proxy to return the original beatmapset HTML so it can read `#json-beatmapset`.

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

Icons are loaded from locally generated files:

```text
assets/icons/generated/{mode}/{sr}.png
```

The `{mode}` segment uses generated directory names:

- osu! `osu` mode -> `std`
- osu! `fruits` mode -> `catch`
- `taiko` and `mania` stay unchanged

The `{sr}` segment must be `Math.min(sr, 9).toFixed(2)`.

## Icon generation

The icon generator is `tools/generate-icons.py`. It renders glyphs from `assets/fonts/extra.ttf` with Pillow and writes PNGs to `assets/icons/generated/`.

Glyph mapping:

- `std`: `U+E800`
- `catch`: `U+E801`
- `mania`: `U+E802`
- `taiko`: `U+E803`

Generated range:

- `0.00.png` through `9.00.png`
- step: `0.01`
- total: 901 files per mode

The generated icons use the same osu!web-like SR background and text color formulas as the app, including gamma 2.2 RGB interpolation.

## BBCode generation

The BBCode output uses the standard grouped format:

```text
[b]taiko[/b]
[img]ICON_URL[/img][b][color=#4fe1ec] Kantan[/color][/b] by Me
```

Mode headings such as `[b]taiko[/b]` are emitted only when the beatmapset contains multiple game modes. Single-mode beatmapsets output difficulty lines directly.

Host diffs can be rendered as `Me` or as the host username profile link by toggling the host diff checkbox. Collab diffs always render all owner profile links, even when one owner is the beatmapset host. Guest diffs do not receive an extra `[GD]` label because the mapper credit already identifies them.

## Localization

UI strings are stored in the `I18N` table in `script.js`.

Current languages:

- English
- Japanese

Changing language updates the web app UI labels and status messages. Generated BBCode stays in the same forum-facing format, including `by Me` when the host checkbox is enabled.

## Current structure

- `index.html`: static markup and controls
- `style.css`: layout and visual styling
- `script.js`: client logic
- `tools/generate-icons.py`: local icon generation script
- `assets/fonts/extra.ttf`: osu! icon font asset
- `assets/icons/generated/`: generated local mode icons

The header includes project credits, language toggle buttons, a GitHub repository link, and a link to `docs/color-table.html`.

The main script is organized around:

- DOM element lookup and event handlers
- beatmapset fetch and HTML JSON extraction
- beatmap normalization
- preview rendering that mirrors the BBCode line layout
- BBCode line formatting
- osu!web SR color helpers

## Deployment notes

The project can be served by GitHub Pages or any static host. No build step is required.

External runtime dependencies:

- d3 from jsDelivr
- existing Cloudflare Worker proxy
