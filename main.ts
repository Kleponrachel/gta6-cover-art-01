// Neon Coast Cover Studio — gta6-cover-art-01 entry (Node 22, standard library only).
// The app is this directory's app/ folder: plain static files a desktop browser loads
// offline (app/index.html and its ES modules, no library, no network request).
// This program hands it in: it copies app/ and screenshots/ from beside this file to
// /output and writes /output/dossier.json with the vendored make.fun library.
// Serve locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Preflight: refuse to hand in a broken tree instead of failing halfway.
const required = ['app/index.html', 'app/src/workbench.js', 'app/src/painter.js', 'app/src/looks.js', 'app/style.css', 'vendor/makefun-app.ts'];
for (const rel of required) {
  if (!existsSync(join(here, rel))) throw new Error(`preflight: missing ${rel}`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// Postflight: the hand-in is only real if the dossier parses and the app landed.
import { readFileSync, readdirSync, statSync } from 'node:fs';
const dossier = JSON.parse(readFileSync(join(out, 'dossier.json'), 'utf8'));
if (dossier.schema !== 'makefun/dossier/v1') throw new Error(`postflight: bad dossier schema ${dossier.schema}`);
if (!existsSync(join(out, 'app', 'index.html'))) throw new Error('postflight: app/index.html missing from /output');
const shots = readdirSync(join(out, 'screenshots')).filter((f) => /\.(png|jpe?g)$/i.test(f));
if (shots.length < 3 || shots.length > 4) throw new Error(`postflight: expected 3-4 screenshots, found ${shots.length}`);
for (const s of shots) {
  if (statSync(join(out, 'screenshots', s)).size > 262144) throw new Error(`postflight: screenshot ${s} over 256 KiB`);
}
console.log(`hand-in ok: dossier ${dossier.schema}, ${shots.length} screenshots, app ${readdirSync(join(out, 'app')).length} top-level entries`);

// Summary: list the hand-in so two runs can be compared byte for byte.
const walk = (dir, base = '') => {
  const outFiles = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (statSync(p).isDirectory()) outFiles.push(...walk(p, rel));
    else outFiles.push(`${rel} ${statSync(p).size}`);
  }
  return outFiles;
};
console.log(['hand-in files:', ...walk(out)].join('\n'));
