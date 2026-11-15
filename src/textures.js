// Monsoon Market — textures. Only one texture is painted on a canvas at
// boot: the radial sprite used for muzzle flashes (viewmodel.js) and the
// glow sprites. Everything else in the scene is a palette colour or a
// procedural material — no image files, no network, nothing to download.
import * as THREE from 'three';

export function radialSprite(inner, outer) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.45, outer);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
