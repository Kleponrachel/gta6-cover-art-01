// Canvas renderer for Neon Coast Cover Studio (round 6).
import { GRADES, LAYOUTS } from './looks.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function coverFit(img, pw, ph) {
  const s = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
  return { w: img.naturalWidth * s, h: img.naturalHeight * s };
}

function panelBounds(pts, W, H) {
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x: x0 * W, y: y0 * H, w: (x1 - x0) * W, h: (y1 - y0) * H };
}

function tracePanel(ctx, pts, W, H) {
  ctx.beginPath();
  pts.forEach(([x, y], j) => { if (j === 0) ctx.moveTo(x * W, y * H); else ctx.lineTo(x * W, y * H); });
  ctx.closePath();
}

export function renderCover(ctx, W, H, state) {
  const grade = GRADES[state.grade];
  const layout = LAYOUTS[state.layout];
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const gap = Math.max(4, W * 0.006);
  layout.panels.forEach((panel, i) => {
    const b = panelBounds(panel.pts, W, H);
    const img = state.photos[i];
    ctx.save();
    tracePanel(ctx, panel.pts, W, H);
    ctx.clip();
    if (img && img.complete && img.naturalWidth) {
      const fit = coverFit(img, b.w, b.h);
      const pan = state.pans[i] || { x: 0, y: 0, z: 1 };
      const dw = fit.w * pan.z, dh = fit.h * pan.z;
      const dx = b.x + (b.w - dw) / 2 + pan.x * b.w;
      const dy = b.y + (b.h - dh) / 2 + pan.y * b.h;
      ctx.drawImage(img, dx, dy, dw, dh);
    } else {
      const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
      g.addColorStop(0, grade.sky[0]); g.addColorStop(1, grade.sky[1]);
      ctx.fillStyle = g; ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    ctx.globalAlpha = grade.tintAlpha;
    ctx.fillStyle = grade.tint;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    const step = Math.max(10, W / 90);
    for (let y = b.y + step / 2; y < b.y + b.h; y += step) {
      for (let x = b.x + step / 2; x < b.x + b.w; x += step) {
        ctx.beginPath(); ctx.arc(x, y, Math.max(1, step * 0.09), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = gap;
    tracePanel(ctx, panel.pts, W, H);
    ctx.stroke();
  });
  const wash = ctx.createLinearGradient(0, H * 0.72, 0, H);
  wash.addColorStop(0, 'rgba(0,0,0,0)');
  wash.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = wash; ctx.fillRect(0, H * 0.72, W, H * 0.28);
  const glow = ctx.createRadialGradient(W / 2, H * 0.88, 10, W / 2, H * 0.88, W * 0.55);
  glow.addColorStop(0, grade.accent + '55');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, H * 0.6, W, H * 0.4);
  const head = (state.headline || 'VICE COAST').toUpperCase();
  const sub = state.subline || '';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const headSize = W * 0.085;
  ctx.font = `${headSize}px Anton, sans-serif`;
  ctx.lineWidth = headSize * 0.16;
  ctx.strokeStyle = grade.ink;
  ctx.fillStyle = grade.headline;
  ctx.shadowColor = grade.accent;
  ctx.shadowBlur = W * 0.012;
  ctx.shadowOffsetX = W * 0.006; ctx.shadowOffsetY = W * 0.006;
  ctx.strokeText(head, W / 2, H * 0.885);
  ctx.fillText(head, W / 2, H * 0.885);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  if (sub) {
    ctx.font = `${W * 0.042}px Pacifico, cursive`;
    ctx.fillStyle = grade.accent;
    ctx.fillText(sub, W / 2, H * 0.955);
  }
  const rnd = mulberry32(20261121);
  ctx.fillStyle = '#ffffff';
  const dots = Math.floor(W * H * grade.grain * 0.00012);
  for (let i = 0; i < dots; i++) {
    ctx.globalAlpha = rnd() * 0.16;
    ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
  }
  ctx.globalAlpha = 1;
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}
