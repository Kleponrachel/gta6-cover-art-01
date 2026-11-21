// Editor shell for Neon Coast Cover Studio: state, undo/redo, photos, export (round 6).
import { GRADES, LAYOUTS, SAMPLES, EXPORT_SIZES } from './looks.js';
import { renderCover } from './painter.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');

const state = {
  layout: 'hero-split',
  grade: 'neon-sunset',
  headline: 'VICE COAST',
  subline: 'Sunset Heist',
  photos: [],
  pans: [],
};
let undoStack = [];
let redoStack = [];
let activePanel = 0;
const images = {};

function snapshot() {
  return JSON.parse(JSON.stringify({
    layout: state.layout, grade: state.grade,
    headline: state.headline, subline: state.subline,
    photos: state.photos.map((p) => (p ? p.src : null)),
    pans: state.pans,
  }));
}
function restore(snap) {
  state.layout = snap.layout; state.grade = snap.grade;
  state.headline = snap.headline; state.subline = snap.subline;
  state.pans = snap.pans;
  state.photos = snap.photos.map((src) => (src ? (images[src] || loadImage(src)) : null));
  syncUI(); draw();
}
function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 40) undoStack.shift();
  redoStack = [];
}
function loadImage(src) {
  if (images[src]) return images[src];
  const img = new Image();
  img.src = src;
  img.onload = () => draw();
  images[src] = img;
  return img;
}
function draw() {
  renderCover(ctx, canvas.width, canvas.height, state);
}
function syncUI() {
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('active', b.dataset.key === state.layout));
  document.querySelectorAll('#grades button').forEach((b) => b.classList.toggle('active', b.dataset.key === state.grade));
  document.querySelectorAll('#samples img').forEach((im) => im.classList.toggle('active', im.src.endsWith(state.photos[activePanel]?.src?.split('/').pop() || '')));
  $('headline').value = state.headline;
  $('subline').value = state.subline;
}
function setLayout(key) {
  if (!LAYOUTS[key] || key === state.layout) return;
  pushUndo(); state.layout = key; ensurePhotos(); syncUI(); draw();
}
function setGrade(key) {
  if (!GRADES[key] || key === state.grade) return;
  pushUndo(); state.grade = key; syncUI(); draw();
}
function ensurePhotos() {
  const n = LAYOUTS[state.layout].panels.length;
  while (state.photos.length < n) state.photos.push(null);
  while (state.pans.length < n) state.pans.push({ x: 0, y: 0, z: 1 });
  state.photos.length = n; state.pans.length = n;
}
function pickPhoto(i, src) {
  pushUndo();
  state.photos[i] = loadImage(src);
  syncUI(); draw();
}
function exportPNG(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  renderCover(c.getContext('2d'), w, h, state);
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}
async function exportAll() {
  const status = $('status');
  for (const size of EXPORT_SIZES) {
    const blob = await exportPNG(size.w, size.h);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gta6-cover-${size.name}-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  status.textContent = 'Exported 3 PNG sizes.';
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  $('status').textContent = 'Undid.';
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  $('status').textContent = 'Redid.';
}

for (const [key, def] of Object.entries(LAYOUTS)) {
  const b = document.createElement('button');
  b.textContent = def.label; b.dataset.key = key;
  b.onclick = () => setLayout(key);
  $('layouts').appendChild(b);
}
for (const [key, def] of Object.entries(GRADES)) {
  const b = document.createElement('button');
  b.textContent = def.label; b.dataset.key = key;
  b.onclick = () => setGrade(key);
  $('grades').appendChild(b);
}
SAMPLES.forEach((name) => {
  const img = document.createElement('img');
  img.src = 'samples/' + name;
  img.alt = name; img.title = name;
  img.onclick = () => pickPhoto(activePanel, 'samples/' + name);
  $('samples').appendChild(img);
});
$('headline').addEventListener('input', (e) => { state.headline = e.target.value; draw(); });
$('headline').addEventListener('change', () => pushUndo());
$('subline').addEventListener('input', (e) => { state.subline = e.target.value; draw(); });
$('subline').addEventListener('change', () => pushUndo());
$('undo').onclick = undo;
$('redo').onclick = redo;
$('export').onclick = exportAll;
$('upload').addEventListener('change', (e) => {
  for (const file of e.target.files) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => draw();
    img.src = url;
    images[url] = img;
    pickPhoto(activePanel, url);
  }
});

let drag = null;
function panelAt(mx, my) {
  const r = canvas.getBoundingClientRect();
  const x = (mx - r.left) / r.width, y = (my - r.top) / r.height;
  const panels = LAYOUTS[state.layout].panels;
  for (let i = panels.length - 1; i >= 0; i--) {
    const pts = panels[i].pts;
    let inside = false;
    for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
      const [ax, ay] = pts[a], [bx, by] = pts[b];
      if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
    }
    if (inside) return i;
  }
  return 0;
}
canvas.addEventListener('pointerdown', (e) => {
  activePanel = panelAt(e.clientX, e.clientY);
  pushUndo();
  drag = { x: e.clientX, y: e.clientY, pan: { ...(state.pans[activePanel] || { x: 0, y: 0, z: 1 }) } };
  canvas.setPointerCapture(e.pointerId);
  syncUI();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const pan = state.pans[activePanel];
  pan.x = drag.pan.x + (e.clientX - drag.x) / r.width;
  pan.y = drag.pan.y + (e.clientY - drag.y) / r.height;
  draw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const i = panelAt(e.clientX, e.clientY);
  const pan = state.pans[i];
  pan.z = Math.min(2.5, Math.max(0.6, pan.z * (e.deltaY < 0 ? 1.08 : 0.92)));
  draw();
}, { passive: false });

ensurePhotos();
SAMPLES.forEach((name, i) => { if (i < state.photos.length) state.photos[i] = loadImage('samples/' + name); });
const params = new URLSearchParams(location.search);
if (params.get('layout') && LAYOUTS[params.get('layout')]) { state.layout = params.get('layout'); ensurePhotos(); }
if (params.get('grade') && GRADES[params.get('grade')]) state.grade = params.get('grade');
if (params.get('headline')) state.headline = params.get('headline');
if (params.get('subline') !== null) state.subline = params.get('subline');
if (params.get('cover') === '1') document.body.classList.add('cover-only');
syncUI();
draw();

window.__cover = {
  state, setLayout, setGrade, undo, redo, exportPNG, draw,
  pickPhoto, layouts: Object.keys(LAYOUTS), grades: Object.keys(GRADES),
};

// Headless smoke test: open ?smoke=1 — runs the 6x6 matrix, undo/redo and export,
// then writes the verdict into #smoke-results and document.title.
if (new URLSearchParams(location.search).get('smoke') === '1') {
  const results = { errors: [], matrix: [], undoRedo: false, exportOk: false };
  window.addEventListener('error', (e) => results.errors.push(String(e.message || e.error)));
  const div = document.createElement('div');
  div.id = 'smoke-results';
  document.body.appendChild(div);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  (async () => {
    await document.fonts.ready;
    for (let i = 0; i < 50 && !SAMPLES.every((n) => images['samples/' + n]?.complete); i++) await sleep(100);
    await sleep(500);
    const px = () => {
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 401) sum += d[i];
      return sum;
    };
    for (const layout of Object.keys(LAYOUTS)) {
      for (const grade of Object.keys(GRADES)) {
        state.layout = layout; state.grade = grade; ensurePhotos(); draw();
        results.matrix.push({ layout, grade, ok: px() > 0 });
      }
    }
    const before = state.layout;
    setLayout('grid-four');
    undo();
    const undone = state.layout === before;
    redo();
    results.undoRedo = undone && state.layout === 'grid-four';
    const sizes = [];
    for (const s of EXPORT_SIZES) {
      const blob = await exportPNG(s.w, s.h);
      sizes.push(blob ? blob.size : 0);
    }
    results.exportOk = sizes.every((n) => n > 10000);
    results.sizes = sizes;
    const failed = results.matrix.filter((m) => !m.ok).length;
    const pass = failed === 0 && results.undoRedo && results.exportOk && results.errors.length === 0;
    const verdict = { pass, failed, total: results.matrix.length, undoRedo: results.undoRedo, exportOk: results.exportOk, errors: results.errors, sizes };
    div.textContent = 'SMOKE ' + JSON.stringify(verdict);
    document.title = 'SMOKE ' + (pass ? 'PASS' : 'FAIL');
  })();
}
