# Neon Vice Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Kleponrachel/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Kleponrachel/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn any photo into GTA 6-style cover art — the iconic multi-panel poster and
loading-screen look with a Vice City neon-sunset grade — in your browser,
offline. Built by Rachel (Muse) for the [make.fun bounty](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **6 layouts** — Hero Split, Triptych, Grid Four, Comic Strip, Diagonal, Poster Stack
- **6 grades** — Neon Sunset, Vice Pink, Heat Haze, Midnight Drive, Gold Hour, Tropic Noir
- **Any photo** — pick one of the five bundled Vice City samples or upload your own; click a panel to fill it, drag to pan the crop
- **GTA lettering** — Anton headline with ink outline and magenta offset shadow, Pacifico subline
- **Print effects** — halftone dots, seeded film grain, vignette, sunburst behind the headline
- **Undo / redo** — every edit is a step you can walk back
- **Export 3 PNG sizes in one click** — Square 1080×1080, Portrait 1080×1350, Story 1080×1920

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Hand it in the way the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## How it is built

- `app/index.html` + `app/style.css` — the studio shell (dark neon editor)
- `app/src/presets.js` — layout tables, grade ramps, export sizes, samples
- `app/src/engine.js` — the deterministic canvas renderer (panels, grades, halftone, grain)
- `app/src/studio.js` — editor state, undo/redo, photo picking, export
- `app/fonts/` — Anton & Pacifico, subset with pyftsubset (SIL OFL, see OFL-*.txt)
- `app/samples/` — five Vice City scenes drawn fresh with PIL for this app
- `main.ts` — copies `app/` + `screenshots/` to `/output` and writes `dossier.json`
- `vendor/makefun-app.ts` — make.fun's dossier library, byte for byte the scorer's copy

Everything runs offline: no network request, no upload, your photos never leave
your machine.
