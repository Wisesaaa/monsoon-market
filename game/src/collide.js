// Monsoon Market — collide.js. The collision solver: a body is an
// axis-aligned box; move one axis at a time so a wall never swallows it.
import * as THREE from 'three';

const RADIUS = 0.34;
const GRAVITY = 20;
const JUMP_SPEED = 6.2;

export function createCollider(colliders) {
  const probe = new THREE.Box3();

  // The collider (if any) that the box at (x, y, z) with `height` overlaps.
  // `lift` shrinks the box slightly so a body standing exactly on a floor
  // does not count as colliding with it.
  function overlaps(x, y, z, height, lift) {
    probe.min.set(x - RADIUS, y + lift, z - RADIUS);
    probe.max.set(x + RADIUS, y + height - lift, z + RADIUS);
    for (const collider of colliders) if (probe.intersectsBox(collider)) return collider;
    return null;
  }

  // Move a body along x, then z, one axis at a time. When an axis is
  // blocked the body stops on that axis (and its velocity on that axis is
  // zeroed) but keeps moving on the other — that is the wall slide.
  function moveAxis(body, dt) {
    const nextX = body.position.x + body.velocity.x * dt;
    if (!overlaps(nextX, body.position.y, body.position.z, body.height, 0.04)) body.position.x = nextX;
    else body.velocity.x = 0;
    const nextZ = body.position.z + body.velocity.z * dt;
    if (!overlaps(body.position.x, body.position.y, nextZ, body.height, 0.04)) body.position.z = nextZ;
    else body.velocity.z = 0;
  }

  // Gravity + the floor. A falling body lands on the first box it hits
  // from above; a body pushed up into a ceiling stops. When nothing is
  // under the body it keeps falling until it reaches the ground plane.
  function applyGravity(body, dt) {
    body.velocity.y -= GRAVITY * dt;
    body.position.y += body.velocity.y * dt;
    body.onGround = false;
    const hit = overlaps(body.position.x, body.position.y, body.position.z, body.height, 0);
    if (hit && body.velocity.y <= 0) {
      body.position.y = hit.max.y;
      body.velocity.y = 0;
      body.onGround = true;
    } else if (hit) {
      body.position.y = hit.min.y - body.height;
      body.velocity.y = 0;
    }
    if (body.position.y < 0) {
      body.position.y = 0;
      body.velocity.y = 0;
      body.onGround = true;
    }
    body.velocity.y = Math.max(-30, body.velocity.y);
  }

  // Start a jump. Only works from the ground.
  function jump(body) {
    if (!body.onGround) return false;
    body.velocity.y = JUMP_SPEED;
    body.onGround = false;
    return true;
  }

  return { overlaps, moveAxis, applyGravity, jump, radius: RADIUS };
}
