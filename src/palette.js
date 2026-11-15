// Monsoon Market — the look plan, in one place. Night rain, neon, wet stone.
// The same names are the CSS custom properties in index.html.
export const PALETTE = {
  sky: '#0b0e1e',
  ground: '#23242e',
  wall: '#3b2d33',
  plaster: '#4c4238',
  wood: '#6b4a2f',
  woodDark: '#4a3220',
  awningRed: '#a33327',
  awningTeal: '#1f6f6b',
  neonPink: '#ff2e88',
  neonCyan: '#22d3ee',
  neonAmber: '#ffb020',
  lantern: '#ff9a3c',
  ink: '#f2ede4',
  muted: '#9aa0b4',
  accent: '#ff2e88',
  danger: '#ff4d4d',
  ok: '#3ddc84',
};

export function hex(name) {
  return PALETTE[name];
}
