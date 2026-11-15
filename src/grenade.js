// Monsoon Market — grenade.js. Frag, smoke and flash: a thrown sphere
// that arcs, bounces once, and pops — frag hurts, smoke blocks, flash blinds.
import * as THREE from 'three';

const GRAVITY = 14;
const BOUNCE_Y = -0.35;
const BOUNCE_XZ = 0.7;
const FRAG_RANGE = 7;
const FRAG_MAX = 110;
const FLASH_RANGE = 22;
const FLASH_BLIND = 1.6;

export function createGrenades(scene) {
  const grenades = [];
  const geo = new THREE.SphereGeometry(0.09, 8, 6);
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#1c1e26'), roughness: 0.6 });

  // Throw `kind` from `from` (a Vector3) toward `target` (a Vector3).
  // `owner` is the actor who threw it (for frag credit). Returns false
  // when the thrower has no utility of that kind left.
  function throwAt(from, target, kind, owner) {
    if (owner && owner.utility && owner.utility[kind] <= 0) return false;
    if (owner && owner.utility) owner.utility[kind] -= 1;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(from);
    scene.add(mesh);
    const dir = new THREE.Vector3().subVectors(target, from).normalize();
    grenades.push({
      mesh, kind, owner,
      vel: new THREE.Vector3(dir.x * 15, dir.y * 15 + 3.5, dir.z * 15),
      ttl: kind === 'frag' ? 1.6 : 1.3,
    });
    return true;
  }

  // Step every live grenade: gravity, floor bounce, then the pop.
  // `ctx` carries the game (damage, effects, audio, hud, actors, player).
  function step(dt, ctx) {
    for (let i = grenades.length - 1; i >= 0; i -= 1) {
      const g = grenades[i];
      g.ttl -= dt;
      g.vel.y -= GRAVITY * dt;
      g.mesh.position.addScaledVector(g.vel, dt);
      if (g.mesh.position.y < 0.09) {
        g.mesh.position.y = 0.09;
        g.vel.y *= BOUNCE_Y;
        g.vel.x *= BOUNCE_XZ;
        g.vel.z *= BOUNCE_XZ;
      }
      if (g.ttl > 0) continue;
      const p = g.mesh.position;
      if (g.kind === 'frag') {
        ctx.effects.spark(p, 14);
        ctx.audio.explode();
        for (const a of ctx.G.actors) {
          if (!a.alive || a === g.owner) continue;
          const d = Math.hypot(a.body.position.x - p.x, a.body.position.z - p.z);
          if (d < FRAG_RANGE) ctx.damage(a, Math.max(15, FRAG_MAX - d * 13), false, g.owner);
        }
      } else if (g.kind === 'smoke') {
        ctx.effects.smoke(p);
      } else if (g.kind === 'flash') {
        ctx.hud.flashScreen();
        for (const b of ctx.bots) {
          if (!b.alive || b.team === (g.owner ? g.owner.team : 'attack')) continue;
          const d = Math.hypot(b.body.position.x - p.x, b.body.position.z - p.z);
          if (d < FLASH_RANGE) {
            b.target = null;
            b.reaction = FLASH_BLIND;
          }
        }
      }
      scene.remove(g.mesh);
      grenades.splice(i, 1);
    }
  }

  return { grenades, throwAt, step };
}
