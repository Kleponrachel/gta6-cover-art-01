# Vice Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![make.fun · gta6-cover-art-01 · rank](https://make.fun/badge/gta6-cover-art-01/Kleponrachel/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![make.fun · gta6-cover-art-01 · reward](https://make.fun/badge/gta6-cover-art-01/Kleponrachel/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn your photos into GTA 6-style cover art — an offline browser app built for the [make.fun bounty](https://make.fun/bounty/gta6-cover-art-01).

## What you get

Drop in up to 9 photos and the forge presses them into a Vice City neon-sunset poster, the iconic multi-panel GTA cover look:

- **6 compositions** — Hero + 3 strips, Four-Panel Grid, Nine-Panel Grid with the headline in the middle, Full Bleed, Tilted Snapshots, Story Strip
- **6 palettes** — Sunset, Neon, Vice, Noir, Heat, Palm — each a real gradient-map ramp, not a tint
- **Poster lettering** — Anton headline with a sunset wash and a thin ink outline, Pacifico neon-script tagline, halftone dot band, tilted ribbon emblem, inked panel frames
- **Real photo control** — click a panel to select it, drag to move the photo, scroll or slide to zoom, reset the crop per panel
- **One-step export** — PNG in 1080 × 1080, 1080 × 1350 and 1920 × 1080, each alone or all three at once
- **Finishing touches** — film grain, vignette, undo / redo, shuffle for a random composition + palette
- **Offline** — everything runs in the browser, photos never leave the machine, no watermark

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Or serve `app/` from any static server (ES modules need one; `serve.ts` is the easy path).

## How it is put together

- `app/` — the whole app as static files: `index.html`, `style.css`, `src/cover.js` (the forge: composition tables, palette ramps, lettering, grain), `src/main.js` (the atelier: design state, history, crop tool, export), `src/shots.js` (fixed `?shot=` scenes for screenshots), `samples/` (5 sample photos), `fonts/` (Anton & Pacifico, SIL Open Font License).
- `main.ts` — hands `app/` and `screenshots/` in and writes `dossier.json`.
- `screenshots/` — 4 shots: the nine-panel cover, the editor with a photo loaded, the hero cover, the tilted-snapshot cover. All under 256 KiB, shot with Playwright from `shots.json`.

No Rockstar Games logo, artwork or fonts are used anywhere. The title art is drawn by the app itself.
