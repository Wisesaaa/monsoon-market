// Monsoon Market — player movement. Acceleration, friction, gravity,
// crouch and jump, walk and sprint: a body that feels like a person, not
// a camera on rails. Collision is resolved by collide.js (one axis at a
// time, so a wall never swallows the body); this file owns how the body
// wants to move — how fast, how quietly, how it lands.
// The same body is used for the local player and for bots (bots drive it
// through a key set instead of the keyboard).
import * as THREE from 'three';
import { createCollider } from './collide.js';

const STAND_HEIGHT = 1.72;
const CROUCH_HEIGHT = 1.12;
const STAND_EYE = 1.6;
const CROUCH_EYE = 1.02;
// Speeds (m/s). Walk is slow and quiet; run is the default; crouch is
// slow, quiet and low. Sprint is the fastest but loud and inaccurate.
const WALK_SPEED = 2.8;
const RUN_SPEED = 5.2;
const CROUCH_SPEED = 2.4;
const SPRINT_SPEED = 6.4;
const GROUND_ACCEL = 42;
const AIR_ACCEL = 9;
const FRICTION = 9;
// Footstep noise, in hearing.js radii: a sprinting step carries, a
// crouched step barely registers.
const NOISE_RUN = 'footstepRun';
const NOISE_WALK = 'footstepWalk';
const NOISE_CROUCH = 'footstepCrouch';

export function createBody(x, z, yaw) {
  return {
    position: new THREE.Vector3(x, 0, z),
    velocity: new THREE.Vector3(),
    yaw,
    pitch: 0,
    eye: STAND_EYE,
    onGround: true,
    crouching: false,
    height: STAND_HEIGHT,
    // movement mode, recomputed every step: 'walk' | 'run' | 'crouch' | 'sprint'
    mode: 'run',
    // landing: set true the step the body touches down after being airborne
    landed: false,
    landSpeed: 0,
  };
}

export function createMover(colliders) {
  const collider = createCollider(colliders);
  const wish = new THREE.Vector3();

  function stepBody(body, dt, keys, aiming = false) {
    // --- stance: crouch (Ctrl/C), otherwise stand ---
    const crouching = keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyC');
    if (crouching && !body.crouching) {
      body.crouching = true;
      body.height = CROUCH_HEIGHT;
    } else if (!crouching && body.crouching && !collider.overlaps(body.position.x, body.position.y, body.position.z, STAND_HEIGHT, 0.02)) {
      body.crouching = false;
      body.height = STAND_HEIGHT;
    }
    const eyeTarget = body.crouching ? CROUCH_EYE : STAND_EYE;
    body.eye += (eyeTarget - body.eye) * Math.min(1, dt * 12);

    // --- wish direction from the keys (yaw-relative) ---
    const forward = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    wish.set(0, 0, 0);
    if (forward || strafe) {
      const sin = Math.sin(body.yaw);
      const cos = Math.cos(body.yaw);
      wish.set(-sin * forward + cos * strafe, 0, -cos * forward - sin * strafe).normalize();
    }

    // --- movement mode: crouch beats walk beats sprint beats run ---
    // Walk (Shift) is slow and quiet. Sprint is W + no strafe + not
    // crouched + not aiming: fast, loud, and it blocks accurate fire.
    // Aiming (ADS) slows the body to a walk and kills the sprint.
    const walking = keys.has('ShiftLeft') || keys.has('ShiftRight') || aiming;
    const sprinting = forward > 0 && !strafe && !walking && !body.crouching;
    if (body.crouching) body.mode = 'crouch';
    else if (walking) body.mode = 'walk';
    else if (sprinting && wish.lengthSq() > 0) body.mode = 'sprint';
    else body.mode = 'run';
    const speed = body.mode === 'crouch' ? CROUCH_SPEED
      : body.mode === 'walk' ? WALK_SPEED
      : body.mode === 'sprint' ? SPRINT_SPEED
      : RUN_SPEED;

    // --- accelerate toward the wish velocity, friction when idle ---
    const blend = Math.min(1, (body.onGround ? GROUND_ACCEL : AIR_ACCEL) * dt / speed);
    body.velocity.x += (wish.x * speed - body.velocity.x) * blend;
    body.velocity.z += (wish.z * speed - body.velocity.z) * blend;
    if (body.onGround && !wish.lengthSq()) {
      const damp = Math.max(0, 1 - FRICTION * dt);
      body.velocity.x *= damp;
      body.velocity.z *= damp;
    }

    // --- jump + gravity + collision (collide.js owns the solver) ---
    if (keys.has('Space')) collider.jump(body);
    const wasAirborne = !body.onGround;
    const fallSpeed = -body.velocity.y;
    collider.moveAxis(body, dt);
    collider.applyGravity(body, dt);
    // landing: the step the body touches down after falling. The game
    // reads `landed` to dip the camera and play a thud.
    body.landed = wasAirborne && body.onGround;
    body.landSpeed = body.landed ? fallSpeed : 0;
  }

  return {
    stepBody,
    overlaps: collider.overlaps,
    groundSpeed(body) {
      return Math.hypot(body.velocity.x, body.velocity.z);
    },
    // How loud this body's footsteps are right now, as a hearing.js kind.
    // Crouching is nearly silent; sprinting carries across the market.
    stepNoiseKind(body) {
      if (body.mode === 'crouch') return NOISE_CROUCH;
      if (body.mode === 'walk') return NOISE_WALK;
      return NOISE_RUN;
    },
    // 0..1: how fast the body is moving relative to a run. Used for
    // crosshair spread and viewmodel bob.
    speedNorm(body) {
      return Math.min(1, Math.hypot(body.velocity.x, body.velocity.z) / RUN_SPEED);
    },
  };
}
