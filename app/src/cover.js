// Vice Coast Cover Studio — the cover engine.
// Draws a GTA-style multi-panel cover on a 2D canvas: photo panels in one of
// six layouts, a gradient-map grade, Anton title lettering with a Pacifico
// neon-script subtitle, halftone title block, poster ink, grain and vignette.
// Everything is drawn, no network, no image model: the app's own art.

export const LAYOUTS = {
  hero3: { name: 'Hero + 3', panels: 4 },
  grid4: { name: 'Four-Panel Grid', panels: 4 },
  grid9: { name: 'Nine-Panel Grid', panels: 8 },
  full: { name: 'Full Bleed', panels: 1 },
  tilt: { name: 'Tilted Snapshots', panels: 3 },
  strip: { name: 'Story Strip', panels: 3 },
};

export const GRADES = {
  sunset: { name: 'Sunset', stops: [[0, '#ff7a3c'], [0.55, '#e8447c'], [1, '#5b2a86']] },
  neon: { name: 'Neon', stops: [[0, '#ff4fd8'], [0.5, '#7a3cff'], [1, '#19e3ff']] },
  vice: { name: 'Vice', stops: [[0, '#b04dff'], [0.55, '#ff2e88'], [1, '#ff9a3c']] },
  noir: { name: 'Noir', stops: [[0, '#ffffff'], [1, '#111111']] },
  heat: { name: 'Heat', stops: [[0, '#ffd23c'], [0.5, '#ff5a2e'], [1, '#a31212']] },
  palm: { name: 'Palm', stops: [[0, '#19e3c2'], [0.55, '#0e7a6b'], [1, '#ffb13c']] },
};

export const SIZES = {
  square: { name: 'Square post', w: 1080, h: 1080 },
  portrait: { name: 'Portrait post', w: 1080, h: 1350 },
  wide: { name: 'Wide post', w: 1920, h: 1080 },
};

const INK = '#14101c';

// --- layout geometry -------------------------------------------------------
// Returns { panels: [{x,y,w,h,rot}], title: {x,y,w,h,mode} } in 0..1 coords.
export function layoutGeometry(layout, w, h) {
  const sq = w / h; // aspect helper is unused; rects are normalized
  void sq;
  switch (layout) {
    case 'hero3':
      return {
        panels: [
          { x: 0, y: 0, w: 1, h: 0.56, rot: 0 },
          { x: 0, y: 0.58, w: 1 / 3, h: 0.26, rot: 0 },
          { x: 1 / 3, y: 0.58, w: 1 / 3, h: 0.26, rot: 0 },
          { x: 2 / 3, y: 0.58, w: 1 / 3, h: 0.26, rot: 0 },
        ],
        title: { x: 0, y: 0.84, w: 1, h: 0.16, mode: 'band' },
      };
    case 'grid4':
      return {
        panels: [
          { x: 0, y: 0, w: 0.5, h: 0.42, rot: 0 },
          { x: 0.5, y: 0, w: 0.5, h: 0.42, rot: 0 },
          { x: 0, y: 0.42, w: 0.5, h: 0.42, rot: 0 },
          { x: 0.5, y: 0.42, w: 0.5, h: 0.42, rot: 0 },
        ],
        title: { x: 0, y: 0.84, w: 1, h: 0.16, mode: 'band' },
      };
    case 'grid9': {
      const cells = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (r === 1 && c === 1) continue; // center cell is the title block
          cells.push({ x: c / 3, y: r / 3, w: 1 / 3, h: 1 / 3, rot: 0 });
        }
      }
      return { panels: cells, title: { x: 1 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3, mode: 'cell' } };
    }
    case 'full':
      return {
        panels: [{ x: 0, y: 0, w: 1, h: 1, rot: 0 }],
        title: { x: 0, y: 0.78, w: 1, h: 0.22, mode: 'overlay' },
      };
    case 'tilt':
      return {
        panels: [
          { x: 0.06, y: 0.20, w: 0.38, h: 0.62, rot: -0.07 },
          { x: 0.32, y: 0.15, w: 0.38, h: 0.67, rot: 0.03 },
          { x: 0.58, y: 0.22, w: 0.38, h: 0.60, rot: 0.08 },
        ],
        title: { x: 0, y: 0.02, w: 1, h: 0.13, mode: 'top' },
        footer: { x: 0, y: 0.90, w: 1, h: 0.08 },
      };
    case 'strip':
      return {
        panels: [
          { x: 0, y: 0, w: 1 / 3, h: 0.82, rot: 0 },
          { x: 1 / 3, y: 0, w: 1 / 3, h: 0.82, rot: 0 },
          { x: 2 / 3, y: 0, w: 1 / 3, h: 0.82, rot: 0 },
        ],
        title: { x: 0, y: 0.82, w: 1, h: 0.18, mode: 'band' },
      };
    default:
      return layoutGeometry('hero3', w, h);
  }
}

// --- photo drawing ---------------------------------------------------------
// Draws img into rect with cover-fit, then pan (px,py in -0.5..0.5) and zoom.
function drawPhoto(ctx, img, rect, crop) {
  const { x, y, w, h } = rect;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const zoom = crop?.zoom ?? 1;
  const px = crop?.x ?? 0;
  const py = crop?.y ?? 0;
  const base = Math.max(w / iw, h / ih) * zoom;
  const pw = iw * base;
  const ph = ih * base;
  // clamp the pan so the photo always covers the panel: the shift can never
  // exceed the overflow on that axis (otherwise a gap shows through)
  const maxDx = Math.max(0, (pw - w) / 2);
  const maxDy = Math.max(0, (ph - h) / 2);
  const ox = Math.max(-maxDx, Math.min(maxDx, px * pw * 0.4));
  const oy = Math.max(-maxDy, Math.min(maxDy, py * ph * 0.4));
  const dx = x + (w - pw) / 2 + ox;
  const dy = y + (h - ph) / 2 + oy;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.restore();
}

// Applies the grade inside rect {x,y,w,h} (gradients are in rect coordinates).
function applyGrade(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  const g = GRADES[grade] ?? GRADES.sunset;
  if (grade === 'noir') {
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#808080';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    const c = ctx.createLinearGradient(x, y, x + w, y + h);
    c.addColorStop(0, 'rgba(255,255,255,0.10)');
    c.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    return;
  }
  const grad = ctx.createLinearGradient(x, y, x + w * 0.7, y + h);
  g.stops.forEach(([pos, col]) => grad.addColorStop(pos, col));
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // warm foot tint, the sunset rising from the bottom
  const foot = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h);
  foot.addColorStop(0, 'rgba(255,110,70,0)');
  foot.addColorStop(1, 'rgba(255,60,120,0.28)');
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = foot;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// --- halftone + grain + vignette -------------------------------------------
let grainPattern = null;
function getGrain(ctx) {
  if (grainPattern) return grainPattern;
  const n = document.createElement('canvas');
  n.width = 140; n.height = 140;
  const nctx = n.getContext('2d');
  const data = nctx.createImageData(140, 140);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 118 + Math.floor(Math.random() * 40);
    data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 255;
  }
  nctx.putImageData(data, 0, 0);
  grainPattern = ctx.createPattern(n, 'repeat');
  return grainPattern;
}

function halftone(ctx, x, y, w, h, dot, gap, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let yy = y + gap; yy < y + h - gap / 2; yy += gap) {
    for (let xx = x + gap; xx < x + w - gap / 2; xx += gap) {
      ctx.beginPath();
      ctx.arc(xx, yy, dot, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// --- lettering -------------------------------------------------------------
function fitFont(ctx, text, fontFamily, maxW, startPx, weight = '') {
  let size = startPx;
  ctx.font = `${weight} ${size}px ${fontFamily}`;
  while (ctx.measureText(text).width > maxW && size > 10) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${fontFamily}`;
  }
  return size;
}

function drawTitleBlock(ctx, rect, state, w, h) {
  const { x, y, w: rw, h: rh, mode } = rect;
  const title = (state.title || 'NEON SHORE').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const badge = (state.badge || '').trim();
  const grade = GRADES[state.grade] ?? GRADES.sunset;

  if (mode === 'band' || mode === 'overlay' || mode === 'top') {
    // dark band with halftone dots
    ctx.save();
    ctx.fillStyle = mode === 'top' ? 'rgba(16,10,28,0.92)' : '#14101c';
    ctx.fillRect(x, y, rw, rh);
    halftone(ctx, x, y, rw, rh, Math.max(2, rh * 0.02), Math.max(10, rh * 0.12), '#ffffff', 0.10);
    // thin gradient rule on top edge
    const rule = ctx.createLinearGradient(x, 0, x + rw, 0);
    grade.stops.forEach(([p, c]) => rule.addColorStop(p, c));
    ctx.fillStyle = rule;
    ctx.fillRect(x, y, rw, Math.max(3, rh * 0.03));
    ctx.restore();
  } else if (mode === 'cell') {
    ctx.save();
    ctx.fillStyle = '#14101c';
    ctx.fillRect(x, y, rw, rh);
    halftone(ctx, x, y, rw, rh, Math.max(2, rh * 0.02), Math.max(10, rh * 0.12), '#ffffff', 0.12);
    ctx.restore();
  }

  // Title in Anton, white with a sunset gradient fill
  const pad = rw * 0.04;
  const maxW = rw - pad * 2;
  const titleSize = fitFont(ctx, title, 'Anton, "Arial Black", sans-serif', maxW, rh * (mode === 'cell' ? 0.34 : 0.52));
  const grad = ctx.createLinearGradient(x, y, x + rw, y);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, '#ffe9a8');
  grad.addColorStop(1, '#ff7ad9');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(255,60,180,0.55)';
  ctx.shadowBlur = rh * 0.06;
  const titleY = mode === 'cell' ? y + rh * 0.42 : y + rh * (subtitle ? 0.38 : 0.52);
  ctx.fillText(title, x + rw / 2, titleY);
  ctx.restore();

  // Subtitle in Pacifico neon script
  if (subtitle) {
    const subSize = fitFont(ctx, subtitle, 'Pacifico, cursive', maxW * 0.8, rh * (mode === 'cell' ? 0.16 : 0.24));
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7df3ff';
    ctx.shadowColor = 'rgba(60,220,255,0.9)';
    ctx.shadowBlur = rh * 0.08;
    ctx.fillText(subtitle, x + rw / 2, y + rh * (mode === 'cell' ? 0.74 : 0.76));
    ctx.restore();
  }

  // Badge ribbon, top-right of the band
  if (badge && mode !== 'cell') {
    const bSize = Math.max(10, rh * 0.16);
    ctx.save();
    ctx.font = `bold ${bSize}px "Arial Black", sans-serif`;
    const bw = ctx.measureText(badge).width + bSize * 1.6;
    const bx = x + rw - bw - pad;
    const by = y + rh * 0.10;
    const bh = bSize * 1.9;
    ctx.fillStyle = '#ff2e88';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bw, by);
    ctx.lineTo(bx + bw - bh * 0.5, by + bh);
    ctx.lineTo(bx, by + bh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, bx + bw / 2, by + bh / 2 + 1);
    ctx.restore();
  }
}

// --- the cover -------------------------------------------------------------
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const geo = layoutGeometry(state.layout, w, h);

  // backdrop
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#1c1030');
  bg.addColorStop(1, '#0c0716');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const gap = Math.max(4, Math.round(w * 0.008));
  const inkW = Math.max(3, Math.round(w * 0.006));

  // panels
  geo.panels.forEach((p, i) => {
    const rect = {
      x: Math.round(p.x * w) + (i % 3 === 0 ? 0 : gap / 2),
      y: Math.round(p.y * h) + (i < 3 ? 0 : gap / 2),
      w: Math.round(p.w * w) - gap,
      h: Math.round(p.h * h) - gap,
    };
    if (p.rot) {
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(p.rot);
      const inner = { x: -rect.w / 2, y: -rect.h / 2, w: rect.w, h: rect.h };
      drawPanel(ctx, inner, state.photos[i], state, gap, inkW);
      ctx.restore();
    } else {
      drawPanel(ctx, rect, state.photos[i], state, gap, inkW);
    }
  });

  // grade over the photos only (clip to the panel area, above title zone for band layouts)
  // (applied inside drawPanel per panel for correctness with rotation)
  drawTitleBlock(ctx, {
    x: geo.title.x * w, y: geo.title.y * h,
    w: geo.title.w * w, h: geo.title.h * h, mode: geo.title.mode,
  }, state, w, h);

  // footer line for layouts that carry one (tilted snapshots)
  if (geo.footer) {
    const fx = geo.footer.x * w;
    const fy = geo.footer.y * h;
    const fw = geo.footer.w * w;
    const fh = geo.footer.h * h;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fSize = fitFont(ctx, 'VICE COAST • LEONIDA', 'Anton, "Arial Black", sans-serif', fw * 0.6, fh * 0.55);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('VICE COAST • LEONIDA', fx + fw / 2, fy + fh / 2);
    ctx.restore();
  }

  // outer white frame + ink border
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(4, Math.round(w * 0.008));
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  ctx.strokeStyle = INK;
  ctx.lineWidth = inkW;
  ctx.strokeRect(ctx.lineWidth * 2, ctx.lineWidth * 2, w - ctx.lineWidth * 4, h - ctx.lineWidth * 4);
  ctx.restore();

  // grain + vignette over everything
  if (state.grain !== false) {
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = getGrain(ctx);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (state.vignette !== false) {
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(10,4,20,0.38)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawPanel(ctx, rect, photo, state, gap, inkW) {
  const { x, y, w, h } = rect;
  // white mat, then ink border (polaroid feel)
  ctx.save();
  ctx.fillStyle = '#f6f1e8';
  ctx.fillRect(x - inkW, y - inkW, w + inkW * 2, h + inkW * 2);
  ctx.restore();
  if (photo?.img) {
    drawPhoto(ctx, photo.img, { x, y, w, h }, photo.crop);
  } else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#3a2358');
    g.addColorStop(1, '#120a24');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `bold ${Math.max(14, h * 0.09)}px "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD PHOTO', x + w / 2, y + h / 2);
    ctx.restore();
  }
  // grade per panel so rotation and clipping stay correct
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  applyGrade(ctx, { x, y, w, h }, state.grade);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = inkW;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}
