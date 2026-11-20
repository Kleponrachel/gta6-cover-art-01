// ViceLine presets — every layout is a table of panel rectangles (fractions of
// the cover) and every grade is a multi-stop colour ramp plus a duotone map.
// Nothing here is copied from a previous round: the panel tables, the grade
// ramps and the effect defaults were all drawn up fresh for round 5.

// A panel rect: [x, y, w, h] in fractions of the cover, plus which photo slot
// it fills by default. The headline zone is a separate band the engine draws
// over the panels (bottom band for most layouts, top band for a few).
export const LAYOUTS = [
  {
    id: 'hero-split',
    name: 'Hero Split',
    tag: 'One big moment, two side stories',
    headline: 'bottom',
    panels: [
      { id: 'hero', rect: [0, 0, 0.62, 1], slot: 0 },
      { id: 'side-a', rect: [0.62, 0, 0.38, 0.5], slot: 1 },
      { id: 'side-b', rect: [0.62, 0.5, 0.38, 0.5], slot: 2 },
    ],
  },
  {
    id: 'triptych',
    name: 'Triptych',
    tag: 'Three equal acts across the cover',
    headline: 'bottom',
    panels: [
      { id: 'act-1', rect: [0, 0, 0.3333, 1], slot: 0 },
      { id: 'act-2', rect: [0.3333, 0, 0.3334, 1], slot: 1 },
      { id: 'act-3', rect: [0.6667, 0, 0.3333, 1], slot: 2 },
    ],
  },
  {
    id: 'grid-four',
    name: 'Grid Four',
    tag: 'Four square moments, one cover',
    headline: 'top',
    panels: [
      { id: 'nw', rect: [0, 0, 0.5, 0.5], slot: 0 },
      { id: 'ne', rect: [0.5, 0, 0.5, 0.5], slot: 1 },
      { id: 'sw', rect: [0, 0.5, 0.5, 0.5], slot: 2 },
      { id: 'se', rect: [0.5, 0.5, 0.5, 0.5], slot: 3 },
    ],
  },
  {
    id: 'comic-strip',
    name: 'Comic Strip',
    tag: 'Wide opener, three beats below',
    headline: 'bottom',
    panels: [
      { id: 'opener', rect: [0, 0, 1, 0.58], slot: 0 },
      { id: 'beat-1', rect: [0, 0.58, 0.3333, 0.42], slot: 1 },
      { id: 'beat-2', rect: [0.3333, 0.58, 0.3334, 0.42], slot: 2 },
      { id: 'beat-3', rect: [0.6667, 0.58, 0.3333, 0.42], slot: 3 },
    ],
  },
  {
    id: 'diagonal',
    name: 'Diagonal',
    tag: 'Slanted cut, chase-scene energy',
    headline: 'bottom',
    panels: [
      { id: 'upper', rect: [0, 0, 1, 0.52], slot: 0, slant: 0.1 },
      { id: 'lower-a', rect: [0, 0.52, 0.55, 0.48], slot: 1, slant: -0.1 },
      { id: 'lower-b', rect: [0.55, 0.52, 0.45, 0.48], slot: 2, slant: 0.1 },
    ],
  },
  {
    id: 'poster-stack',
    name: 'Poster Stack',
    tag: 'Full-bleed hero, strip of three below',
    headline: 'top',
    panels: [
      { id: 'hero', rect: [0, 0, 1, 0.7], slot: 0 },
      { id: 'strip-1', rect: [0, 0.7, 0.3333, 0.3], slot: 1 },
      { id: 'strip-2', rect: [0.3333, 0.7, 0.3334, 0.3], slot: 2 },
      { id: 'strip-3', rect: [0.6667, 0.7, 0.3333, 0.3], slot: 3 },
    ],
  },
];

// A grade: a duotone (shadow colour -> highlight colour), a wash tint drawn
// over the photo, and the canvas filter knobs the engine applies per panel.
export const GRADES = [
  {
    id: 'neon-sunset',
    name: 'Neon Sunset',
    tag: 'Magenta sky, orange heat',
    shadow: [26, 8, 58],
    mid: [196, 42, 110],
    light: [255, 176, 92],
    wash: 'rgba(255, 80, 150, 0.10)',
    sat: 1.35,
    con: 1.12,
    warm: 0.16,
  },
  {
    id: 'vice-pink',
    name: 'Vice Pink',
    tag: 'Hot pink duotone, arcade glow',
    shadow: [40, 6, 66],
    mid: [226, 30, 148],
    light: [255, 150, 214],
    wash: 'rgba(255, 40, 160, 0.14)',
    sat: 1.5,
    con: 1.08,
    warm: 0.05,
  },
  {
    id: 'heat-haze',
    name: 'Heat Haze',
    tag: 'Gold hour, hazy and warm',
    shadow: [52, 30, 12],
    mid: [208, 128, 44],
    light: [255, 222, 140],
    wash: 'rgba(255, 180, 70, 0.12)',
    sat: 1.2,
    con: 1.05,
    warm: 0.3,
  },
  {
    id: 'midnight-drive',
    name: 'Midnight Drive',
    tag: 'Deep blue night, cyan neon',
    shadow: [6, 12, 40],
    mid: [26, 78, 150],
    light: [120, 220, 255],
    wash: 'rgba(40, 120, 255, 0.12)',
    sat: 1.25,
    con: 1.15,
    warm: -0.18,
  },
  {
    id: 'gold-hour',
    name: 'Gold Hour',
    tag: 'Amber light, long shadows',
    shadow: [58, 34, 10],
    mid: [190, 120, 40],
    light: [255, 205, 110],
    wash: 'rgba(255, 170, 40, 0.10)',
    sat: 1.3,
    con: 1.1,
    warm: 0.24,
  },
  {
    id: 'tropic-noir',
    name: 'Tropic Noir',
    tag: 'Teal dark, palm-shadow green',
    shadow: [6, 26, 24],
    mid: [22, 110, 96],
    light: [150, 240, 200],
    wash: 'rgba(20, 180, 140, 0.12)',
    sat: 1.2,
    con: 1.14,
    warm: -0.08,
  },
];

// Export sizes: square post, portrait post, story.
export const EXPORT_SIZES = [
  { id: 'square', name: 'Square 1:1', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait 4:5', w: 1080, h: 1350 },
  { id: 'story', name: 'Story 9:16', w: 1080, h: 1920 },
];

// The five bundled sample photos (generated fresh for round 5).
export const SAMPLES = [
  { id: 'beach', name: 'Beach Sunset', file: 'samples/beach.jpg' },
  { id: 'boulevard', name: 'Boulevard Dusk', file: 'samples/boulevard.jpg' },
  { id: 'pier', name: 'Pier', file: 'samples/pier.jpg' },
  { id: 'rooftop', name: 'Rooftop Night', file: 'samples/rooftop.jpg' },
  { id: 'neon', name: 'Neon Street', file: 'samples/neon.jpg' },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

export function sampleById(id) {
  return SAMPLES.find((s) => s.id === id) || SAMPLES[0];
}
