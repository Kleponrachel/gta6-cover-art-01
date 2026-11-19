// main.js — the studio: wires the page to the poster press.
//
// State lives in one Studio object. Every change goes through `commit()`,
// which snapshots the spec (JSON) onto an undo stack, repaints, and saves the
// spec to localStorage. Crops are edited with a pointer tool on the canvas:
// click a panel to pick it, drag to pan its photo, wheel to zoom.
//
// A `?shot=` query hands control to shots.js instead (fixed screenshot scenes).

import { PosterPress, BLUEPRINTS, LAYOUT_NAMES, GRADE_NAMES, loadImage } from './cover.js';
import { runScene } from './shots.js';

export const EXPORT_SIZES = [
  { label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
];

const SAMPLES = ['pier', 'boulevard', 'sunset', 'neon', 'rooftop'];
const HISTORY_LIMIT = 30;

function defaultSpec() {
  return {
    layout: 'hero',
    grade: 'sunset',
    title: 'VICE CITY',
    subtitle: 'a Leonida story',
    badge: 'VI',
    photos: [],
    crops: {},
    grain: 0.6,
    vignette: 0.6,
  };
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

class Studio {
  constructor(root) {
    this.root = root;
    this.press = new PosterPress();
    this.canvas = root.querySelector('#stage');
    this.spec = this.restore() ?? defaultSpec();
    this.images = [];
    this.past = [];
    this.future = [];
    this.picked = 0;
    this.drag = null;
    this.bindControls();
    this.bindCanvas();
    this.bindFiles();
    this.paintThumbs();
    this.repaint();
  }

  // ------------------------------------------------------------ persistence
  restore() {
    try {
      const raw = localStorage.getItem('vice-coast-spec');
      if (!raw) return null;
      const spec = JSON.parse(raw);
      if (!spec || typeof spec !== 'object' || !Array.isArray(spec.photos)) return null;
      return spec;
    } catch {
      return null;
    }
  }

  persist() {
    try {
      localStorage.setItem('vice-coast-spec', JSON.stringify(this.spec));
    } catch {
      // Storage full or unavailable: the poster still works in memory.
    }
  }

  // --------------------------------------------------------------- history
  // Atomic change: snapshot the spec BEFORE fn() mutates it, so undo
  // restores the pre-change state.
  apply(label, fn) {
    const before = clone(this.spec);
    fn();
    this.past.push({ label, spec: before });
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future.length = 0;
    this.syncHistoryButtons();
    this.repaint();
    this.persist();
  }

  // Continuous edit (typing, sliders): snapshot once when the edit starts,
  // push it when the edit ends.
  beginEdit() {
    if (!this.editBefore) this.editBefore = clone(this.spec);
  }

  endEdit(label) {
    if (!this.editBefore) return;
    this.past.push({ label, spec: this.editBefore });
    this.editBefore = null;
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future.length = 0;
    this.syncHistoryButtons();
    this.repaint();
    this.persist();
  }

  undo() {
    if (!this.past.length) return;
    this.future.push(clone(this.spec));
    this.spec = this.past.pop().spec;
    this.syncHistoryButtons();
    this.repaint();
    this.persist();
    this.refreshControls();
  }

  redo() {
    if (!this.future.length) return;
    this.past.push({ label: 'redo', spec: clone(this.spec) });
    this.spec = this.future.pop();
    this.syncHistoryButtons();
    this.repaint();
    this.persist();
    this.refreshControls();
  }

  syncHistoryButtons() {
    const undoBtn = this.root.querySelector('[data-action="undo"]');
    const redoBtn = this.root.querySelector('[data-action="redo"]');
    if (undoBtn) undoBtn.disabled = this.past.length === 0;
    if (redoBtn) redoBtn.disabled = this.future.length === 0;
  }

  // ---------------------------------------------------------------- photos
  async setPhotos(urls) {
    const loaded = [];
    for (const url of urls.slice(0, 9)) {
      try {
        loaded.push(await loadImage(url));
      } catch {
        // Skip unreadable images; the rest still load.
      }
    }
    this.images = loaded;
    this.apply('photos', () => {
      this.spec.photos = urls.slice(0, loaded.length);
      // Rebuild crops so each panel points at a photo in order.
      const plan = BLUEPRINTS[this.spec.layout](1, 1);
      this.spec.crops = {};
      plan.cells.forEach((_, i) => {
        this.spec.crops[i] = { photo: i % Math.max(1, loaded.length), zoom: 1, ox: 0, oy: 0 };
      });
    });
    this.picked = 0;
    this.paintThumbs();
  }

  async loadSamples() {
    await this.setPhotos(SAMPLES.map((name) => `samples/${name}.jpg`));
  }

  // -------------------------------------------------------------- painting
  repaint() {
    const box = this.canvas.parentElement.getBoundingClientRect();
    const side = Math.max(280, Math.min(box.width, box.height * 0.9));
    const ratio = this.currentSize().h / this.currentSize().w;
    this.canvas.width = Math.round(side);
    this.canvas.height = Math.round(side * ratio);
    this.press.render(this.canvas, this.spec, this.images);
    this.highlightPicked();
  }

  currentSize() {
    const sel = this.root.querySelector('#export-size');
    const picked = EXPORT_SIZES[Number(sel?.value ?? 0)] ?? EXPORT_SIZES[0];
    return picked;
  }

  highlightPicked() {
    this.root.querySelectorAll('.thumb').forEach((el, i) => {
      el.classList.toggle('is-picked', i === this.picked);
    });
  }

  paintThumbs() {
    const tray = this.root.querySelector('#tray');
    if (!tray) return;
    tray.innerHTML = '';
    this.spec.photos.forEach((url, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'thumb';
      btn.dataset.photo = String(i);
      btn.title = `Photo ${i + 1} — click to use in the picked panel`;
      const img = document.createElement('img');
      img.src = url;
      img.alt = `Photo ${i + 1}`;
      btn.appendChild(img);
      btn.addEventListener('click', () => {
        this.apply('assign photo', () => {
          this.spec.crops[this.picked] = {
            ...(this.spec.crops[this.picked] ?? { zoom: 1, ox: 0, oy: 0 }),
            photo: i,
          };
        });
      });
      tray.appendChild(btn);
    });
    this.highlightPicked();
  }

  // -------------------------------------------------------------- controls
  bindControls() {
    const root = this.root;
    const layoutSel = root.querySelector('#layout');
    const gradeSel = root.querySelector('#grade');
    layoutSel.innerHTML = LAYOUT_NAMES.map(
      (name) => `<option value="${name}">${this.pretty(name)}</option>`,
    ).join('');
    gradeSel.innerHTML = GRADE_NAMES.map(
      (name) => `<option value="${name}">${this.pretty(name)}</option>`,
    ).join('');
    layoutSel.value = this.spec.layout;
    gradeSel.value = this.spec.grade;
    root.querySelector('#title').value = this.spec.title;
    root.querySelector('#subtitle').value = this.spec.subtitle;
    root.querySelector('#badge').value = this.spec.badge;
    root.querySelector('#grain').value = String(this.spec.grain * 100);
    root.querySelector('#vignette').value = String(this.spec.vignette * 100);
    root.querySelector('#zoom').value = '100';

    layoutSel.addEventListener('change', () => {
      this.apply('layout', () => {
        this.spec.layout = layoutSel.value;
        const plan = BLUEPRINTS[this.spec.layout](1, 1);
        this.spec.crops = {};
        plan.cells.forEach((_, i) => {
          this.spec.crops[i] = { photo: i % Math.max(1, this.images.length), zoom: 1, ox: 0, oy: 0 };
        });
      });
      this.picked = 0;
    });
    gradeSel.addEventListener('change', () => {
      this.apply('grade', () => { this.spec.grade = gradeSel.value; });
    });
    const titleEl = root.querySelector('#title');
    const subtitleEl = root.querySelector('#subtitle');
    const badgeEl = root.querySelector('#badge');
    for (const [el, key, label] of [[titleEl, 'title', 'title'], [subtitleEl, 'subtitle', 'subtitle'], [badgeEl, 'badge', 'badge']]) {
      el.addEventListener('focus', () => this.beginEdit());
      el.addEventListener('input', (e) => {
        this.spec[key] = e.target.value;
        this.repaint();
        this.persist();
      });
      el.addEventListener('change', () => this.endEdit(label));
    }
    const grainEl = root.querySelector('#grain');
    const vigEl = root.querySelector('#vignette');
    const zoomEl = root.querySelector('#zoom');
    for (const [el, key, label, scale] of [[grainEl, 'grain', 'grain', 100], [vigEl, 'vignette', 'vignette', 100]]) {
      el.addEventListener('pointerdown', () => this.beginEdit());
      el.addEventListener('focus', () => this.beginEdit());
      el.addEventListener('input', (e) => {
        this.spec[key] = Number(e.target.value) / scale;
        this.repaint();
      });
      el.addEventListener('change', () => this.endEdit(label));
    }
    zoomEl.addEventListener('pointerdown', () => this.beginEdit());
    zoomEl.addEventListener('focus', () => this.beginEdit());
    zoomEl.addEventListener('input', (e) => {
      const crop = this.cropOf(this.picked);
      crop.zoom = Number(e.target.value) / 100;
      this.repaint();
    });
    zoomEl.addEventListener('change', () => this.endEdit('zoom'));

    // One delegated handler for every button in the toolbar.
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || btn.disabled) return;
      this.act(btn.dataset.action);
    });
  }

  refreshControls() {
    const root = this.root;
    root.querySelector('#layout').value = this.spec.layout;
    root.querySelector('#grade').value = this.spec.grade;
    root.querySelector('#title').value = this.spec.title;
    root.querySelector('#subtitle').value = this.spec.subtitle;
    root.querySelector('#badge').value = this.spec.badge;
    root.querySelector('#grain').value = String(this.spec.grain * 100);
    root.querySelector('#vignette').value = String(this.spec.vignette * 100);
    this.paintThumbs();
  }

  pretty(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  cropOf(cellIndex) {
    const crop = this.spec.crops[cellIndex] ?? { photo: 0, zoom: 1, ox: 0, oy: 0 };
    this.spec.crops[cellIndex] = crop;
    return crop;
  }

  act(action) {
    switch (action) {
      case 'undo': this.undo(); break;
      case 'redo': this.redo(); break;
      case 'samples': this.loadSamples(); break;
      case 'reset-crop': {
        this.apply('reset crop', () => {
          const crop = this.cropOf(this.picked);
          crop.zoom = 1;
          crop.ox = 0;
          crop.oy = 0;
        });
        this.root.querySelector('#zoom').value = '100';
        break;
      }
      case 'export': this.exportOne(this.currentSize()); break;
      case 'export-all': this.exportAll(); break;
      case 'shuffle': {
        this.apply('shuffle', () => {
          const names = [...LAYOUT_NAMES];
          const grades = [...GRADE_NAMES];
          this.spec.layout = names[Math.floor(Math.random() * names.length)];
          this.spec.grade = grades[Math.floor(Math.random() * grades.length)];
        });
        this.root.querySelector('#layout').value = this.spec.layout;
        this.root.querySelector('#grade').value = this.spec.grade;
        break;
      }
      default: break;
    }
  }

  // ------------------------------------------------------------- canvas tool
  bindCanvas() {
    const canvas = this.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      const cell = this.cellAt(e);
      if (cell === null) return;
      this.picked = cell;
      this.highlightPicked();
      const crop = this.cropOf(cell);
      this.root.querySelector('#zoom').value = String(Math.round(crop.zoom * 100));
      this.drag = { x: e.clientX, y: e.clientY, ox: crop.ox, oy: crop.oy };
      this.beginEdit();
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      const crop = this.cropOf(this.picked);
      const plan = BLUEPRINTS[this.spec.layout](this.canvas.width, this.canvas.height);
      const cell = plan.cells[this.picked];
      if (!cell) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      crop.ox = this.drag.ox + ((e.clientX - this.drag.x) * scaleX) / cell.w;
      crop.oy = this.drag.oy + ((e.clientY - this.drag.y) * scaleX) / cell.h;
      crop.ox = Math.max(-0.5, Math.min(0.5, crop.ox));
      crop.oy = Math.max(-0.5, Math.min(0.5, crop.oy));
      this.repaint();
    });
    const endDrag = () => {
      if (this.drag) {
        this.drag = null;
        this.endEdit('pan photo');
      }
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const crop = this.cropOf(this.picked);
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      crop.zoom = Math.max(1, Math.min(4, crop.zoom * factor));
      this.root.querySelector('#zoom').value = String(Math.round(crop.zoom * 100));
      this.repaint();
    }, { passive: false });
    window.addEventListener('resize', () => this.repaint());
  }

  // Which blueprint cell sits under a pointer event (canvas coordinates)?
  cellAt(e) {
    const plan = BLUEPRINTS[this.spec.layout](this.canvas.width, this.canvas.height);
    const rect = this.canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
    const py = ((e.clientY - rect.top) / rect.height) * this.canvas.height;
    for (let i = plan.cells.length - 1; i >= 0; i--) {
      const c = plan.cells[i];
      if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) return i;
    }
    return null;
  }

  // -------------------------------------------------------------- file input
  bindFiles() {
    const input = this.root.querySelector('#file-input');
    const dropzone = this.root.querySelector('#dropzone');
    input.addEventListener('change', async () => {
      const files = [...input.files].filter((f) => f.type.startsWith('image/'));
      if (!files.length) return;
      const urls = await Promise.all(files.map((f) => this.readAsUrl(f)));
      await this.setPhotos([...this.spec.photos, ...urls]);
      input.value = '';
    });
    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('is-over');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-over'));
    dropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-over');
      const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
      if (!files.length) return;
      const urls = await Promise.all(files.map((f) => this.readAsUrl(f)));
      await this.setPhotos([...this.spec.photos, ...urls]);
    });
  }

  readAsUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------------------- export
  async exportOne(size) {
    const out = document.createElement('canvas');
    out.width = size.w;
    out.height = size.h;
    this.press.render(out, this.spec, this.images);
    const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-coast-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  async exportAll() {
    for (const size of EXPORT_SIZES) {
      // eslint-disable-next-line no-await-in-loop
      await this.exportOne(size);
    }
  }
}

// --------------------------------------------------------------------- boot
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runScene(shot, params).catch((err) => {
    document.body.textContent = `shot failed: ${err.message}`;
  });
} else {
  const studio = new Studio(document);
  // Load the bundled fonts, then repaint so the lettering uses them.
  if (document.fonts) {
    Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Pacifico'),
    ]).then(() => studio.repaint()).catch(() => {});
  }
  // First visit: start with the sample photos so the press is never empty.
  if (!studio.spec.photos.length) studio.loadSamples();
}
