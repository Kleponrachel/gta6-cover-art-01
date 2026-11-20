// Neon Vice Cover Studio — hand-in program (Node 22, standard library only).
//
// The app is this directory's app/ folder: plain static files a desktop
// browser loads offline (app/index.html and its ES modules, no library, no
// network request). This program copies app/ and screenshots/ from beside
// this file to /output and writes /output/dossier.json, the summary the
// judge reads, with the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB
// of app files, in all, or a path under app/ over 1000 bytes).
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function countFiles(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    total += statSync(p).isDirectory() ? countFiles(p) : 1;
  }
  return total;
}

// Pre-flight: refuse to hand in a broken entry instead of letting the
// scorer refuse it. Checks the app folder exists, every screenshot is a
// file at or under the 256 KiB cap, and the screenshot count is within the
// gate's max of 4.
function preflight(appDir, shotsDir) {
  if (!existsSync(appDir) || !statSync(appDir).isDirectory()) {
    throw new Error(`app/ is missing at ${appDir}`);
  }
  const shots = existsSync(shotsDir)
    ? readdirSync(shotsDir).filter((n) => statSync(join(shotsDir, n)).isFile())
    : [];
  if (shots.length === 0) throw new Error('screenshots/ is empty — the judge needs at least one');
  if (shots.length > DOSSIER_CAPS.screenshots.max) {
    throw new Error(`too many screenshots: ${shots.length} (max ${DOSSIER_CAPS.screenshots.max})`);
  }
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > DOSSIER_CAPS.screenshots.max_bytes) {
      throw new Error(`screenshot ${name} is ${size} bytes (max ${DOSSIER_CAPS.screenshots.max_bytes})`);
    }
  }
  return shots;
}

// Post-flight: re-read the dossier we just wrote and confirm it parses,
// carries the makefun/dossier/v1 schema, and names the same screenshot
// files we copied (the dossier embeds them as images with name + sha256).
function verify(out, shots) {
  const dossier = JSON.parse(readFileSync(join(out, 'dossier.json'), 'utf8'));
  if (dossier.schema !== 'makefun/dossier/v1') {
    throw new Error(`dossier.json has unexpected schema ${dossier.schema}`);
  }
  const listed = (dossier.images ?? []).map((s) => s.name ?? s);
  for (const name of shots) {
    if (!listed.includes(name)) throw new Error(`dossier.json does not list screenshot ${name}`);
  }
  if (typeof dossier.cover !== 'number' || dossier.cover < 0 || dossier.cover >= listed.length) {
    throw new Error('dossier.json has no valid cover image index');
  }
  return dossier;
}

function handIn() {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const appDir = join(here, 'app');
  const shotsDir = join(here, 'screenshots');

  const shots = preflight(appDir, shotsDir);

  mkdirSync(out, { recursive: true });
  cpSync(appDir, join(out, 'app'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(shotsDir)) {
    cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
  }

  writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_CAPS));
  verify(out, shots);

  const appFiles = countFiles(join(out, 'app'));
  console.log(`handed in ${appFiles} app files and ${shots.length} screenshots to ${out} (dossier verified)`);
}

handIn();
