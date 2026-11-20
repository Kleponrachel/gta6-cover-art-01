// ViceLine studio — the editor UI: state, undo/redo, photo picking, panning,
// export, and the ?shot= query mode the screenshots use. Runs offline; the
// only images it ever loads are the bundled samples or the user's own files.
import { LAYOUTS, GRADES, SAMPLES, EXPORT_SIZES, layoutById, gradeById, sampleById } from './presets.js';
import { renderCover, exportSizeById } from './engine.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// --- state ---------------------------------------------------------------
function defaultState() {
  return {
    layout: 'hero-split',
    grade: 'neon-sunset',
    caption: 'Sunset Heist',
    subline: 'Vice Coast',
    slots: ['beach', 'boulevard', 'pier', 'neon'],
    pans: {},
    halftone: true,
    grain: true,
  };
}

let state = defaultState();
let undoStack = [];
let redoStack = [];
let selectedPanel = 0;
let uploads = {}; // key -> HTMLImageElement (user photos, kept in memory only)
let images = {}; // sample id or upload key -> HTMLImageElement
let renders = 0;
let lastError = null;

function snapshot() {
  return JSON.parse(JSON.stringify(state));
}

function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
  syncUndoButtons();
}

function applyState(next) {
  state = next;
  render();
  syncControls();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  state = undoStack.pop();
  render();
  syncControls();
  syncUndoButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  state = redoStack.pop();
  render();
  syncControls();
  syncUndoButtons();
}

function syncUndoButtons() {
  const u = $('#undoBtn');
  const r = $('#redoBtn');
  if (u) u.disabled = undoStack.length === 0;
  if (r) r.disabled = redoStack.length === 0;
  const c = $('#undoCount');
  if (c) c.textContent = `${undoStack.length} step${undoStack.length === 1 ? '' : 's'}`;
}

// --- images --------------------------------------------------------------
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + src));
    img.src = src;
  });
}

async function loadSamples() {
  for (const s of SAMPLES) {
    try {
      images[s.id] = await loadImage(s.file);
    } catch (e) {
      lastError = String(e);
    }
  }
}

// --- rendering -----------------------------------------------------------
function render() {
  const canvas = $('#cover');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = exportSizeById('square');
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  try {
    renderCover(ctx, state, canvas.width, canvas.height, images);
    renders++;
  } catch (e) {
    lastError = String(e);
  }
}

// --- export --------------------------------------------------------------
async function exportAll() {
  const out = [];
  for (const size of EXPORT_SIZES) {
    const c = document.createElement('canvas');
    c.width = size.w;
    c.height = size.h;
    renderCover(c.getContext('2d'), state, size.w, size.h, images);
    const url = c.toDataURL('image/png');
    out.push({ id: size.id, w: size.w, h: size.h, url });
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-coast-${size.id}-${size.w}x${size.h}.png`;
    a.click();
  }
  return out;
}

// --- controls ------------------------------------------------------------
function syncControls() {
  const cap = $('#captionInput');
  if (cap && cap.value !== state.caption) cap.value = state.caption;
  const sub = $('#sublineInput');
  if (sub && sub.value !== state.subline) sub.value = state.subline;
  $$('.layout-btn').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  $$('.grade-btn').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  $$('.sample-btn').forEach((b) => b.classList.toggle('active', state.slots[selectedPanel] === b.dataset.sample));
  const ht = $('#halftoneToggle');
  if (ht) ht.checked = !!state.halftone;
  const gr = $('#grainToggle');
  if (gr) gr.checked = !!state.grain;
  const panelLabel = $('#panelLabel');
  if (panelLabel) {
    const layout = layoutById(state.layout);
    const panel = layout.panels[selectedPanel] || layout.panels[0];
    panelLabel.textContent = `Panel ${selectedPanel + 1} — ${panel ? panel.id : '—'} (click the cover to pick a panel)`;
  }
}

function buildPickers() {
  const layoutRow = $('#layoutRow');
  if (layoutRow) {
    layoutRow.innerHTML = '';
    for (const l of LAYOUTS) {
      const b = document.createElement('button');
      b.className = 'layout-btn';
      b.dataset.layout = l.id;
      b.type = 'button';
      b.innerHTML = `<b>${l.name}</b><span>${l.tag}</span>`;
      b.addEventListener('click', () => {
        if (state.layout === l.id) return;
        pushUndo();
        state.layout = l.id;
        selectedPanel = 0;
        render();
        syncControls();
      });
      layoutRow.appendChild(b);
    }
  }
  const gradeRow = $('#gradeRow');
  if (gradeRow) {
    gradeRow.innerHTML = '';
    for (const g of GRADES) {
      const b = document.createElement('button');
      b.className = 'grade-btn';
      b.dataset.grade = g.id;
      b.type = 'button';
      b.style.setProperty('--sw1', `rgb(${g.shadow.join(',')})`);
      b.style.setProperty('--sw2', `rgb(${g.mid.join(',')})`);
      b.style.setProperty('--sw3', `rgb(${g.light.join(',')})`);
      b.innerHTML = `<i></i><b>${g.name}</b><span>${g.tag}</span>`;
      b.addEventListener('click', () => {
        if (state.grade === g.id) return;
        pushUndo();
        state.grade = g.id;
        render();
        syncControls();
      });
      gradeRow.appendChild(b);
    }
  }
  const sampleRow = $('#sampleRow');
  if (sampleRow) {
    sampleRow.innerHTML = '';
    for (const s of SAMPLES) {
      const b = document.createElement('button');
      b.className = 'sample-btn';
      b.dataset.sample = s.id;
      b.type = 'button';
      b.innerHTML = `<img src="${s.file}" alt="${s.name}"><span>${s.name}</span>`;
      b.addEventListener('click', () => {
        pushUndo();
        state.slots[selectedPanel] = s.id;
        render();
        syncControls();
      });
      sampleRow.appendChild(b);
    }
  }
}

function bindInputs() {
  const cap = $('#captionInput');
  if (cap) cap.addEventListener('input', () => { state.caption = cap.value; render(); });
  cap.addEventListener('change', () => { pushUndo(); });
  const sub = $('#sublineInput');
  if (sub) sub.addEventListener('input', () => { state.subline = sub.value; render(); });
  sub.addEventListener('change', () => { pushUndo(); });
  const ht = $('#halftoneToggle');
  if (ht) ht.addEventListener('change', () => { pushUndo(); state.halftone = ht.checked; render(); });
  const gr = $('#grainToggle');
  if (gr) gr.addEventListener('change', () => { pushUndo(); state.grain = gr.checked; render(); });
  const up = $('#uploadInput');
  if (up) up.addEventListener('change', async () => {
    const file = up.files && up.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const key = 'upload-' + Date.now();
      try {
        const img = await loadImage(reader.result);
        uploads[key] = img;
        images[key] = img;
        pushUndo();
        state.slots[selectedPanel] = key;
        render();
        syncControls();
      } catch (e) {
        lastError = String(e);
      }
    };
    reader.readAsDataURL(file);
  });
  const u = $('#undoBtn');
  if (u) u.addEventListener('click', undo);
  const r = $('#redoBtn');
  if (r) r.addEventListener('click', redo);
  const ex = $('#exportBtn');
  if (ex) ex.addEventListener('click', () => { exportAll(); });
  const reset = $('#resetBtn');
  if (reset) reset.addEventListener('click', () => {
    pushUndo();
    state = defaultState();
    selectedPanel = 0;
    render();
    syncControls();
  });
  // Click the cover to pick a panel; drag to pan its photo.
  const canvas = $('#cover');
  if (canvas) {
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const fx = (e.clientX - rect.left) / rect.width;
      const fy = (e.clientY - rect.top) / rect.height;
      const layout = layoutById(state.layout);
      const idx = layout.panels.findIndex((p) => fx >= p.rect[0] && fx < p.rect[0] + p.rect[2] && fy >= p.rect[1] && fy < p.rect[1] + p.rect[3]);
      if (idx >= 0) {
        selectedPanel = idx;
        drag = { x: e.clientX, y: e.clientY, moved: false };
        syncControls();
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      if (!drag.moved) return;
      const layout = layoutById(state.layout);
      const panel = layout.panels[selectedPanel];
      if (!panel) return;
      const pan = state.pans[panel.id] || { fx: 0, fy: 0 };
      const rect = canvas.getBoundingClientRect();
      pan.fx = Math.max(-1, Math.min(1, pan.fx + dx / rect.width * 2));
      pan.fy = Math.max(-1, Math.min(1, pan.fy + dy / rect.height * 2));
      state.pans[panel.id] = pan;
      drag.x = e.clientX;
      drag.y = e.clientY;
      render();
    });
    canvas.addEventListener('pointerup', () => {
      if (drag && drag.moved) pushUndo();
      drag = null;
    });
  }
}

// --- ?shot= mode: deterministic states for screenshots -------------------
function applyShotParams() {
  const q = new URLSearchParams(location.search);
  if (!q.has('shot')) return;
  const photo = q.get('photo');
  const caption = q.get('caption');
  const layout = q.get('layout');
  const grade = q.get('grade');
  if (photo) {
    const s = sampleById(photo);
    state.slots = state.slots.map(() => s.id);
    state.slots[0] = s.id;
  }
  if (caption) state.caption = caption;
  if (layout) state.layout = layoutById(layout).id;
  if (grade) state.grade = gradeById(grade).id;
  const shot = q.get('shot');
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
  } else if (shot === 'editor') {
    document.body.classList.add('shot-editor');
  }
}

// Test hook: the smoke test reads these.
window.__viceline = {
  get state() { return state; },
  get renders() { return renders; },
  get lastError() { return lastError; },
  get undoDepth() { return undoStack.length; },
  undo, redo, exportAll,
  setCaption(t) { pushUndo(); state.caption = t; render(); syncControls(); },
};

async function boot() {
  buildPickers();
  bindInputs();
  await loadSamples();
  applyShotParams();
  render();
  syncControls();
  syncUndoButtons();
  document.body.classList.add('ready');
}

boot();
