// shots.js — fixed scenes for screenshots.
//
// `?shot=cover` shows the finished poster alone; `?shot=editor` shows the
// full studio with a photo loaded. The query picks the poster:
//   layout, grade, title, subtitle, badge, photo (a sample name), grain.
// The scene paints, waits two animation frames, then sets window.__shotReady
// so the screenshot runner knows the canvas is done.

import { PosterPress, loadImage } from './cover.js';

const SAMPLES = ['pier', 'boulevard', 'sunset', 'neon', 'rooftop'];

function sceneSpec(params) {
  const photo = params.get('photo') ?? 'pier';
  return {
    layout: params.get('layout') ?? 'nine',
    grade: params.get('grade') ?? 'neon',
    title: params.get('title') ?? 'NEON SHORE',
    subtitle: params.get('subtitle') ?? 'a Leonida story',
    badge: params.get('badge') ?? 'VI',
    photos: [],
    crops: {},
    grain: Number(params.get('grain') ?? 0.6),
    vignette: 0.6,
    photoName: SAMPLES.includes(photo) ? photo : 'pier',
  };
}

async function paintCover(canvas, spec) {
  const press = new PosterPress();
  const hero = await loadImage(`samples/${spec.photoName}.jpg`);
  const extras = [];
  for (const name of SAMPLES) {
    if (name === spec.photoName) continue;
    try {
      extras.push(await loadImage(`samples/${name}.jpg`));
    } catch {
      // A missing extra sample never blocks the shot.
    }
  }
  const photos = [hero, ...extras];
  // Fill every cell with a photo in order; the hero photo leads.
  const { BLUEPRINTS } = await import('./cover.js');
  const plan = BLUEPRINTS[spec.layout](canvas.width, canvas.height);
  spec.crops = {};
  plan.cells.forEach((_, i) => {
    spec.crops[i] = { photo: i % photos.length, zoom: 1, ox: 0, oy: 0 };
  });
  await document.fonts?.ready;
  press.render(canvas, spec, photos);
}

export async function runScene(shot, params) {
  if (shot === 'cover') document.body.classList.add('scene-cover');
  const spec = sceneSpec(params);
  const canvas = document.querySelector('#stage');
  if (!canvas) throw new Error('no #stage canvas');
  // The poster is always rendered square for a cover shot, wide for editor.
  if (shot === 'cover') {
    canvas.width = 1080;
    canvas.height = 1080;
  } else {
    canvas.width = 1280;
    canvas.height = 800;
  }
  await paintCover(canvas, spec);
  // In editor mode, also fill the tray and controls so the UI looks alive.
  if (shot === 'editor') {
    const { LAYOUT_NAMES, GRADE_NAMES } = await import('./cover.js');
    const layoutSel = document.querySelector('#layout');
    if (layoutSel) {
      layoutSel.innerHTML = LAYOUT_NAMES.map(
        (name) => `<option value="${name}">${name[0].toUpperCase()}${name.slice(1)}</option>`,
      ).join('');
      layoutSel.value = spec.layout;
    }
    const gradeSel = document.querySelector('#grade');
    if (gradeSel) {
      gradeSel.innerHTML = GRADE_NAMES.map(
        (name) => `<option value="${name}">${name[0].toUpperCase()}${name.slice(1)}</option>`,
      ).join('');
      gradeSel.value = spec.grade;
    }
    const tray = document.querySelector('#tray');
    if (tray) {
      tray.innerHTML = '';
      for (const name of SAMPLES) {
        const img = document.createElement('img');
        img.src = `samples/${name}.jpg`;
        img.className = 'thumb';
        img.alt = name;
        tray.appendChild(img);
      }
    }
    const title = document.querySelector('#title');
    if (title) title.value = spec.title;
    const subtitle = document.querySelector('#subtitle');
    if (subtitle) subtitle.value = spec.subtitle;
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
