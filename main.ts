// Vice Coast Cover Studio — a gta6-cover-art-01 entry (Node 22, standard
// library only). The app is this directory's app/ folder: plain static files
// a desktop browser loads offline (app/index.html and its ES modules, the
// Anton and Pacifico fonts vendored under app/fonts/, no library and no
// network request), and the program hands it in: it copies app/ and
// screenshots/ beside this file to /output and writes /output/dossier.json,
// the summary the judge reads, with the vendored make.fun library.
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of
// app files, in all, or a path under app/ over 1000 bytes).
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function countFiles(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = countFiles(full);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += statSync(full).size;
    }
  }
  return { files, bytes };
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

const appStats = countFiles(join(out, 'app'));
const shotStats = countFiles(join(out, 'screenshots'));
console.log(`app/: ${appStats.files} files, ${appStats.bytes} bytes`);
console.log(`screenshots/: ${shotStats.files} files, ${shotStats.bytes} bytes`);

const dossierBytes = buildDossier(out, CAPS);
const dossierText = Buffer.from(dossierBytes).toString('utf8');
writeFileSync(join(out, 'dossier.json'), dossierText);
console.log('dossier.json written');

// Verify what was handed in: the dossier must carry the cover plus one
// image per screenshot, and nothing may bust the scorer's caps.
const parsed = JSON.parse(dossierText);
const imageCount = Array.isArray(parsed.images) ? parsed.images.length : 0;
const problems = [];
if (imageCount !== shotStats.files) {
  problems.push(`dossier carries ${imageCount} images but ${shotStats.files} screenshots were copied`);
}
if (shotStats.files > CAPS.screenshots.max) {
  problems.push(`${shotStats.files} screenshots, over the cap of ${CAPS.screenshots.max}`);
}
if (appStats.files > CAPS.app_max_files) {
  problems.push(`${appStats.files} app files, over the cap of ${CAPS.app_max_files}`);
}
if (appStats.bytes > CAPS.app_max_bytes) {
  problems.push(`app/ is ${appStats.bytes} bytes, over the cap of ${CAPS.app_max_bytes}`);
}
if (problems.length) {
  for (const p of problems) console.error(`hand-in problem: ${p}`);
  process.exit(1);
}
console.log(`hand-in verified: cover + ${imageCount} screenshots, ${appStats.files} app files`);
