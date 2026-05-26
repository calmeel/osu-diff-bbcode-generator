# osu! Diff BBCode Generator

<img src="assets/images/icon.png">

A static web tool that generates osu! description BBCode for all difficulties in a beatmapset.

## Live site

[osu! Diff BBCode Generator](https://calmeel.github.io/osu-diff-bbcode-generator/)

## Features

- Paste an osu! beatmapset URL
- Fetch beatmapset HTML through the existing Cloudflare Worker proxy
- Extract difficulty data from `#json-beatmapset`
- Group difficulties by game mode
- Sort difficulties by star rating from low to high
- Sort osu!mania key variants like `4K` and `[4K]` by key count first, then star rating
- Group osu!mania output under key headings such as `[b]4 Key[/b]`
- Detect host and guest difficulties
- Optionally hide guest ownership prefixes such as `Vanity's Oni` in diff names
- Optionally hide osu!mania key prefixes such as `[7K] Enhance`
- Credit collab difficulties with all listed owners
- Apply osu!web-like star rating colors
- Choose difficulty name color mode for forum readability
- Use locally generated SR-colored mode icons
- Generate BBCode
- Switch the UI between English and Japanese
- Open the GitHub repository and color table from the header
- Copy the generated BBCode

## Local usage

Open `index.html` in a browser. The app is static and does not require a build step.

The browser must be able to access:

- `https://cdn.jsdelivr.net/npm/d3@7`
- `https://osu-diff-bbcode-proxy.vanity-rhythm.workers.dev`

## Icon generation

Mode icons are generated locally from `assets/fonts/extra.ttf` into `assets/i/`.

The generated file names follow the app icon policy:

- modes: `std`, `taiko`, `catch`, `mania`
- star ratings: `0.00.png` through `9.00.png`
- ratings above 9.00 use `9.00.png`
- image size: `16x16`

The in-app preview uses local relative paths. Generated BBCode uses the GitHub Pages absolute URL so forum posts can load the icons from outside this repository:

```text
https://calmeel.github.io/osu-diff-bbcode-generator/assets/i/{mode}/{sr}.png
```

Run the generator with:

```bash
python tools/generate-icons.py
```

## Credits

- Program: [Vanity8](https://osu.ppy.sh/users/12029122)
- Planning: [Santi199](https://osu.ppy.sh/users/9346502)

## Attribution

This project uses and references several osu!-related resources.

### Difficulty icon assets

Difficulty icons are generated from the osu! icon font asset in `assets/fonts/extra.ttf`.

The font asset is from the osu! / osu!web ecosystem:

- [ppy/osu-web](https://github.com/ppy/osu-web)

See [LICENSES/osu-assets.txt](LICENSES/osu-assets.txt) for the asset attribution note.

### osu!web difficulty colors

The SR background and text color logic is based on the public osu!web implementation by ppy / peppy:

- Background / text color definitions: [`resources/js/utils/beatmap-helper.ts`](https://github.com/ppy/osu-web/blob/master/resources/js/utils/beatmap-helper.ts)
- Difficulty badge component: [`resources/js/components/difficulty-badge.tsx`](https://github.com/ppy/osu-web/blob/master/resources/js/components/difficulty-badge.tsx)
- Difficulty badge CSS: [`resources/css/bem/difficulty-badge.less`](https://github.com/ppy/osu-web/blob/master/resources/css/bem/difficulty-badge.less)

The color calculation in this tool is intended to match osu!web's difficulty badge behavior for BBCode generation.

## License

The source code in this repository is released under the MIT License. See [LICENSE](LICENSE).

This license applies to this repository's own code and documentation. It does not grant additional rights to external assets or upstream code referenced above, including osu! icon font assets or osu!web source code.
