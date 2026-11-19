// Fixed scenes for screenshots: ?shot=editor shows the app with samples loaded;
// ?shot=cover shows the cover alone. Rewritten for the recorded build: same scenes.
// Query params pick the scene:
// layout, grade, size, title, subtitle, badge, photo (sample name for the hero).
// window.__shotReady is set once painted.
import { loadImage, loadSamples, state, syncControls } from './main.js';

const SAMPLE_URL = (name) => `samples/${name}.jpg`;

export async function runShot(shot, query, appState, redraw) {
  const layout = query.get('layout');
  const grade = query.get('grade');
  const size = query.get('size');
  const title = query.get('title');
  const subtitle = query.get('subtitle');
  if (layout) appState.layout = layout;
  if (grade) appState.grade = grade;
  if (size) appState.size = size;
  if (title) appState.title = title;
  if (subtitle !== null) appState.subtitle = subtitle;
  if (query.get('badge') !== null) appState.badge = query.get('badge');

  try {
    await document.fonts.load('16px Anton');
    await document.fonts.load('16px Pacifico');
  } catch { /* fall back */ }
  await loadSamples();

  // hero photo override: put the named sample in the first panel,
  // keeping the default crop loadSamples chose for that slot
  const hero = query.get('photo');
  if (hero) {
    const img = await loadImage(SAMPLE_URL(hero));
    const keep = appState.photos[0]?.crop ?? { x: 0, y: 0, zoom: 1 };
    appState.photos[0] = { src: SAMPLE_URL(hero), img, crop: keep };
  }
  if (shot === 'cover') document.body.classList.add('shot-cover');
  syncControls();
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
