// Neon Coast Cover Studio — grade ramps and layout tables (round 6, fresh design).
export const GRADES = {
  'neon-sunset': { label: 'Neon Sunset', sky: ['#ff9a3d', '#7a2d6d'], tint: '#ff5e78', tintAlpha: 0.20, ink: '#14060f', accent: '#ff2e88', headline: '#fff6df', grain: 0.10 },
  'vice-pink': { label: 'Vice Pink', sky: ['#ff7eb6', '#5b2a86'], tint: '#ff4fd8', tintAlpha: 0.18, ink: '#160a1c', accent: '#ff4fd8', headline: '#ffffff', grain: 0.08 },
  'heat-haze': { label: 'Heat Haze', sky: ['#ffd23d', '#c2512c'], tint: '#ff9a3d', tintAlpha: 0.16, ink: '#1c0d05', accent: '#ff7a1a', headline: '#fffbe8', grain: 0.07 },
  'midnight-drive': { label: 'Midnight Drive', sky: ['#2b3a67', '#0a0a1a'], tint: '#3d6bff', tintAlpha: 0.22, ink: '#050510', accent: '#37c8ff', headline: '#eaf6ff', grain: 0.12 },
  'gold-hour': { label: 'Gold Hour', sky: ['#ffe08a', '#8a5a1e'], tint: '#ffc23d', tintAlpha: 0.15, ink: '#1d1204', accent: '#ffb400', headline: '#fffdf2', grain: 0.06 },
  'tropic-noir': { label: 'Tropic Noir', sky: ['#0f766e', '#062b2b'], tint: '#14b8a6', tintAlpha: 0.20, ink: '#031212', accent: '#2dd4bf', headline: '#f0fdfa', grain: 0.11 },
};

export const LAYOUTS = {
  'hero-split': { label: 'Hero Split', panels: [
    { pts: [[0, 0], [0.58, 0], [0.58, 1], [0, 1]] },
    { pts: [[0.58, 0], [1, 0], [1, 0.5], [0.58, 0.5]] },
    { pts: [[0.58, 0.5], [1, 0.5], [1, 1], [0.58, 1]] },
  ] },
  'triptych': { label: 'Triptych', panels: [
    { pts: [[0, 0], [0.34, 0], [0.34, 1], [0, 1]] },
    { pts: [[0.34, 0], [0.67, 0], [0.67, 1], [0.34, 1]] },
    { pts: [[0.67, 0], [1, 0], [1, 1], [0.67, 1]] },
  ] },
  'grid-four': { label: 'Grid Four', panels: [
    { pts: [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]] },
    { pts: [[0.5, 0], [1, 0], [1, 0.5], [0.5, 0.5]] },
    { pts: [[0, 0.5], [0.5, 0.5], [0.5, 1], [0, 1]] },
    { pts: [[0.5, 0.5], [1, 0.5], [1, 1], [0.5, 1]] },
  ] },
  'comic-strip': { label: 'Comic Strip', panels: [
    { pts: [[0, 0], [1, 0], [1, 0.34], [0, 0.34]] },
    { pts: [[0, 0.34], [1, 0.34], [1, 0.67], [0, 0.67]] },
    { pts: [[0, 0.67], [1, 0.67], [1, 1], [0, 1]] },
  ] },
  'diagonal': { label: 'Diagonal', panels: [
    { pts: [[0, 0], [1, 0], [0.28, 1], [0, 1]] },
    { pts: [[1, 0], [1, 1], [0.28, 1]] },
  ] },
  'poster-stack': { label: 'Poster Stack', panels: [
    { pts: [[0, 0], [1, 0], [1, 0.62], [0, 0.62]] },
    { pts: [[0, 0.62], [0.34, 0.62], [0.34, 1], [0, 1]] },
    { pts: [[0.34, 0.62], [0.67, 0.62], [0.67, 1], [0.34, 1]] },
    { pts: [[0.67, 0.62], [1, 0.62], [1, 1], [0.67, 1]] },
  ] },
};

export const SAMPLES = ['marina.jpg', 'highway.jpg', 'boardwalk.jpg', 'skyline.jpg', 'palms.jpg'];

export const EXPORT_SIZES = [
  { name: 'square', w: 1080, h: 1080 },
  { name: 'portrait', w: 1080, h: 1350 },
  { name: 'story', w: 1080, h: 1920 },
];
