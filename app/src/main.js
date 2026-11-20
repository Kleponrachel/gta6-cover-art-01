// main.js — the atelier: the page around the cover forge.
//
// One Atelier owns the Design, its history and the canvas. Every edit runs
// through `commit()`, which snapshots the design (as JSON text) before the
// mutation so undo can restore it, then repaints and saves to localStorage.
// Typing and slider drags use `beginStroke()` / `finishStroke()` instead:
// one snapshot for the whole gesture, not one per keystroke.
//
// Crops are edited right on the poster: click a panel to select it, drag to
// pan its photo, scroll to zoom. `?shot=` hands the page to shots.js, which
// paints one fixed scene for screenshots.

import { CoverForge, COMPOSITIONS, COMPOSITION_NAMES, PALETTE_NAMES, loadPhoto } from './cover.js';
import { runScene } from './shots.js';

export const EXPORT_SIZES = [
  { label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
];

const SAMPLE_NAMES = ['pier', 'boulevard', 'sunset', 'neon', 'rooftop'];
const HISTORY_CAP = 30;
const STORAGE_KEY = 'vice-coast-cover-r4';

function freshDesign() {
  return {
    composition: 'hero',
    palette: 'sunset',
    headline: 'VICE CITY',
    tagline: 'a Leonida story',
    emblem: 'VI',
    shots: [],
    frames: {},
    grain: 0.6,
    shade: 0.6,
  };
}

function asJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function titleCase(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

class Atelier {
  constructor(doc) {
    this.doc = doc;
    this.forge = new CoverForge();
    this.poster = doc.querySelector('#poster');
    this.design = this.readSaved() ?? freshDesign();
    this.photos = [];
    this.undoStack = [];
    this.redoStack = [];
    this.selected = 0;
    this.dragging = null;
    this.strokeBefore = null;
    this.wireControls();
    this.wirePoster();
    this.wireDrop();
    this.paintTray();
    this.renderAll();
  }

  // -------------------------------------------------------------- saved work
  readSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const design = JSON.parse(raw);
      if (!design || typeof design !== 'object' || !Array.isArray(design.shots)) return null;
      return design;
    } catch {
      return null;
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.design));
    } catch {
      // Full or blocked storage: the poster keeps working in memory.
    }
  }

  // ------------------------------------------------------------------ history
  commit(label, mutate) {
    const before = asJson(this.design);
    mutate();
    this.undoStack.push({ label, design: before });
    if (this.undoStack.length > HISTORY_CAP) this.undoStack.shift();
    this.redoStack.length = 0;
    this.syncSteps();
    this.renderAll();
    this.save();
  }

  beginStroke() {
    if (!this.strokeBefore) this.strokeBefore = asJson(this.design);
  }

  finishStroke(label) {
    if (!this.strokeBefore) return;
    this.undoStack.push({ label, design: this.strokeBefore });
    this.strokeBefore = null;
    if (this.undoStack.length > HISTORY_CAP) this.undoStack.shift();
    this.redoStack.length = 0;
    this.syncSteps();
    this.renderAll();
    this.save();
  }

  stepBack() {
    if (!this.undoStack.length) return;
    this.redoStack.push(asJson(this.design));
    this.design = this.undoStack.pop().design;
    this.syncSteps();
    this.renderAll();
    this.save();
    this.refreshControls();
  }

  stepForward() {
    if (!this.redoStack.length) return;
    this.undoStack.push({ label: 'redo', design: asJson(this.design) });
    this.design = this.redoStack.pop();
    this.syncSteps();
    this.renderAll();
    this.save();
    this.refreshControls();
  }

  syncSteps() {
    const back = this.doc.querySelector('[data-action="undo"]');
    const fwd = this.doc.querySelector('[data-action="redo"]');
    if (back) back.disabled = this.undoStack.length === 0;
    if (fwd) fwd.disabled = this.redoStack.length === 0;
  }

  // ------------------------------------------------------------------- photos
  frameFor(cellIndex) {
    const frame = this.design.frames[cellIndex] ?? { shot: 0, zoom: 1, dx: 0, dy: 0 };
    this.design.frames[cellIndex] = frame;
    return frame;
  }

  resetFrames() {
    const plan = COMPOSITIONS[this.design.composition];
    this.design.frames = {};
    plan.cells.forEach((_, i) => {
      this.design.frames[i] = { shot: i % Math.max(1, this.photos.length), zoom: 1, dx: 0, dy: 0 };
    });
  }

  async setShots(urls) {
    const loaded = [];
    for (const url of urls.slice(0, 9)) {
      try {
        loaded.push(await loadPhoto(url));
      } catch {
        // One unreadable image never blocks the rest.
      }
    }
    this.photos = loaded;
    this.commit('photos', () => {
      this.design.shots = urls.slice(0, loaded.length);
      this.resetFrames();
    });
    this.selected = 0;
    this.paintTray();
  }

  loadSamples() {
    return this.setShots(SAMPLE_NAMES.map((name) => `samples/${name}.jpg`));
  }

  // ----------------------------------------------------------------- painting
  pickedSize() {
    const sel = this.doc.querySelector('#sizePick');
    return EXPORT_SIZES[Number(sel?.value ?? 0)] ?? EXPORT_SIZES[0];
  }

  renderAll() {
    const box = this.poster.parentElement.getBoundingClientRect();
    const side = Math.max(280, Math.min(box.width, box.height * 0.9));
    const size = this.pickedSize();
    this.poster.width = Math.round(side);
    this.poster.height = Math.round(side * (size.h / size.w));
    this.forge.forge(this.poster, this.design, this.photos);
    this.markSelected();
  }

  markSelected() {
    this.doc.querySelectorAll('.thumb').forEach((el, i) => {
      el.classList.toggle('is-picked', i === this.selected);
    });
  }

  paintTray() {
    const tray = this.doc.querySelector('#tray');
    if (!tray) return;
    tray.innerHTML = '';
    this.design.shots.forEach((url, i) => {
      const btn = this.doc.createElement('button');
      btn.type = 'button';
      btn.className = 'thumb';
      btn.title = `Photo ${i + 1} — click to use it in the selected panel`;
      const img = this.doc.createElement('img');
      img.src = url;
      img.alt = `Photo ${i + 1}`;
      btn.appendChild(img);
      btn.addEventListener('click', () => {
        this.commit('assign photo', () => {
          const frame = this.frameFor(this.selected);
          frame.shot = i;
        });
      });
      tray.appendChild(btn);
    });
    this.markSelected();
  }

  // ----------------------------------------------------------------- controls
  wireControls() {
    const doc = this.doc;
    const compSel = doc.querySelector('#composition');
    const palSel = doc.querySelector('#palette');
    compSel.innerHTML = COMPOSITION_NAMES.map(
      (name) => `<option value="${name}">${titleCase(name)}</option>`,
    ).join('');
    palSel.innerHTML = PALETTE_NAMES.map(
      (name) => `<option value="${name}">${titleCase(name)}</option>`,
    ).join('');
    compSel.value = this.design.composition;
    palSel.value = this.design.palette;
    doc.querySelector('#headline').value = this.design.headline;
    doc.querySelector('#tagline').value = this.design.tagline;
    doc.querySelector('#emblem').value = this.design.emblem;
    doc.querySelector('#grainAmt').value = String(this.design.grain * 100);
    doc.querySelector('#shadeAmt').value = String(this.design.shade * 100);
    doc.querySelector('#zoomAmt').value = '100';

    compSel.addEventListener('change', () => {
      this.commit('composition', () => {
        this.design.composition = compSel.value;
        this.resetFrames();
      });
      this.selected = 0;
    });
    palSel.addEventListener('change', () => {
      this.commit('palette', () => { this.design.palette = palSel.value; });
    });

    const textFields = [
      [doc.querySelector('#headline'), 'headline', 'headline'],
      [doc.querySelector('#tagline'), 'tagline', 'tagline'],
      [doc.querySelector('#emblem'), 'emblem', 'emblem'],
    ];
    for (const [el, key, label] of textFields) {
      el.addEventListener('focus', () => this.beginStroke());
      el.addEventListener('input', (e) => {
        this.design[key] = e.target.value;
        this.renderAll();
        this.save();
      });
      el.addEventListener('change', () => this.finishStroke(label));
    }

    const sliders = [
      [doc.querySelector('#grainAmt'), 'grain', 'grain'],
      [doc.querySelector('#shadeAmt'), 'shade', 'shade'],
    ];
    for (const [el, key, label] of sliders) {
      el.addEventListener('pointerdown', () => this.beginStroke());
      el.addEventListener('focus', () => this.beginStroke());
      el.addEventListener('input', (e) => {
        this.design[key] = Number(e.target.value) / 100;
        this.renderAll();
      });
      el.addEventListener('change', () => this.finishStroke(label));
    }

    const zoomEl = doc.querySelector('#zoomAmt');
    zoomEl.addEventListener('pointerdown', () => this.beginStroke());
    zoomEl.addEventListener('focus', () => this.beginStroke());
    zoomEl.addEventListener('input', (e) => {
      this.frameFor(this.selected).zoom = Number(e.target.value) / 100;
      this.renderAll();
    });
    zoomEl.addEventListener('change', () => this.finishStroke('zoom'));

    doc.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || btn.disabled) return;
      this.dispatch(btn.dataset.action);
    });
  }

  refreshControls() {
    const doc = this.doc;
    doc.querySelector('#composition').value = this.design.composition;
    doc.querySelector('#palette').value = this.design.palette;
    doc.querySelector('#headline').value = this.design.headline;
    doc.querySelector('#tagline').value = this.design.tagline;
    doc.querySelector('#emblem').value = this.design.emblem;
    doc.querySelector('#grainAmt').value = String(this.design.grain * 100);
    doc.querySelector('#shadeAmt').value = String(this.design.shade * 100);
    this.paintTray();
  }

  dispatch(action) {
    switch (action) {
      case 'undo': this.stepBack(); break;
      case 'redo': this.stepForward(); break;
      case 'samples': this.loadSamples(); break;
      case 'reset': {
        this.commit('reset crop', () => {
          const frame = this.frameFor(this.selected);
          frame.zoom = 1;
          frame.dx = 0;
          frame.dy = 0;
        });
        this.doc.querySelector('#zoomAmt').value = '100';
        break;
      }
      case 'export': this.downloadOne(this.pickedSize()); break;
      case 'export-all': this.downloadSet(); break;
      case 'shuffle': {
        this.commit('shuffle', () => {
          const comps = [...COMPOSITION_NAMES];
          const pals = [...PALETTE_NAMES];
          this.design.composition = comps[Math.floor(Math.random() * comps.length)];
          this.design.palette = pals[Math.floor(Math.random() * pals.length)];
        });
        this.doc.querySelector('#composition').value = this.design.composition;
        this.doc.querySelector('#palette').value = this.design.palette;
        break;
      }
      default: break;
    }
  }

  // ------------------------------------------------------------ poster pointer
  wirePoster() {
    const canvas = this.poster;
    canvas.addEventListener('pointerdown', (e) => {
      const cell = this.cellUnder(e);
      if (cell === null) return;
      this.selected = cell;
      this.markSelected();
      const frame = this.frameFor(cell);
      this.doc.querySelector('#zoomAmt').value = String(Math.round(frame.zoom * 100));
      this.dragging = { x: e.clientX, y: e.clientY, dx: frame.dx, dy: frame.dy };
      this.beginStroke();
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const frame = this.frameFor(this.selected);
      const plan = COMPOSITIONS[this.design.composition];
      const frac = plan.cells[this.selected];
      if (!frac) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = this.poster.width / rect.width;
      const cellW = frac[2] * this.poster.width;
      const cellH = frac[3] * this.poster.height;
      frame.dx = this.dragging.dx + ((e.clientX - this.dragging.x) * scaleX) / cellW;
      frame.dy = this.dragging.dy + ((e.clientY - this.dragging.y) * scaleX) / cellH;
      frame.dx = Math.max(-0.5, Math.min(0.5, frame.dx));
      frame.dy = Math.max(-0.5, Math.min(0.5, frame.dy));
      this.renderAll();
    });
    const endDrag = () => {
      if (this.dragging) {
        this.dragging = null;
        this.finishStroke('pan photo');
      }
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const frame = this.frameFor(this.selected);
      frame.zoom = Math.max(1, Math.min(4, frame.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
      this.doc.querySelector('#zoomAmt').value = String(Math.round(frame.zoom * 100));
      this.renderAll();
    }, { passive: false });
    window.addEventListener('resize', () => this.renderAll());
  }

  // Which composition cell is under a pointer event, in canvas pixels?
  cellUnder(e) {
    const plan = COMPOSITIONS[this.design.composition];
    const rect = this.poster.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * this.poster.width;
    const py = ((e.clientY - rect.top) / rect.height) * this.poster.height;
    for (let i = plan.cells.length - 1; i >= 0; i--) {
      const [fx, fy, fw, fh] = plan.cells[i];
      const x = fx * this.poster.width;
      const y = fy * this.poster.height;
      const w = fw * this.poster.width;
      const h = fh * this.poster.height;
      if (px >= x && px <= x + w && py >= y && py <= y + h) return i;
    }
    return null;
  }

  // --------------------------------------------------------------- file input
  wireDrop() {
    const input = this.doc.querySelector('#filePick');
    const drop = this.doc.querySelector('#drop');
    const takeFiles = async (files) => {
      const images = [...files].filter((f) => f.type.startsWith('image/'));
      if (!images.length) return;
      const urls = await Promise.all(images.map((f) => this.readFile(f)));
      await this.setShots([...this.design.shots, ...urls]);
    };
    input.addEventListener('change', async () => {
      await takeFiles(input.files);
      input.value = '';
    });
    drop.addEventListener('click', () => input.click());
    drop.addEventListener('dragover', (e) => {
      e.preventDefault();
      drop.classList.add('is-over');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
    drop.addEventListener('drop', async (e) => {
      e.preventDefault();
      drop.classList.remove('is-over');
      await takeFiles(e.dataTransfer.files);
    });
  }

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // ------------------------------------------------------------------ export
  async downloadOne(size) {
    const out = this.doc.createElement('canvas');
    out.width = size.w;
    out.height = size.h;
    this.forge.forge(out, this.design, this.photos);
    const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const a = this.doc.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-coast-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  async downloadSet() {
    for (const size of EXPORT_SIZES) {
      // eslint-disable-next-line no-await-in-loop
      await this.downloadOne(size);
    }
  }
}

// ------------------------------------------------------------------------ boot
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runScene(shot, params).catch((err) => {
    document.body.textContent = `shot failed: ${err.message}`;
  });
} else {
  const atelier = new Atelier(document);
  // Once the bundled fonts arrive, repaint so the lettering uses them.
  if (document.fonts) {
    Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Pacifico'),
    ]).then(() => atelier.renderAll()).catch(() => {});
  }
  // First visit: seed the press with the sample photos so it is never empty.
  if (!atelier.design.shots.length) atelier.loadSamples();
}
