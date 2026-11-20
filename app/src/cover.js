// cover.js — the cover forge.
//
// Vice Coast Cover Studio presses a Design into a finished poster on a
// canvas. A Design is plain data, so the whole poster is reproducible from
// one JSON object:
//
//   Design = {
//     composition: 'hero' | 'quad' | 'nine' | 'bleed' | 'tilt' | 'strip',
//     palette:     'sunset' | 'neon' | 'vice' | 'noir' | 'heat' | 'palm',
//     headline: string,          // big block capitals across the poster
//     tagline: string,           // script line underneath the headline
//     emblem: string,            // short ribbon text; '' hides the ribbon
//     shots: string[],           // photo URLs / data URLs, in tray order
//     frames: { [cell]: { shot, zoom, dx, dy } },
//     grain: 0..1,                // film grain strength
//     shade: 0..1,                // vignette strength
//   }
//
// A frame says which photo a panel shows and how it is cropped: `shot` is
// the index into shots, `zoom` the magnification (1 fits the panel), and
// `dx`/`dy` pan the photo centre as fractions of the photo (-0.5..0.5).
//
// Compositions are tables of fractions, not code: every panel, the headline
// zone and the emblem anchor are [x, y, w, h] in units of the poster size,
// so the same table lays out a 400px preview and a 1920px export.

const TAU = Math.PI * 2;

// ------------------------------------------------------------- compositions
// cells: [x, y, w, h, tilt?] — tilt in radians, clockwise positive.
// headline: the zone the big lettering is fitted into.
// emblem: the [x, y] anchor of the ribbon badge.

export const COMPOSITIONS = {
  hero: {
    cells: [
      [0.012, 0.012, 0.976, 0.716],
      [0.012, 0.74, 0.3173, 0.248],
      [0.3413, 0.74, 0.3173, 0.248],
      [0.6707, 0.74, 0.3173, 0.248],
    ],
    headline: { x: 0.012, y: 0.06, w: 0.976, h: 0.2, align: 'left' },
    emblem: [0.898, 0.102],
  },
  quad: {
    cells: [
      [0.012, 0.012, 0.482, 0.382],
      [0.506, 0.012, 0.482, 0.382],
      [0.012, 0.406, 0.482, 0.382],
      [0.506, 0.406, 0.482, 0.382],
    ],
    headline: { x: 0.012, y: 0.8, w: 0.976, h: 0.188, align: 'center' },
    emblem: [0.5, 0.203],
  },
  nine: {
    cells: [
      [0.01, 0.01, 0.32, 0.32],
      [0.34, 0.01, 0.32, 0.32],
      [0.67, 0.01, 0.32, 0.32],
      [0.01, 0.34, 0.32, 0.32],
      [0.67, 0.34, 0.32, 0.32],
      [0.01, 0.67, 0.32, 0.32],
      [0.34, 0.67, 0.32, 0.32],
      [0.67, 0.67, 0.32, 0.32],
    ],
    headline: { x: 0.34, y: 0.34, w: 0.32, h: 0.32, align: 'center' },
    emblem: [0.92, 0.92],
  },
  bleed: {
    cells: [[0, 0, 1, 1]],
    headline: { x: 0.05, y: 0.68, w: 0.9, h: 0.28, align: 'left' },
    emblem: [0.86, 0.1],
  },
  tilt: {
    cells: [
      [0.06, 0.05, 0.56, 0.42, -0.06],
      [0.36, 0.3, 0.56, 0.42, 0.05],
      [0.1, 0.56, 0.504, 0.3276, -0.03],
    ],
    headline: { x: 0.55, y: 0.06, w: 0.4, h: 0.22, align: 'right' },
    emblem: [0.12, 0.82],
  },
  strip: {
    cells: [
      [0.012, 0.012, 0.55, 0.976],
      [0.574, 0.012, 0.414, 0.3173],
      [0.574, 0.3413, 0.414, 0.3173],
      [0.574, 0.6707, 0.414, 0.3173],
    ],
    headline: { x: 0.012, y: 0.72, w: 0.55, h: 0.24, align: 'left' },
    emblem: [0.482, 0.092],
  },
};

export const COMPOSITION_NAMES = Object.keys(COMPOSITIONS);

// Scale a composition table to concrete pixels for a poster of size w x h.
export function planFor(name, w, h) {
  const table = COMPOSITIONS[name] ?? COMPOSITIONS.hero;
  const cells = table.cells.map(([fx, fy, fw, fh, tilt = 0]) => ({
    x: fx * w,
    y: fy * h,
    w: fw * w,
    h: fh * h,
    tilt,
  }));
  const z = table.headline;
  return {
    cells,
    headline: { x: z.x * w, y: z.y * h, w: z.w * w, h: z.h * h, align: z.align },
    emblem: { x: table.emblem[0] * w, y: table.emblem[1] * h },
  };
}

// ----------------------------------------------------------------- palettes
// A palette is a gradient-map ramp: [stop, r, g, b] control points from
// shadow (0) to highlight (1). The forge turns it into a 256-entry table
// and remaps every panel's luminance through it, which is what makes the
// poster look printed instead of filtered.

export const PALETTES = {
  sunset: [[0, 26, 10, 46], [0.5, 214, 72, 48], [1, 255, 214, 150]],
  neon: [[0, 8, 10, 44], [0.5, 176, 38, 150], [1, 150, 240, 255]],
  vice: [[0, 6, 38, 44], [0.5, 220, 60, 130], [1, 255, 220, 130]],
  noir: [[0, 10, 10, 12], [0.5, 110, 108, 112], [1, 245, 240, 232]],
  heat: [[0, 46, 6, 8], [0.5, 228, 84, 20], [1, 255, 232, 130]],
  palm: [[0, 6, 40, 26], [0.5, 30, 160, 120], [1, 210, 250, 190]],
};

export const PALETTE_NAMES = Object.keys(PALETTES);

const rampCache = new Map();

function rampFor(name) {
  const cached = rampCache.get(name);
  if (cached) return cached;
  const stops = PALETTES[name] ?? PALETTES.sunset;
  const ramp = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        a = stops[s];
        b = stops[s + 1];
        break;
      }
    }
    const span = b[0] - a[0] || 1;
    const f = Math.max(0, Math.min(1, (t - a[0]) / span));
    ramp[i * 3] = Math.round(a[1] + (b[1] - a[1]) * f);
    ramp[i * 3 + 1] = Math.round(a[2] + (b[2] - a[2]) * f);
    ramp[i * 3 + 2] = Math.round(a[3] + (b[3] - a[3]) * f);
  }
  rampCache.set(name, ramp);
  return ramp;
}

// --------------------------------------------------------------------- forge
// The forge keeps one scratch canvas and one speckle tile so a render never
// allocates in the hot loop.

export class CoverForge {
  constructor() {
    this.scratch = document.createElement('canvas');
    this.speckle = this.buildSpeckle();
  }

  buildSpeckle() {
    const tile = document.createElement('canvas');
    tile.width = 128;
    tile.height = 128;
    const g = tile.getContext('2d');
    const pixels = g.createImageData(128, 128);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      pixels.data[i] = v;
      pixels.data[i + 1] = v;
      pixels.data[i + 2] = v;
      pixels.data[i + 3] = 255;
    }
    g.putImageData(pixels, 0, 0);
    return tile;
  }

  // Remap a canvas's pixels through a palette ramp, in place.
  gradeInto(canvas, paletteName) {
    const g = canvas.getContext('2d');
    const { width, height } = canvas;
    const shot = g.getImageData(0, 0, width, height);
    const d = shot.data;
    const ramp = rampFor(paletteName);
    for (let i = 0; i < d.length; i += 4) {
      const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      d[i] = ramp[lum * 3];
      d[i + 1] = ramp[lum * 3 + 1];
      d[i + 2] = ramp[lum * 3 + 2];
    }
    g.putImageData(shot, 0, 0);
  }

  // One photo panel: draw the photo onto the scratch canvas at panel size,
  // grade it, stamp it into place (with its tilt), then ink the frame.
  drawPanel(g, cell, photo, frame, paletteName) {
    const { x, y, w, h, tilt } = cell;
    const edge = Math.max(2, Math.round(w * 0.008));
    g.save();
    g.translate(x + w / 2, y + h / 2);
    if (tilt) g.rotate(tilt);
    g.translate(-w / 2, -h / 2);
    const s = this.scratch;
    const sw = Math.max(2, Math.round(w));
    const sh = Math.max(2, Math.round(h));
    if (s.width !== sw || s.height !== sh) {
      s.width = sw;
      s.height = sh;
    }
    const sg = s.getContext('2d');
    sg.fillStyle = '#1c1030';
    sg.fillRect(0, 0, sw, sh);
    if (photo) {
      const zoom = frame?.zoom ?? 1;
      const scale = Math.max(sw / photo.naturalWidth, sh / photo.naturalHeight) * zoom;
      const pw = photo.naturalWidth * scale;
      const ph = photo.naturalHeight * scale;
      const cx = sw / 2 + (frame?.dx ?? 0) * pw;
      const cy = sh / 2 + (frame?.dy ?? 0) * ph;
      sg.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
    }
    this.gradeInto(s, paletteName);
    g.drawImage(s, 0, 0, w, h);
    g.strokeStyle = 'rgba(12, 6, 24, 0.9)';
    g.lineWidth = edge;
    g.strokeRect(edge / 2, edge / 2, w - edge, h - edge);
    g.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    g.lineWidth = 1;
    g.strokeRect(edge + 1, edge + 1, w - edge * 2 - 2, h - edge * 2 - 2);
    g.restore();
  }

  // Rows of halftone dots that shrink toward the bottom of a zone.
  drawDots(g, zone, colour) {
    const { x, y, w, h } = zone;
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    const step = Math.max(7, Math.round(w * 0.014));
    g.fillStyle = colour;
    let row = 0;
    for (let yy = y + step / 2; yy < y + h; row++, yy += step) {
      const fade = 1 - (yy - y) / h;
      const r = Math.max(0.6, (step / 2) * fade * 0.9);
      const offset = row % 2 ? step / 2 : 0;
      for (let xx = x + step / 2 + offset; xx < x + w; xx += step) {
        g.beginPath();
        g.arc(xx, yy, r, 0, TAU);
        g.fill();
      }
    }
    g.restore();
  }

  // Break a headline into lines that fit maxW, preferring word boundaries.
  breakLines(g, headline, maxW) {
    const words = headline.split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    for (const word of words) {
      const trial = current ? `${current} ${word}` : word;
      if (g.measureText(trial).width <= maxW || !current) {
        current = trial;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  }

  // The headline block: halftone band, gradient capitals, script tagline.
  drawHeadline(g, zone, design) {
    const { x, y, w, h, align } = zone;
    const headline = (design.headline || 'VICE CITY').trim().toUpperCase();
    const tagline = (design.tagline || '').trim();
    const pad = Math.round(w * 0.03);
    const bandH = Math.round(h * 0.42);
    this.drawDots(g, { x, y: y + h - bandH, w, h: bandH }, 'rgba(255, 120, 90, 0.28)');
    const tx = align === 'center' ? x + w / 2 : align === 'right' ? x + w - pad : x + pad;
    const wash = g.createLinearGradient(x, y, x + w, y + h);
    wash.addColorStop(0, '#ffe9a8');
    wash.addColorStop(0.45, '#ff9e4f');
    wash.addColorStop(1, '#ff3d7e');
    let size = Math.round(h * 0.34);
    let lines = [];
    g.textAlign = align;
    g.textBaseline = 'alphabetic';
    for (;;) {
      g.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
      lines = this.breakLines(g, headline, w - pad * 2);
      if (lines.length * size * 1.02 <= h * 0.72 || size <= 14) break;
      size = Math.round(size * 0.92);
    }
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(20, 4, 32, 0.55)';
    g.lineWidth = Math.max(1, size * 0.06);
    g.fillStyle = wash;
    g.shadowColor = 'rgba(0,0,0,0.55)';
    g.shadowBlur = size * 0.12;
    g.shadowOffsetY = size * 0.05;
    lines.forEach((line, i) => {
      const ly = y + h * 0.62 - (lines.length - 1 - i) * size * 1.02;
      g.strokeText(line, tx, ly);
      g.fillText(line, tx, ly);
    });
    g.shadowBlur = 0;
    g.shadowOffsetY = 0;
    if (tagline) {
      const ts = Math.max(14, Math.round(h * 0.13));
      g.font = `${ts}px Pacifico, cursive`;
      g.fillStyle = '#fff6ea';
      g.shadowColor = 'rgba(255, 60, 140, 0.8)';
      g.shadowBlur = ts * 0.5;
      g.fillText(tagline, tx, y + h * 0.94);
      g.shadowBlur = 0;
    }
  }

  // A tilted circular ribbon with the emblem text.
  drawEmblem(g, at, text) {
    if (!text) return;
    const r = Math.max(26, Math.round(at.x * 0.06));
    g.save();
    g.translate(at.x, at.y);
    g.rotate(-0.28);
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.fillStyle = '#ff2e7e';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#ffe9a8';
    g.stroke();
    g.fillStyle = '#fff6ea';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let fs = r * 0.42;
    const label = text.toUpperCase();
    g.font = `bold ${fs}px Anton, sans-serif`;
    while (g.measureText(label).width > r * 1.6 && fs > 8) {
      fs -= 1;
      g.font = `bold ${fs}px Anton, sans-serif`;
    }
    g.fillText(label, 0, 1);
    g.restore();
  }

  // Press the whole poster: backdrop, panels, lettering, emblem, finish.
  forge(canvas, design, images) {
    const g = canvas.getContext('2d');
    const { width: w, height: h } = canvas;
    const plan = planFor(design.composition, w, h);
    const palette = PALETTES[design.palette] ? design.palette : 'sunset';
    const back = g.createLinearGradient(0, 0, w, h);
    back.addColorStop(0, '#160a2e');
    back.addColorStop(1, '#2b0f38');
    g.fillStyle = back;
    g.fillRect(0, 0, w, h);
    plan.cells.forEach((cell, i) => {
      const frame = design.frames?.[i];
      const photo = frame ? images[frame.shot] : images[i];
      this.drawPanel(g, cell, photo ?? null, frame ?? null, palette);
    });
    this.drawHeadline(g, plan.headline, design);
    this.drawEmblem(g, plan.emblem, design.emblem || '');
    const grain = design.grain ?? 0.5;
    if (grain > 0) {
      g.save();
      g.globalAlpha = 0.16 * grain;
      g.fillStyle = g.createPattern(this.speckle, 'repeat');
      g.fillRect(0, 0, w, h);
      g.restore();
    }
    const shade = design.shade ?? 0.5;
    if (shade > 0) {
      const vg = g.createRadialGradient(
        w / 2, h / 2, Math.min(w, h) * 0.42,
        w / 2, h / 2, Math.max(w, h) * 0.75,
      );
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(8, 2, 16, ${0.5 * shade})`);
      g.fillStyle = vg;
      g.fillRect(0, 0, w, h);
    }
  }
}

// Load one <img> from a URL or data URL.
export function loadPhoto(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${String(src).slice(0, 60)}`));
    img.src = src;
  });
}
