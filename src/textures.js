// Yardline — every texture is painted on a canvas at boot: no image files,
// no network, nothing to download. Each surface gets its own look:
// cracked concrete with oil stains and yellow markings, layered brick,
// wood grain for crates, rusted corrugated steel for containers, sand.
import * as THREE from 'three';

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvasTexture(size, draw, seed = 1) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size, seeded(seed));
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function speckle(ctx, size, rand, n, color, alpha, rMin, rMax) {
  for (let i = 0; i < n; i += 1) {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * (0.4 + rand() * 0.6);
    const r = rMin + rand() * (rMax - rMin);
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function cracks(ctx, size, rand, n, color) {
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < n; i += 1) {
    let x = rand() * size;
    let y = rand() * size;
    ctx.lineWidth = 0.8 + rand() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 3 + Math.floor(rand() * 5);
    for (let s = 0; s < segs; s += 1) {
      x += (rand() - 0.5) * 46;
      y += (rand() - 0.5) * 46;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// --- concrete: warm grey, cracks, oil stains, a faded yellow marking ---
export function concreteTexture(seed = 11) {
  return canvasTexture(256, (ctx, size, rand) => {
    ctx.fillStyle = '#9a938a';
    ctx.fillRect(0, 0, size, size);
    speckle(ctx, size, rand, 2600, '#8a827a', 0.25, 0.5, 2.2);
    speckle(ctx, size, rand, 900, '#a89f92', 0.2, 0.5, 2.5);
    speckle(ctx, size, rand, 300, '#7a7268', 0.18, 1, 3);
    cracks(ctx, size, rand, 7, '#5f584f');
    // oil stains
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = '#3f3a33';
      ctx.globalAlpha = 0.10 + rand() * 0.12;
      ctx.beginPath();
      ctx.ellipse(rand() * size, rand() * size, 14 + rand() * 26, 9 + rand() * 18, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // faded yellow marking line
    ctx.fillStyle = '#c98f2e';
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, size * 0.46, size, 5);
    ctx.globalAlpha = 0.3;
    ctx.fillRect(0, size * 0.52, size, 3);
    ctx.globalAlpha = 1;
  }, seed);
}

// --- brick / plaster wall: rows of brick with mortar, layered noise ---
export function brickTexture(seed = 23) {
  return canvasTexture(256, (ctx, size, rand) => {
    ctx.fillStyle = '#b99f7d';
    ctx.fillRect(0, 0, size, size);
    const rowH = 16;
    const brickW = 42;
    for (let row = 0; row < size / rowH; row += 1) {
      const off = (row % 2) * (brickW / 2);
      for (let col = -1; col < size / brickW + 1; col += 1) {
        const shade = 0.86 + rand() * 0.28;
        const r = Math.floor(185 * shade);
        const g = Math.floor(159 * shade);
        const b = Math.floor(125 * shade);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(col * brickW + off + 1, row * rowH + 1, brickW - 2, rowH - 2);
      }
    }
    speckle(ctx, size, rand, 1400, '#8a7358', 0.2, 0.5, 2);
    speckle(ctx, size, rand, 500, '#d9c39a', 0.18, 0.5, 2);
    cracks(ctx, size, rand, 4, '#6e5a44');
    // weather streaks from the top
    for (let i = 0; i < 10; i += 1) {
      ctx.fillStyle = '#6e5a44';
      ctx.globalAlpha = 0.08 + rand() * 0.1;
      const x = rand() * size;
      ctx.fillRect(x, 0, 3 + rand() * 6, 30 + rand() * 90);
    }
    ctx.globalAlpha = 1;
  }, seed);
}

// --- wood: planks with grain lines and knots, for crates ---
export function woodTexture(seed = 37) {
  return canvasTexture(256, (ctx, size, rand) => {
    ctx.fillStyle = '#8a6a45';
    ctx.fillRect(0, 0, size, size);
    const plankH = 32;
    for (let p = 0; p < size / plankH; p += 1) {
      const shade = 0.88 + rand() * 0.24;
      ctx.fillStyle = `rgb(${Math.floor(138 * shade)},${Math.floor(106 * shade)},${Math.floor(69 * shade)})`;
      ctx.fillRect(0, p * plankH + 1, size, plankH - 2);
      // grain
      ctx.strokeStyle = '#5f4526';
      ctx.globalAlpha = 0.35;
      for (let g = 0; g < 7; g += 1) {
        const y = p * plankH + 4 + rand() * (plankH - 8);
        ctx.lineWidth = 0.7 + rand();
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= size; x += 32) ctx.lineTo(x, y + (rand() - 0.5) * 5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // knot
      if (rand() < 0.6) {
        ctx.fillStyle = '#4a3220';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.ellipse(rand() * size, p * plankH + plankH / 2, 4 + rand() * 4, 3 + rand() * 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    speckle(ctx, size, rand, 500, '#6b4f33', 0.2, 0.5, 1.8);
  }, seed);
}

// --- container steel: corrugated vertical ribs, faded paint, rust streaks ---
export function containerTexture(base, seed = 53) {
  return canvasTexture(256, (ctx, size, rand) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    const ribW = 16;
    for (let x = 0; x < size; x += ribW) {
      const grad = ctx.createLinearGradient(x, 0, x + ribW, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0.28)');
      grad.addColorStop(0.35, 'rgba(255,255,255,0.10)');
      grad.addColorStop(0.65, 'rgba(0,0,0,0.05)');
      grad.addColorStop(1, 'rgba(0,0,0,0.30)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, ribW, size);
    }
    speckle(ctx, size, rand, 900, '#000000', 0.10, 0.5, 2.2);
    speckle(ctx, size, rand, 500, '#ffffff', 0.06, 0.5, 2);
    // rust streaks running down
    for (let i = 0; i < 16; i += 1) {
      const x = rand() * size;
      const w = 2 + rand() * 7;
      const len = 20 + rand() * 120;
      const grad = ctx.createLinearGradient(0, 0, 0, len);
      grad.addColorStop(0, 'rgba(122, 62, 32, 0.55)');
      grad.addColorStop(1, 'rgba(122, 62, 32, 0)');
      ctx.fillStyle = grad;
      ctx.save();
      ctx.translate(x, rand() * size * 0.5);
      ctx.fillRect(0, 0, w, len);
      ctx.restore();
    }
    // faded stencil band
    ctx.fillStyle = 'rgba(240, 230, 210, 0.16)';
    ctx.fillRect(0, size * 0.12, size, 14);
  }, seed);
}

// --- sand / ground: fine grain, a few pebbles ---
export function sandTexture(seed = 71) {
  return canvasTexture(256, (ctx, size, rand) => {
    ctx.fillStyle = '#c9b18c';
    ctx.fillRect(0, 0, size, size);
    speckle(ctx, size, rand, 3200, '#b39a72', 0.25, 0.5, 2);
    speckle(ctx, size, rand, 1800, '#d9c39a', 0.22, 0.5, 2.2);
    speckle(ctx, size, rand, 260, '#8a7358', 0.3, 1, 2.6);
    cracks(ctx, size, rand, 3, '#8a7358');
  }, seed);
}

// --- plain steel: brushed, for doors and frames ---
export function steelTexture(seed = 97) {
  return canvasTexture(256, (ctx, size, rand) => {
    ctx.fillStyle = '#5a6068';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 300; i += 1) {
      ctx.strokeStyle = rand() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.10)';
      ctx.lineWidth = 0.8;
      const y = rand() * size;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y + (rand() - 0.5) * 6);
      ctx.stroke();
    }
    speckle(ctx, size, rand, 400, '#33373d', 0.2, 0.5, 2);
  }, seed);
}

// --- soft radial sprite (muzzle flash / dust puff) ---
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

// --- bookshelf front: rows of coloured book spines ---
export function booksTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5f3d22';
  ctx.fillRect(0, 0, 256, 256);
  const cols = ['#a34a3a', '#3e6b8c', '#4d7a5a', '#c98f2e', '#efe6d0', '#7a5230', '#6b4a6b', '#2b4a3a'];
  const rng = seeded(11);
  // 4 shelves
  for (let s = 0; s < 4; s += 1) {
    const y0 = 8 + s * 64;
    // shelf board
    ctx.fillStyle = '#4a2f18';
    ctx.fillRect(0, y0 + 52, 256, 6);
    let x = 4;
    while (x < 250) {
      const w = 10 + rng() * 14;
      const h = 34 + rng() * 16;
      const col = cols[Math.floor(rng() * cols.length)];
      ctx.fillStyle = col;
      ctx.fillRect(x, y0 + 54 - h, w, h);
      // spine line
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x, y0 + 54 - h, 2, h);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x + w - 3, y0 + 54 - h, 2, h);
      x += w + 1 + rng() * 3;
      if (rng() < 0.12) x += 10; // occasional gap / leaning book
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// --- checkerboard floor (lobby) ---
export function checkerTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  const n = 8;
  const s = 256 / n;
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#e8dcc0' : '#8a6a4a';
      ctx.fillRect(x * s, y * s, s, s);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 3);
  return tex;
}
export function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#4a6a9a');
  grad.addColorStop(0.42, '#9a8a9a');
  grad.addColorStop(0.68, '#e8a05e');
  grad.addColorStop(0.85, '#f2b96e');
  grad.addColorStop(1, '#e8c48f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeTextures() {
  return {
    concrete: concreteTexture(11),
    brick: brickTexture(23),
    wood: woodTexture(37),
    sand: sandTexture(71),
    steel: steelTexture(97),
    containerBlue: containerTexture('#3e6b8c', 53),
    containerGreen: containerTexture('#4d7a5a', 59),
    containerRed: containerTexture('#a34a3a', 61),
    containerYellow: containerTexture('#c98f2e', 67),
    books: booksTexture(),
    checker: checkerTexture(),
  };
}
