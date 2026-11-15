// Monsoon Market — hearing.js. The sound world bots react to: a
// noise is a position + kind + radius + time; bots hear the loudest one.
export const NOISE_RADIUS = {
  gunshot: 26,
  plant: 20,
  defuse: 20,
  grenade: 30,
  footstepRun: 14,
  footstepWalk: 8,
  footstepCrouch: 4,
};

const NOISE_TTL = {
  gunshot: 0.5,
  plant: 0.4,
  defuse: 0.4,
  grenade: 0.6,
  footstepRun: 0.35,
  footstepWalk: 0.3,
  footstepCrouch: 0.25,
};

// `noises` is the shared array (G.noises in the game state); hearing owns
// emit / hear / decay so the rest of the game never touches the array
// directly.
export function createHearing(noises) {
  // Emit a noise of `kind` at (x, z). `radius` overrides the kind's
  // default radius when given.
  function emit(x, z, kind, radius) {
    const r = radius !== undefined ? radius : (NOISE_RADIUS[kind] || 10);
    const ttl = NOISE_TTL[kind] || 0.4;
    noises.push({ x, z, radius: r, ttl, kind });
  }

  // The loudest (nearest, by radius) noise a listener at (x, z) can hear,
  // or null when the market is quiet. Gunshots outrank footsteps: the
  // nearest noise by distance-to-radius ratio wins.
  function hear(x, z) {
    let best = null;
    let bestScore = Infinity;
    for (const n of noises) {
      const d = Math.hypot(n.x - x, n.z - z);
      if (d > n.radius) continue;
      const score = d / n.radius;
      if (score < bestScore) { best = n; bestScore = score; }
    }
    if (!best) return null;
    return { x: best.x, z: best.z, kind: best.kind, dist: Math.hypot(best.x - x, best.z - z) };
  }

  // Age every noise by dt and drop the ones that faded out. Called once
  // per fixed step by the game loop.
  function decay(dt) {
    for (let i = noises.length - 1; i >= 0; i -= 1) {
      noises[i].ttl -= dt;
      if (noises[i].ttl <= 0) noises.splice(i, 1);
    }
  }

  return { emit, hear, decay, noises };
}
