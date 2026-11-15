// Monsoon Market — player movement. Acceleration, friction, gravity,
// crouch and jump, walk and sprint, stamina, weapon weight, slide and lean.
import * as THREE from 'three';
import { createCollider } from './collide.js';

const STAND_HEIGHT = 1.72;
const CROUCH_HEIGHT = 1.12;
const STAND_EYE = 1.6;
const CROUCH_EYE = 1.02;
const SLIDE_EYE = 0.85;
// Speeds (m/s). Walk is slow and quiet; run is the default; crouch is
// slow, quiet and low; sprint is the fastest but loud and it drains
// stamina; slide is a fast low burst that bleeds speed.
const WALK_SPEED = 2.8;
const RUN_SPEED = 5.2;
const CROUCH_SPEED = 2.4;
const SPRINT_SPEED = 6.4;
const SLIDE_SPEED = 7.0;
const GROUND_ACCEL = 42;
const AIR_ACCEL = 9;
const FRICTION = 9;
// Stamina (0..100). Sprint drains 22/s; walking or standing still
// regens 16/s. Below 10 the body cannot sprint until it recovers to 25.
const STAMINA_MAX = 100;
const STAMINA_DRAIN = 22;
const STAMINA_REGEN = 16;
const STAMINA_MIN_SPRINT = 10;
const STAMINA_RECOVER = 25;
// Weapon weight: heavy weapons slow the body. 1.0 = pistol/knife,
// 0.94 = SMG, 0.9 = rifle, 0.86 = DMR, 0.84 = shotgun.
const WEIGHT = { pistol: 1.0, knife: 1.0, smg: 0.94, rifle: 0.9, dmr: 0.86, shotgun: 0.84 };
// Footstep noise kinds (hearing.js): sprinting carries, crouching barely
// registers, sliding is a loud scrape.
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
    // movement mode, recomputed every step
    mode: 'run', // walk | run | crouch | sprint | slide
    stamina: STAMINA_MAX,
    staminaLocked: false,
    weaponKind: 'pistol', // set by main.js from the equipped weapon
    lean: 0,
    sliding: false,
    slideTime: 0,
    // landing: set true the step the body touches down after being airborne
    landed: false,
    landSpeed: 0,
    landDip: 0,
  };
}

export function createMover(colliders) {
  const collider = createCollider(colliders);
  const wish = new THREE.Vector3();

  function stepBody(body, dt, keys, aiming = false) {
    const leanTarget = (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0);
    body.lean += (leanTarget - body.lean) * Math.min(1, dt * 10);

    const crouchKey = keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyC');
    // slide: crouch while sprinting (or while moving fast) starts a slide
    const speedNow = Math.hypot(body.velocity.x, body.velocity.z);
    if (crouchKey && !body.crouching && body.onGround && speedNow > 4.5 && !body.sliding) {
      body.sliding = true;
      body.slideTime = 0;
      body.crouching = true;
      body.height = CROUCH_HEIGHT;
    }
    if (body.sliding) {
      body.slideTime += dt;
      // a slide lasts at most 0.7s, then the body is just crouched
      if (body.slideTime > 0.7 || speedNow < 2.0) body.sliding = false;
    }
    if (crouchKey && !body.crouching && !body.sliding) {
      body.crouching = true;
      body.height = CROUCH_HEIGHT;
    } else if (!crouchKey && body.crouching && !body.sliding
      && !collider.overlaps(body.position.x, body.position.y, body.position.z, STAND_HEIGHT, 0.02)) {
      body.crouching = false;
      body.height = STAND_HEIGHT;
    }
    const eyeTarget = body.sliding ? SLIDE_EYE : body.crouching ? CROUCH_EYE : STAND_EYE;
    body.eye += (eyeTarget - body.eye) * Math.min(1, dt * 12);

    const forward = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    wish.set(0, 0, 0);
    if (forward || strafe) {
      const sin = Math.sin(body.yaw);
      const cos = Math.cos(body.yaw);
      wish.set(-sin * forward + cos * strafe, 0, -cos * forward - sin * strafe).normalize();
    }

    if (body.staminaLocked && body.stamina >= STAMINA_RECOVER) body.staminaLocked = false;

    // Walk (Shift) is slow and quiet. Sprint is W + no strafe + not
    // crouched + not aiming + stamina left: fast, loud, drains stamina.
    // Aiming (ADS) slows the body to a walk and kills the sprint.
    const walking = keys.has('ShiftLeft') || keys.has('ShiftRight') || aiming;
    const canSprint = !body.staminaLocked && body.stamina > STAMINA_MIN_SPRINT;
    const sprinting = forward > 0 && !strafe && !walking && !body.crouching && canSprint;
    if (body.sliding) body.mode = 'slide';
    else if (body.crouching) body.mode = 'crouch';
    else if (walking) body.mode = 'walk';
    else if (sprinting && wish.lengthSq() > 0) body.mode = 'sprint';
    else body.mode = 'run';
    if (body.mode === 'sprint') {
      body.stamina = Math.max(0, body.stamina - STAMINA_DRAIN * dt);
      if (body.stamina <= 0) body.staminaLocked = true;
    } else if (body.mode === 'walk' || !wish.lengthSq()) {
      body.stamina = Math.min(STAMINA_MAX, body.stamina + STAMINA_REGEN * dt);
    }
    // weapon weight slows every mode a little (a DMR is not a pistol)
    const weight = WEIGHT[body.weaponKind] || 1.0;
    const speed = (body.mode === 'slide' ? SLIDE_SPEED
      : body.mode === 'crouch' ? CROUCH_SPEED
      : body.mode === 'walk' ? WALK_SPEED
      : body.mode === 'sprint' ? SPRINT_SPEED
      : RUN_SPEED) * weight;

    // counter-strafe: reversing direction stops the body faster than
    // plain friction, so a tap of the opposite key is a real stop.
    const wishDotVel = wish.x * body.velocity.x + wish.z * body.velocity.z;
    const accel = body.onGround ? GROUND_ACCEL : AIR_ACCEL;
    const blend = Math.min(1, accel * dt / speed);
    let bx = body.velocity.x + (wish.x * speed - body.velocity.x) * blend;
    let bz = body.velocity.z + (wish.z * speed - body.velocity.z) * blend;
    if (body.onGround && wish.lengthSq() > 0 && wishDotVel < 0) {
      // moving against the wish: brake hard (counter-strafe)
      const brake = Math.max(0, 1 - 14 * dt);
      bx *= brake;
      bz *= brake;
    }
    body.velocity.x = bx;
    body.velocity.z = bz;
    if (body.onGround && !wish.lengthSq()) {
      const damp = Math.max(0, 1 - FRICTION * dt);
      body.velocity.x *= damp;
      body.velocity.z *= damp;
    }
    // a slide keeps its momentum: no friction while sliding
    if (body.sliding && body.onGround) {
      const damp = Math.max(0, 1 - 2.2 * dt);
      body.velocity.x *= damp;
      body.velocity.z *= damp;
    }

    if (keys.has('Space')) collider.jump(body);
    const wasAirborne = !body.onGround;
    const fallSpeed = -body.velocity.y;
    collider.moveAxis(body, dt);
    collider.applyGravity(body, dt);
    // landing: the step the body touches down after falling. The game
    // reads `landed` to dip the camera and play a thud; a hard fall
    // (from a jump at full speed) dips further.
    body.landed = wasAirborne && body.onGround;
    body.landSpeed = body.landed ? fallSpeed : 0;
    if (body.landed) body.landDip = Math.min(1, fallSpeed / 12);
    body.landDip = Math.max(0, body.landDip - dt * 4);
  }

  return {
    stepBody,
    overlaps: collider.overlaps,
    groundSpeed(body) {
      return Math.hypot(body.velocity.x, body.velocity.z);
    },
    // How loud this body's footsteps are right now, as a hearing.js kind.
    stepNoiseKind(body) {
      if (body.sliding) return NOISE_RUN;
      if (body.mode === 'crouch') return NOISE_CROUCH;
      if (body.mode === 'walk') return NOISE_WALK;
      return NOISE_RUN;
    },
    // 0..1: how fast the body is moving relative to a run.
    speedNorm(body) {
      return Math.min(1, Math.hypot(body.velocity.x, body.velocity.z) / RUN_SPEED);
    },
    // 0..1: stamina left. The HUD shows it as a thin bar under health.
    staminaNorm(body) {
      return Math.max(0, Math.min(1, body.stamina / STAMINA_MAX));
    },
  };
}
