// shots.js — fixed scenes for the screenshots.
//
// `?shot=cover` paints the finished poster alone; `?shot=editor` paints the
// full atelier with photos loaded. The query chooses the poster:
//
//   composition, palette, headline, tagline, emblem, photo, grain
//
// The scene renders, waits two animation frames, then raises
// window.__shotReady so the screenshot runner knows the canvas is done.

import { CoverForge, COMPOSITIONS, COMPOSITION_NAMES, PALETTE_NAMES, loadPhoto } from './cover.js';

const SAMPLE_NAMES = ['pier', 'boulevard', 'sunset', 'neon', 'rooftop'];

function sceneDesign(params) {
  const photo = params.get('photo') ?? 'pier';
  return {
    composition: params.get('composition') ?? params.get('layout') ?? 'nine',
    palette: params.get('palette') ?? params.get('grade') ?? 'neon',
    headline: params.get('headline') ?? params.get('title') ?? 'NEON SHORE',
    tagline: params.get('tagline') ?? params.get('subtitle') ?? 'a Leonida story',
    emblem: params.get('emblem') ?? params.get('badge') ?? 'VI',
    shots: [],
    frames: {},
    grain: Number(params.get('grain') ?? 0.6),
    shade: 0.6,
    photoName: SAMPLE_NAMES.includes(photo) ? photo : 'pier',
  };
}

async function paintPoster(canvas, design) {
  const forge = new CoverForge();
  const hero = await loadPhoto(`samples/${design.photoName}.jpg`);
  const rest = [];
  for (const name of SAMPLE_NAMES) {
    if (name === design.photoName) continue;
    try {
      rest.push(await loadPhoto(`samples/${name}.jpg`));
    } catch {
      // A missing extra sample never blocks the shot.
    }
  }
  const photos = [hero, ...rest];
  const table = COMPOSITIONS[design.composition] ?? COMPOSITIONS.nine;
  design.frames = {};
  table.cells.forEach((_, i) => {
    design.frames[i] = { shot: i % photos.length, zoom: 1, dx: 0, dy: 0 };
  });
  await document.fonts?.ready;
  forge.forge(canvas, design, photos);
}

function fillSelect(el, names, value) {
  if (!el) return;
  el.innerHTML = names.map(
    (name) => `<option value="${name}">${name[0].toUpperCase()}${name.slice(1)}</option>`,
  ).join('');
  el.value = value;
}

export async function runScene(shot, params) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const design = sceneDesign(params);
  const canvas = document.querySelector('#poster');
  if (!canvas) throw new Error('no #poster canvas');
  // A cover shot is always square; the editor shot is a wide frame.
  if (shot === 'cover') {
    canvas.width = 1080;
    canvas.height = 1080;
  } else {
    canvas.width = 1280;
    canvas.height = 800;
  }
  await paintPoster(canvas, design);
  // In editor mode, also fill the tray and controls so the UI looks alive.
  if (shot === 'editor') {
    fillSelect(document.querySelector('#composition'), COMPOSITION_NAMES, design.composition);
    fillSelect(document.querySelector('#palette'), PALETTE_NAMES, design.palette);
    const tray = document.querySelector('#tray');
    if (tray) {
      tray.innerHTML = '';
      for (const name of SAMPLE_NAMES) {
        const img = document.createElement('img');
        img.src = `samples/${name}.jpg`;
        img.className = 'thumb';
        img.alt = name;
        tray.appendChild(img);
      }
    }
    const headline = document.querySelector('#headline');
    if (headline) headline.value = design.headline;
    const tagline = document.querySelector('#tagline');
    if (tagline) tagline.value = design.tagline;
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
