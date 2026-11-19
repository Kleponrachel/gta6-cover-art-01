// Vice Coast Cover Studio — wires the page: photos, panels, lettering, export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, LAYOUTS, GRADES, SIZES, layoutGeometry } from './cover.js';
import { runShot } from './shots.js';

export const SAMPLES = ['boulevard', 'pier', 'sunset', 'neon', 'rooftop'];

export const state = {
  layout: 'hero3',
  grade: 'sunset',
  size: 'square',
  title: 'NEON SHORE',
  subtitle: 'a Leonida story',
  badge: 'LEONIDA • 2026',
  photos: [], // { img, crop: {x, y, zoom} } per slot, index = panel order
  selected: 0,
  grain: true,
  vignette: true,
};

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
let undoStack = [];
let redoStack = [];
let drag = null;
// The snapshot taken before an edit starts (text input, slider drag, panel
// drag): pushed onto the undo stack when the edit ends, so undo restores
// the state from *before* the edit, not the edited one.
let beforeEdit = null;

function beginEdit() {
  beforeEdit = snapshot();
}

function endEdit() {
  if (beforeEdit && beforeEdit !== snapshot()) {
    undoStack.push(beforeEdit);
    if (undoStack.length > 60) undoStack.shift();
    redoStack = [];
    updateUndoButtons();
  }
  beforeEdit = null;
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function snapshot() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, size: state.size,
    title: state.title, subtitle: state.subtitle, badge: state.badge,
    grain: state.grain, vignette: state.vignette,
    photos: state.photos.map((p) => (p ? { src: p.src, crop: p.crop } : null)),
    selected: state.selected,
  });
}

function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  updateUndoButtons();
}

function restore(json) {
  const s = JSON.parse(json);
  state.layout = s.layout; state.grade = s.grade; state.size = s.size;
  state.title = s.title; state.subtitle = s.subtitle; state.badge = s.badge;
  state.grain = s.grain; state.vignette = s.vignette;
  state.selected = s.selected ?? 0;
  // photos keep their loaded images by src; reload any whose image is gone
  state.photos = s.photos.map((p) => {
    if (!p) return null;
    const old = state.photos.find((o) => o && o.src === p.src);
    return old ? { ...old, crop: p.crop } : { src: p.src, img: null, crop: p.crop };
  });
  const reloads = state.photos
    .filter((p) => p && !p.img)
    .map((p) => loadImage(p.src).then((img) => { p.img = img; }).catch(() => {}));
  Promise.all(reloads).then(() => redraw());
  syncControls();
  redraw();
}

export function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  updateUndoButtons();
}

export function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  updateUndoButtons();
}

function updateUndoButtons() {
  const u = document.getElementById('undo');
  const r = document.getElementById('redo');
  if (u) u.disabled = !undoStack.length;
  if (r) r.disabled = !redoStack.length;
}

function sizeCanvas() {
  const s = SIZES[state.size];
  if (document.body.classList.contains('shot-cover')) {
    // screenshot mode: render at full export resolution (capped at 1920)
    const scale = Math.min(1, 1920 / Math.max(s.w, s.h));
    canvas.width = Math.round(s.w * scale);
    canvas.height = Math.round(s.h * scale);
  } else {
    const maxDim = 760;
    const scale = Math.min(1, maxDim / Math.max(s.w, s.h));
    canvas.width = Math.round(s.w * scale);
    canvas.height = Math.round(s.h * scale);
  }
  canvas.style.aspectRatio = `${s.w} / ${s.h}`;
}

export function redraw() {
  sizeCanvas();
  drawCover(canvas, state);
  const sel = document.getElementById('panelLabel');
  if (sel) sel.textContent = `Panel ${state.selected + 1} of ${panelCount()}`;
}

function panelCount() {
  return layoutGeometry(state.layout, 1, 1).panels.length;
}

export function syncControls() {  const q = (id) => document.getElementById(id);
  if (q('layout')) q('layout').value = state.layout;
  if (q('grade')) q('grade').value = state.grade;
  if (q('size')) q('size').value = state.size;
  if (q('title')) q('title').value = state.title;
  if (q('subtitle')) q('subtitle').value = state.subtitle;
  if (q('badge')) q('badge').value = state.badge;
  if (q('grain')) q('grain').checked = state.grain;
  if (q('vignette')) q('vignette').checked = state.vignette;
  const z = state.photos[state.selected]?.crop?.zoom ?? 1;
  if (q('zoom')) q('zoom').value = z;
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

// --- photos ---------------------------------------------------------------
export async function loadSamples() {
  const jobs = SAMPLES.map(async (name) => {
    const img = await loadImage(`samples/${name}.jpg`);
    return { src: `samples/${name}.jpg`, img, crop: { x: 0, y: 0, zoom: 1 } };
  });
  const loaded = await Promise.all(jobs);
  // Default arrangement with per-slot crops: the boulevard hero is panned down
  // so the face shows, and repeated photos get different crops so the grid
  // does not look like the same shot twice.
  const order = [0, 1, 2, 3, 4, 0, 1, 2];
  const crops = [
    { x: 0, y: 0.38, zoom: 1 },    // boulevard hero: face in frame
    { x: 0, y: 0, zoom: 1 },       // pier
    { x: 0, y: 0, zoom: 1 },       // sunset
    { x: 0, y: 0, zoom: 1 },       // neon
    { x: 0, y: 0, zoom: 1 },       // rooftop
    { x: 0.22, y: 0.25, zoom: 1.45 }, // boulevard again, tighter + right
    { x: -0.22, y: 0.1, zoom: 1.35 }, // pier again, tighter + left
    { x: 0, y: -0.2, zoom: 1.25 },     // sunset again, tighter + up
  ];
  state.photos = order.map((i, slot) => ({ ...loaded[i], crop: crops[slot] }));
}

function assignPhoto(file) {
  const url = URL.createObjectURL(file);
  return loadImage(url).then((img) => {
    const slot = { src: url, img, crop: { x: 0, y: 0, zoom: 1 } };
    // replace the selected panel, else the first empty slot
    state.photos[state.selected] = slot;
    pushUndo();
    redraw();
    setStatus(`Photo added to panel ${state.selected + 1}.`);
  });
}

// --- panel picking ----------------------------------------------------------
function panelAt(cx, cy) {
  const r = canvas.getBoundingClientRect();
  const x = (cx - r.left) / r.width;
  const y = (cy - r.top) / r.height;
  const geo = layoutGeometry(state.layout, 1, 1);
  for (let i = geo.panels.length - 1; i >= 0; i--) {
    const p = geo.panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  state.selected = i;
  syncControls();
  const photo = state.photos[i];
  beginEdit();
  drag = { x: e.clientX, y: e.clientY, ox: photo?.crop?.x ?? 0, oy: photo?.crop?.y ?? 0, moved: false };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const photo = state.photos[state.selected];
  if (!photo) return;
  const dx = (e.clientX - drag.x) / r.width;
  const dy = (e.clientY - drag.y) / r.height;
  if (Math.abs(dx) + Math.abs(dy) > 0.005) drag.moved = true;
  photo.crop.x = Math.max(-0.5, Math.min(0.5, drag.ox + dx));
  photo.crop.y = Math.max(-0.5, Math.min(0.5, drag.oy + dy));
  redraw();
});
canvas.addEventListener('pointerup', () => {
  if (drag?.moved) endEdit();
  drag = null;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const photo = state.photos[state.selected];
  if (!photo) return;
  const z = photo.crop.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12);
  photo.crop.zoom = Math.max(1, Math.min(3, z));
  document.getElementById('zoom').value = photo.crop.zoom;
  redraw();
}, { passive: false });

// --- export -----------------------------------------------------------------
function renderAt(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  drawCover(c, state);
  return c;
}

export function exportSize(key) {
  const s = SIZES[key];
  const c = renderAt(s.w, s.h);
  c.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${s.w}x${s.h}.png`;
    a.click();
    setStatus(`Saved cover-${s.w}x${s.h}.png`);
  }, 'image/png');
}

export function exportAll() {
  for (const key of Object.keys(SIZES)) {
    setTimeout(() => exportSize(key), 150 * Object.keys(SIZES).indexOf(key));
  }
  setStatus('Exporting all three sizes…');
}

// --- controls ---------------------------------------------------------------
function fillSelect(id, entries, current) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '';
  for (const [key, v] of Object.entries(entries)) {
    const o = document.createElement('option');
    o.value = key;
    o.textContent = v.name;
    el.appendChild(o);
  }
  el.value = current;
}

function bindControls() {
  fillSelect('layout', LAYOUTS, state.layout);
  fillSelect('grade', GRADES, state.grade);
  fillSelect('size', SIZES, state.size);
  document.getElementById('layout').addEventListener('change', (e) => {
    pushUndo(); state.layout = e.target.value; state.selected = 0; syncControls(); redraw();
  });
  document.getElementById('grade').addEventListener('change', (e) => {
    pushUndo(); state.grade = e.target.value; redraw();
  });
  document.getElementById('size').addEventListener('change', (e) => {
    pushUndo(); state.size = e.target.value; redraw();
  });
  document.getElementById('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  document.getElementById('title').addEventListener('focus', beginEdit);
  document.getElementById('title').addEventListener('change', endEdit);
  document.getElementById('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  document.getElementById('subtitle').addEventListener('focus', beginEdit);
  document.getElementById('subtitle').addEventListener('change', endEdit);
  document.getElementById('badge').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
  document.getElementById('badge').addEventListener('focus', beginEdit);
  document.getElementById('badge').addEventListener('change', endEdit);
  document.getElementById('grain').addEventListener('change', (e) => { pushUndo(); state.grain = e.target.checked; redraw(); });
  document.getElementById('vignette').addEventListener('change', (e) => { pushUndo(); state.vignette = e.target.checked; redraw(); });
  document.getElementById('zoom').addEventListener('input', (e) => {
    const photo = state.photos[state.selected];
    if (!photo) return;
    photo.crop.zoom = Number(e.target.value);
    redraw();
  });
  document.getElementById('zoom').addEventListener('focus', beginEdit);
  document.getElementById('zoom').addEventListener('change', endEdit);
  document.getElementById('resetCrop').addEventListener('click', () => {
    const photo = state.photos[state.selected];
    if (!photo) return;
    pushUndo();
    photo.crop = { x: 0, y: 0, zoom: 1 };
    syncControls(); redraw();
  });
  document.getElementById('photos').addEventListener('change', async (e) => {
    for (const f of e.target.files) await assignPhoto(f);
    e.target.value = '';
  });
  document.getElementById('undo').addEventListener('click', undo);
  document.getElementById('redo').addEventListener('click', redo);
  document.getElementById('exportSquare').addEventListener('click', () => exportSize('square'));
  document.getElementById('exportPortrait').addEventListener('click', () => exportSize('portrait'));
  document.getElementById('exportWide').addEventListener('click', () => exportSize('wide'));
  document.getElementById('exportAll').addEventListener('click', exportAll);
}

// --- boot -------------------------------------------------------------------
async function boot() {
  bindControls();
  syncControls();
  updateUndoButtons();
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), state, redraw);
    return;
  }
  try {
    await document.fonts.load('16px Anton');
    await document.fonts.load('16px Pacifico');
  } catch { /* fonts fall back to system faces */ }
  await loadSamples();
  redraw();
}

boot();
