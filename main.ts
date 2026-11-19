// Vice Coast Cover Studio — a gta6-cover-art-01 entry (Node 22, standard
// library only). The app is this directory's app/ folder: plain static files
// a desktop browser loads offline (app/index.html and its ES modules, the
// Anton and Pacifico fonts vendored under app/fonts/, no library and no
// network request), and this program hands it in. It copies app/ and
// screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library. The cover maker itself lives in app/src/cover.js: six
// multi-panel layouts, six gradient-map grades, poster lettering with a
// halftone title block, per-panel crop, and PNG export in 1080 x 1080,
// 1080 x 1350 and 1920 x 1080. Its sample photos (app/samples/) are the
// kit's two AI-made photos plus three scenes drawn for this entry, and are
// free to use. The first screenshot by name is the cover.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// Where the entry lives, and where the grader wants the output.
const root = fileURLToPath(new URL('.', import.meta.url));
const dest = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Copy a directory only when it is there, and say how much went in.
function handIn(name) {
  const from = join(root, name);
  if (!existsSync(from)) {
    console.log(`no ${name}/ to hand in`);
    return 0;
  }
  const to = join(dest, name);
  cpSync(from, to, { recursive: true });
  const count = readdirSync(to).length;
  console.log(`handed in ${name}/ (${count} top-level entries)`);
  return count;
}

mkdirSync(dest, { recursive: true });
handIn('app');
mkdirSync(join(dest, 'screenshots'), { recursive: true });
handIn('screenshots');

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB
// of app files, in all, or a path under app/ over 1000 bytes: app/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
const dossier = buildDossier(dest, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(dest, 'dossier.json'), dossier);

// A quick read-back so a broken hand-in is loud instead of silent.
const shotFiles = readdirSync(join(dest, 'screenshots')).filter((f) => /\.(png|jpe?g)$/i.test(f));
function treeBytes(dir) {
  return readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => {
    const p = join(dir, e.name);
    return sum + (e.isDirectory() ? treeBytes(p) : statSync(p).size);
  }, 0);
}
console.log(`dossier.json written (${dossier.length} bytes); ${shotFiles.length} screenshot(s); app/ is ${treeBytes(join(dest, 'app'))} bytes`);
