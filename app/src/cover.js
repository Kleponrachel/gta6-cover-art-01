// cover.js — the poster press.
//
// A PosterPress turns a PosterSpec into GTA-style cover art on a canvas.
// The design is a print press, not a filter: a spec names a layout blueprint,
// a grade (a duotone ramp), lettering and a set of photos with per-panel crops,
// and the press lays the poster out, grades every panel, letters it and inks it.
//
//   PosterSpec = {
//     layout: 'hero' | 'quad' | 'nine' | 'bleed' | 'tilt' | 'strip',
//     grade:  'sunset' | 'neon' | 'vice' | 'noir' | 'heat' | 'palm',
//     title: string, subtitle: string,
//     badge: string,                       // small ribbon text, '' hides it
//     photos: string[],                    // image URLs / data URLs
//     crops: { [cellIndex]: { photo, zoom, ox, oy } },
//     grain: 0..1, vignette: 0..1,
//   }
//
// A crop: `photo` is the index into photos, `zoom` the magnification (1 = fit),
// `ox`/`oy` the pan of the photo centre in fractions of the photo (-0.5..0.5).

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- blueprints
// Every blueprint is a function of the poster size that returns the cells it
// needs plus where the lettering lives. Rects are { x, y, w, h, rot? } in px.
// The title zone is where the big title block goes; `badgeAt` is the ribbon.

function rect(x, y, w, h, rot = 0) {
  return { x, y, w, h, rot };
}

export const BLUEPRINTS = {
  // One hero photo on top, three strips along the foot.
  hero(w, h) {
    const gap = Math.round(w * 0.012);
    const foot = Math.round(h * 0.26);
    const stripW = (w - gap * 4) / 3;
    return {
      cells: [
        rect(gap, gap, w - gap * 2, h - foot - gap * 2),
        rect(gap, h - foot, stripW, foot - gap),
        rect(gap * 2 + stripW, h - foot, stripW, foot - gap),
        rect(gap * 3 + stripW * 2, h - foot, stripW, foot - gap),
      ],
      title: { x: gap, y: h * 0.06, w: w - gap * 2, h: h * 0.2, align: 'left' },
      badgeAt: { x: w - gap - w * 0.09, y: gap + w * 0.09 },
    };
  },
  // Four equal panels, title band across the bottom.
  quad(w, h) {
    const gap = Math.round(w * 0.012);
    const half = (w - gap * 3) / 2;
    const band = Math.round(h * 0.2);
    const cellH = (h - band - gap * 3) / 2;
    return {
      cells: [
        rect(gap, gap, half, cellH),
        rect(gap * 2 + half, gap, half, cellH),
        rect(gap, gap * 2 + cellH, half, cellH),
        rect(gap * 2 + half, gap * 2 + cellH, half, cellH),
      ],
      title: { x: gap, y: h - band, w: w - gap * 2, h: band - gap, align: 'center' },
      badgeAt: { x: w * 0.5, y: gap + cellH * 0.5 },
    };
  },
  // Nine panels; the middle one is the title block itself.
  nine(w, h) {
    const gap = Math.round(w * 0.01);
    const cw = (w - gap * 4) / 3;
    const ch = (h - gap * 4) / 3;
    const cells = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (r === 1 && c === 1) continue;
        cells.push(rect(gap + c * (cw + gap), gap + r * (ch + gap), cw, ch));
      }
    }
    return {
      cells,
      title: { x: gap + cw + gap, y: gap + ch + gap, w: cw, h: ch, align: 'center' },
      badgeAt: { x: w - gap - w * 0.07, y: h - gap - w * 0.07 },
    };
  },
  // One photo, edge to edge, lettering over the foot.
  bleed(w, h) {
    return {
      cells: [rect(0, 0, w, h)],
      title: { x: w * 0.05, y: h * 0.68, w: w * 0.9, h: h * 0.28, align: 'left' },
      badgeAt: { x: w * 0.86, y: h * 0.1 },
    };
  },
  // Three snapshots tossed on a coloured backdrop, slightly rotated.
  tilt(w, h) {
    const cw = w * 0.56;
    const ch = h * 0.42;
    return {
      cells: [
        rect(w * 0.06, h * 0.05, cw, ch, -0.06),
        rect(w * 0.36, h * 0.3, cw, ch, 0.05),
        rect(w * 0.1, h * 0.56, cw * 0.9, ch * 0.78, -0.03),
      ],
      title: { x: w * 0.55, y: h * 0.06, w: w * 0.4, h: h * 0.22, align: 'right' },
      badgeAt: { x: w * 0.12, y: h * 0.82 },
    };
  },
  // A tall story strip: one tall photo left, three stacked right.
  strip(w, h) {
    const gap = Math.round(w * 0.012);
    const leftW = Math.round(w * 0.55);
    const rightW = w - leftW - gap * 3;
    const rh = (h - gap * 4) / 3;
    return {
      cells: [
        rect(gap, gap, leftW, h - gap * 2),
        rect(gap * 2 + leftW, gap, rightW, rh),
        rect(gap * 2 + leftW, gap * 2 + rh, rightW, rh),
        rect(gap * 2 + leftW, gap * 3 + rh * 2, rightW, rh),
      ],
      title: { x: gap, y: h * 0.72, w: leftW, h: h * 0.24, align: 'left' },
      badgeAt: { x: gap + leftW - w * 0.08, y: gap + w * 0.08 },
    };
  },
};

export const LAYOUT_NAMES = Object.keys(BLUEPRINTS);

// -------------------------------------------------------------------- grades
// A grade is a duotone ramp: shadow, midtone and highlight colours. The press
// builds a 256-entry look-up table per grade and remaps each panel's pixels
// through it, which is what gives the poster its printed, neon-sunset feel.

export const GRADES = {
  sunset: { shadow: [26, 10, 46], mid: [214, 72, 48], high: [255, 214, 150] },
  neon: { shadow: [8, 10, 44], mid: [176, 38, 150], high: [150, 240, 255] },
  vice: { shadow: [6, 38, 44], mid: [220, 60, 130], high: [255, 220, 130] },
  noir: { shadow: [10, 10, 12], mid: [110, 108, 112], high: [245, 240, 232] },
  heat: { shadow: [46, 6, 8], mid: [228, 84, 20], high: [255, 232, 130] },
  palm: { shadow: [6, 40, 26], mid: [30, 160, 120], high: [210, 250, 190] },
};

export const GRADE_NAMES = Object.keys(GRADES);

const lutCache = new Map();
function gradeLut(name) {
  if (lutCache.has(name)) return lutCache.get(name);
  const g = GRADES[name] ?? GRADES.sunset;
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const a = t < 0.5 ? g.shadow : g.mid;
    const b = t < 0.5 ? g.mid : g.high;
    const f = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    for (let ch = 0; ch < 3; ch++) {
      lut[i * 3 + ch] = Math.round(a[ch] + (b[ch] - a[ch]) * f);
    }
  }
  lutCache.set(name, lut);
  return lut;
}

// --------------------------------------------------------------------- press
// The press owns two scratch canvases so it never allocates mid-render.

export class PosterPress {
  constructor() {
    this.scratch = document.createElement('canvas');
    this.noise = this.makeNoise();
  }

  makeNoise() {
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 160;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  // Grade an image's pixels in place on `canvas` (its own size).
  applyGrade(canvas, gradeName) {
    const ctx = canvas.getContext('2d');
    const { width: w, height: h } = canvas;
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const lut = gradeLut(gradeName);
    for (let i = 0; i < d.length; i += 4) {
      const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      d[i] = lut[lum * 3];
      d[i + 1] = lut[lum * 3 + 1];
      d[i + 2] = lut[lum * 3 + 2];
    }
    ctx.putImageData(img, 0, 0);
  }

  // Draw one photo into a cell, honouring its crop, then grade the result.
  paintCell(ctx, cell, photo, crop, gradeName) {
    const { x, y, w, h, rot } = cell;
    const pad = Math.max(2, Math.round(w * 0.008));
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    if (rot) ctx.rotate(rot);
    ctx.translate(-w / 2, -h / 2);
    // Photo on a scratch canvas at cell resolution, then graded, then placed.
    const s = this.scratch;
    const sw = Math.max(2, Math.round(w));
    const sh = Math.max(2, Math.round(h));
    if (s.width !== sw || s.height !== sh) {
      s.width = sw;
      s.height = sh;
    }
    const sctx = s.getContext('2d');
    sctx.fillStyle = '#1c1030';
    sctx.fillRect(0, 0, sw, sh);
    if (photo) {
      const zoom = crop?.zoom ?? 1;
      const scale = Math.max(sw / photo.naturalWidth, sh / photo.naturalHeight) * zoom;
      const pw = photo.naturalWidth * scale;
      const ph = photo.naturalHeight * scale;
      const cx = sw / 2 + (crop?.ox ?? 0) * pw;
      const cy = sh / 2 + (crop?.oy ?? 0) * ph;
      sctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
    }
    this.applyGrade(s, gradeName);
    ctx.drawImage(s, 0, 0, w, h);
    // Ink frame around the panel.
    ctx.strokeStyle = 'rgba(12, 6, 24, 0.9)';
    ctx.lineWidth = pad;
    ctx.strokeRect(pad / 2, pad / 2, w - pad, h - pad);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad + 1, pad + 1, w - pad * 2 - 2, h - pad * 2 - 2);
    ctx.restore();
  }

  // Halftone dots fading down across a band — the print-shop title block.
  paintHalftone(ctx, zone, colour) {
    const { x, y, w, h } = zone;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const step = Math.max(7, Math.round(w * 0.014));
    ctx.fillStyle = colour;
    for (let row = 0, yy = y + step / 2; yy < y + h; row++, yy += step) {
      const fade = 1 - (yy - y) / h;
      const r = Math.max(0.6, (step / 2) * fade * 0.9);
      for (let xx = x + step / 2 + (row % 2 ? step / 2 : 0); xx < x + w; xx += step) {
        ctx.beginPath();
        ctx.arc(xx, yy, r, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // The big title + script subtitle, fitted to the zone.
  paintLettering(ctx, zone, spec) {
    const { x, y, w, h, align } = zone;
    const title = (spec.title || 'VICE CITY').trim().toUpperCase();
    const sub = (spec.subtitle || '').trim();
    const pad = Math.round(w * 0.03);
    // Halftone band behind the title.
    const bandH = Math.round(h * 0.42);
    this.paintHalftone(ctx, { x, y: y + h - bandH, w, h: bandH }, 'rgba(255, 120, 90, 0.28)');
    // Title, sized to fit, sunset gradient fill.
    let size = Math.round(h * 0.34);
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    const tx = align === 'center' ? x + w / 2 : align === 'right' ? x + w - pad : x + pad;
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#ffe9a8');
    grad.addColorStop(0.45, '#ff9e4f');
    grad.addColorStop(1, '#ff3d7e');
    for (;;) {
      ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
      const lines = this.wrapTitle(ctx, title, w - pad * 2);
      const blockH = lines.length * size * 1.02;
      if (blockH <= h * 0.72 || size <= 14) {
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = size * 0.12;
        ctx.shadowOffsetY = size * 0.05;
        lines.forEach((line, i) => {
          ctx.fillText(line, tx, y + h * 0.62 - (lines.length - 1 - i) * size * 1.02);
        });
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        break;
      }
      size = Math.round(size * 0.9);
    }
    // Script subtitle under the title.
    if (sub) {
      const ss = Math.max(14, Math.round(h * 0.13));
      ctx.font = `${ss}px Pacifico, cursive`;
      ctx.fillStyle = '#fff6ea';
      ctx.shadowColor = 'rgba(255, 60, 140, 0.8)';
      ctx.shadowBlur = ss * 0.5;
      ctx.fillText(sub, tx, y + h * 0.94);
      ctx.shadowBlur = 0;
    }
  }

  // Split a title into as few lines as fit, preferring word breaks.
  wrapTitle(ctx, title, maxW) {
    const words = title.split(/\s+/);
    const lines = [];
    let cur = '';
    for (const word of words) {
      const next = cur ? `${cur} ${word}` : word;
      if (ctx.measureText(next).width <= maxW || !cur) {
        cur = next;
      } else {
        lines.push(cur);
        cur = word;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // A small rotated ribbon badge.
  paintBadge(ctx, at, text) {
    if (!text) return;
    const r = Math.max(26, Math.round(at.x * 0.06));
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(-0.28);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = '#ff2e7e';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffe9a8';
    ctx.stroke();
    ctx.fillStyle = '#fff6ea';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let fs = r * 0.42;
    ctx.font = `bold ${fs}px Anton, sans-serif`;
    while (ctx.measureText(text).width > r * 1.6 && fs > 8) {
      fs -= 1;
      ctx.font = `bold ${fs}px Anton, sans-serif`;
    }
    ctx.fillText(text.toUpperCase(), 0, 1);
    ctx.restore();
  }

  // Full poster render.
  render(canvas, spec, photos) {
    const ctx = canvas.getContext('2d');
    const { width: w, height: h } = canvas;
    const plan = BLUEPRINTS[spec.layout]?.(w, h) ?? BLUEPRINTS.hero(w, h);
    const grade = GRADES[spec.grade] ? spec.grade : 'sunset';
    // Backdrop.
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#160a2e');
    bg.addColorStop(1, '#2b0f38');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    // Panels.
    plan.cells.forEach((cell, i) => {
      const crop = spec.crops?.[i];
      const photo = crop ? photos[crop.photo] : photos[i];
      this.paintCell(ctx, cell, photo ?? null, crop ?? null, grade);
    });
    // Lettering + badge.
    this.paintLettering(ctx, plan.title, spec);
    this.paintBadge(ctx, plan.badgeAt, spec.badge || '');
    // Grain.
    const grain = spec.grain ?? 0.5;
    if (grain > 0) {
      ctx.save();
      ctx.globalAlpha = 0.16 * grain;
      const pat = ctx.createPattern(this.noise, 'repeat');
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    // Vignette.
    const vig = spec.vignette ?? 0.5;
    if (vig > 0) {
      const vg = ctx.createRadialGradient(
        w / 2, h / 2, Math.min(w, h) * 0.42,
        w / 2, h / 2, Math.max(w, h) * 0.75,
      );
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(8, 2, 16, ${0.5 * vig})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }
  }
}

// Load an image element from a URL / data URL.
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${String(src).slice(0, 60)}`));
    img.src = src;
  });
}
