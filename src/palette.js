// Yardline — the look plan, in one place. Warm sun, sand and terracotta,
// faded container paint. One sun, soft shadows, no coloured lights.
// The same names are the CSS custom properties in index.html.
export const PALETTE = {
  sky: '#cfe3ee',
  skyTop: '#7fb2d9',
  horizon: '#f2d9a8',
  ground: '#c9b18c',
  sand: '#d9c39a',
  cream: '#efe6d0',
  terracotta: '#b06a3f',
  rust: '#a34a3a',
  concrete: '#9a938a',
  concreteDark: '#6e675f',
  wall: '#b99f7d',
  plaster: '#cbb693',
  wood: '#8a6a45',
  woodDark: '#6b4f33',
  containerBlue: '#3e6b8c',
  containerGreen: '#4d7a5a',
  containerRed: '#a34a3a',
  containerYellow: '#c98f2e',
  steel: '#5a6068',
  steelDark: '#33373d',
  sun: '#ffd9a0',
  ink: '#2b241c',
  muted: '#7a6a55',
  accent: '#c96a3b',
  danger: '#d94f3d',
  ok: '#4d8a5a',
};

export function hex(name) {
  return PALETTE[name];
}
