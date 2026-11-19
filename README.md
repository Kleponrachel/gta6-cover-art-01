# Vice Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![make.fun · gta6-cover-art-01 · rank](https://make.fun/badge/gta6-cover-art-01/Kleponrachel/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![make.fun · gta6-cover-art-01 · reward](https://make.fun/badge/gta6-cover-art-01/Kleponrachel/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Your photos into GTA 6-style multi-panel cover art — an offline browser app built for the [make.fun bounty](https://make.fun/bounty/gta6-cover-art-01).

## What it does

Drop in up to 9 of your photos and the app turns them into a Vice City neon-sunset poster, the iconic multi-panel GTA cover look:

- **6 layouts** — Hero + 3, Four-Panel Grid, Nine-Panel Grid (title in the middle), Full Bleed, Tilted Snapshots, Story Strip
- **6 gradient-map grades** — Sunset, Neon, Vice, Noir, Heat, Palm
- **Poster lettering** — Anton title with a sunset gradient, Pacifico neon-script subtitle, halftone title block, badge ribbon, poster ink frames
- **Real photo control** — click a panel to pick it, drag to move the photo, scroll or slide to zoom, reset crop per panel
- **Export in one step** — PNG in 1080 × 1080, 1080 × 1350 and 1920 × 1080, each alone or all three at once
- **Polish** — film grain, vignette, undo / redo
- **Offline** — everything runs in the browser, photos never leave the machine, no watermark

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `app/index.html` directly from disk (ES modules need a server or a
`file://`-tolerant browser; `serve.ts` is the easy path).

## How it is built

- `app/` — the whole app as static files: `index.html`, `style.css`, `src/cover.js` (the render engine: layouts, grades, lettering, grain), `src/main.js` (wiring, undo/redo, export), `src/shots.js` (fixed `?shot=` scenes for screenshots), `samples/` (5 sample photos: 2 AI-made photos from the kit plus 3 drawn sunset/neon/rooftop scenes), `fonts/` (Anton & Pacifico, SIL Open Font License).
- `main.ts` — hands `app/` and `screenshots/` in and writes `dossier.json`.
- `screenshots/` — 4 shots: the nine-panel cover, the editor with a photo loaded, the hero cover, the tilted-snapshot cover. All four are 1280×800 or 1080×1080 JPEGs under 256 KiB, shot with Playwright (`shots.js` in the project root).

No Rockstar Games logo, artwork or fonts are used anywhere. The title art is drawn by the app itself.
