// ViceLine render engine — draws a GTA 6-style cover onto any canvas.
// Everything is deterministic: the same state always paints the same bytes
// (grain uses a seeded PRNG, halftone is a fixed dot lattice, no Date/Math.random).
import { layoutById, gradeById, EXPORT_SIZES } from './presets.js';

// Seeded PRNG (mulberry32) so grain is identical on every run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Cover-fit a photo into a rect, with a pan offset (fx, fy in [-1, 1]) that
// the user drags. Returns the source rect to draw from.
export function coverRect(img, rect, fx, fy) {
  const rw = rect.w;
  const rh = rect.h;
  const scale = Math.max(rw / img.width, rh / img.height);
  const sw = rw / scale;
  const sh = rh / scale;
  const maxX = img.width - sw;
  const maxY = img.height - sh;
  const sx = clamp(maxX * (0.5 + 0.5 * (fx || 0)), 0, Math.max(0, maxX));
  const sy = clamp(maxY * (0.5 + 0.5 * (fy || 0)), 0, Math.max(0, maxY));
  return { sx, sy, sw, sh, dx: rect.x, dy: rect.y, dw: rw, dh: rh };
}

// Paint one photo panel: photo, grade wash, duotone hint, inner edge.
function paintPanel(ctx, img, panel, grade, W, H, state) {
  const x = panel.rect[0] * W;
  const y = panel.rect[1] * H;
  const w = panel.rect[2] * W;
  const h = panel.rect[3] * H;
  const pan = (state.pans && state.pans[panel.id]) || { fx: 0, fy: 0 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (img) {
    const r = coverRect(img, { x, y, w, h }, pan.fx, pan.fy);
    ctx.filter = `saturate(${grade.sat}) contrast(${grade.con})`;
    ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh);
    ctx.filter = 'none';
  } else {
    // Empty slot: flat grade gradient so the panel never looks broken.
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, `rgb(${grade.mid.join(',')})`);
    g.addColorStop(1, `rgb(${grade.shadow.join(',')})`);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  // Grade wash over the photo.
  ctx.fillStyle = grade.wash;
  ctx.fillRect(x, y, w, h);
  // Warm / cool shift as a soft overlay band.
  if (grade.warm > 0) {
    ctx.fillStyle = `rgba(255, 150, 40, ${grade.warm * 0.35})`;
    ctx.fillRect(x, y, w, h);
  } else if (grade.warm < 0) {
    ctx.fillStyle = `rgba(60, 140, 255, ${-grade.warm * 0.35})`;
    ctx.fillRect(x, y, w, h);
  }
  // Diagonal sun streak in the panel corner for depth.
  const sg = ctx.createLinearGradient(x, y, x + w * 0.7, y + h * 0.7);
  sg.addColorStop(0, 'rgba(255,255,255,0.10)');
  sg.addColorStop(0.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // Thick black gutter edge around the panel.
  ctx.strokeStyle = '#0a0a0f';
  ctx.lineWidth = Math.max(2, Math.round(W * 0.006));
  ctx.strokeRect(x, y, w, h);
}

// Sunburst rays fanning out behind the headline band.
function paintSunburst(ctx, cx, cy, R, color, rays, seed) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = color;
  for (let i = 0; i < rays; i++) {
    const a0 = (i / rays) * Math.PI * 2 + rnd() * 0.05;
    const a1 = a0 + (Math.PI * 2 / rays) * 0.42;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Halftone dot lattice, denser toward the bottom of the cover.
function paintHalftone(ctx, W, H, spacing, maxR, alpha) {
  const s = Math.max(6, spacing);
  ctx.save();
  ctx.fillStyle = `rgba(10, 8, 18, ${alpha})`;
  let row = 0;
  for (let y = s / 2; y < H; y += s, row++) {
    const depth = y / H; // 0 top -> 1 bottom
    const r = Math.max(0.6, maxR * (0.25 + 0.75 * depth));
    const off = row % 2 ? s / 2 : 0;
    for (let x = s / 2 + off; x < W; x += s) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Seeded film grain: small random speckles across the whole cover.
function paintGrain(ctx, W, H, seed, amount) {
  const rnd = mulberry32(seed);
  const n = Math.floor((W * H) / 4200);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const v = rnd();
    ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.05 + rnd() * 0.08})` : `rgba(0,0,0,${0.05 + rnd() * 0.08})`;
    const s = 1 + Math.floor(rnd() * amount);
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

// Soft dark vignette around the edges.
function paintVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// Fit the headline to the cover width, then paint it with a black ink
// outline, a magenta offset shadow and a white fill. Returns the font size used.
function paintHeadline(ctx, text, sub, W, H, band) {
  const pad = W * 0.045;
  const maxW = W - pad * 2;
  let size = Math.round(W * 0.118);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const setFont = (s) => { ctx.font = `${s}px Anton, 'Arial Narrow', sans-serif`; };
  setFont(size);
  const upper = (text || 'VICE COAST').toUpperCase();
  while (ctx.measureText(upper).width > maxW && size > 18) {
    size -= 2;
    setFont(size);
  }
  const bandH = H * 0.2;
  const cy = band === 'top' ? bandH * 0.52 : H - bandH * 0.48;
  // Band backing: solid black slab with a magenta top rule.
  ctx.fillStyle = 'rgba(8, 8, 14, 0.92)';
  const by = band === 'top' ? 0 : H - bandH;
  ctx.fillRect(0, by, W, bandH);
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(0, band === 'top' ? bandH - 6 : H - bandH, W, 6);
  // Magenta offset shadow, then ink outline, then white fill.
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#ff2e88';
  ctx.fillText(upper, W / 2 + size * 0.055, cy + size * 0.055);
  ctx.lineWidth = Math.max(4, size * 0.14);
  ctx.strokeStyle = '#0a0a0f';
  ctx.strokeText(upper, W / 2, cy);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(upper, W / 2, cy);
  // Subline in Pacifico, small, warm yellow.
  if (sub) {
    const subSize = Math.max(16, Math.round(size * 0.34));
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(sub, W / 2, cy + size * 0.62);
  }
  return size;
}

// The one entry point: paint a full cover for a state at W x H.
export function renderCover(ctx, state, W, H, images) {
  const layout = layoutById(state.layout);
  const grade = gradeById(state.grade);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, W, H);
  // Panels first.
  for (const panel of layout.panels) {
    const slot = state.slots ? state.slots[panel.slot] : null;
    const img = slot && images ? images[slot] : null;
    paintPanel(ctx, img, panel, grade, W, H, state);
  }
  // Sunburst behind the headline band.
  const bandH = H * 0.2;
  const cx = W * 0.5;
  const cy = layout.headline === 'top' ? bandH * 0.5 : H - bandH * 0.5;
  paintSunburst(ctx, cx, cy, Math.max(W, H) * 0.75, `rgb(${grade.light.join(',')})`, 14, 90210);
  // Headline band on top.
  paintHeadline(ctx, state.caption, state.subline, W, H, layout.headline);
  // Print effects on top of everything, in this order.
  if (state.halftone) paintHalftone(ctx, W, H, Math.max(7, W / 130), Math.max(1.4, W / 420), 0.5);
  if (state.grain) paintGrain(ctx, W, H, 5150, 2);
  paintVignette(ctx, W, H);
  // Thin outer frame.
  ctx.strokeStyle = '#0a0a0f';
  ctx.lineWidth = Math.max(3, Math.round(W * 0.008));
  ctx.strokeRect(0, 0, W, H);
}

export function exportSizeById(id) {
  return EXPORT_SIZES.find((s) => s.id === id) || EXPORT_SIZES[0];
}
