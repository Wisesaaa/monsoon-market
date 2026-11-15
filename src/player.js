// Monsoon Market — player movement. Acceleration, friction, gravity,
import * as THREE from 'three';
import { createCollider } from './collide.js';

const STAND_HEIGHT = 1.72;
const CROUCH_HEIGHT = 1.12;
const STAND_EYE = 1.6;
const CROUCH_EYE = 1.02;
const SLIDE_EYE = 0.85;
// Speeds (m/s). Walk is slow and quiet; run is the default; crouch is
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
// ADS speed: how fast the aim-down-sights transition is, per weapon.
// A pistol snaps to the shoulder; a DMR is slow and deliberate.
const ADS_SPEED = { pistol: 14, knife: 14, smg: 11, rifle: 9, dmr: 7, shotgun: 8 };
// Footstep noise kinds (hearing.js): sprinting carries, crouching barely
// registers, sliding is a loud scrape.
const NOISE_RUN = 'footstepRun';
const NOISE_WALK = 'footstepWalk';
const NOISE_CROUCH = 'footstepCrouch';
// Fall damage: falling faster than 9 m/s hurts; 15 m/s is lethal-ish.
// A normal jump lands at ~6 m/s (safe); falling off a stall is ~9-12.
const FALL_SAFE = 9;
const FALL_LETHAL = 15;
const FALL_MAX_DMG = 60;
// Health regen: after 5s without taking damage, regen 8 hp/s up to full.
const REGEN_DELAY = 5;
const REGEN_RATE = 8;
// Bunny-hop penalty: jumping again within 0.4s of landing cuts the
// jump speed by 25% per hop (stacks to 50%), so hopping is not free speed.
const BHOP_WINDOW = 0.4;
const BHOP_PENALTY = 0.25;
const BHOP_MAX = 0.5;
// Sprint jump: jumping while sprinting adds 1.2 m/s forward.
const SPRINT_JUMP_BOOST = 1.2;
// Vault (mantle): jumping against a low obstacle climbs onto it. A wall
const VAULT_MAX = 1.15;
// Landing recovery: a hard landing slows the body for 0.35s.
const LAND_RECOVERY = 0.35;
// Crouch jump: jumping from a crouch is weaker (less upward speed).
const CROUCH_JUMP_MULT = 0.8;
// Jump buffering: pressing jump up to 0.12s before landing queues the
const JUMP_BUFFER = 0.12;
const COYOTE_TIME = 0.1;
// Crouch spam: toggling crouch rapidly (more than 4 times in 1s) briefly
const CROUCH_SPAM_WINDOW = 1;
const CROUCH_SPAM_MAX = 4;
const CROUCH_SPAM_SLOW = 0.6;
const LEAN_ADS_MULT = 0.5;
// FOV kick: sprinting widens the view by 4 degrees; a hard landing
// narrows it briefly. main.js reads fovKick and adds it to the base FOV.
const FOV_SPRINT = 4;
// Strafe accel: strafing (A/D) accelerates a touch slower than running
const STRAFE_ACCEL_MULT = 0.85;
// Head bob: the camera bobs with the feet. stepPhase (from the footstep
// timing) drives it; main.js reads bobPhase for the camera height.
const BOB_AMP = 0.03;

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
    lean: 0, // -1 (left, Q) .. 1 (right, E); camera roll + peek
    sliding: false,
    slideTime: 0,
    // landing: set true the step the body touches down after being airborne
    landed: false,
    landSpeed: 0,
    landDip: 0, // 0..1 camera dip after a hard landing, decays in main.js
    // fall damage: set when a landing was hard enough to hurt
    fallDamage: 0, // hp to subtract (main.js applies it via damage())
    // footstep timing: advances with ground speed; a step fires each
    // time it crosses a whole number (main.js reads stepCount)
    stepPhase: 0,
    stepCount: 0,
    // health regen: main.js sets lastDamageAt when the body is hurt
    lastDamageAt: -99,
    // bunny-hop: how many quick jumps in a row (decays on the ground)
    hopChain: 0,
    lastLandAt: -99,
    // jump buffering: remember a jump press for 0.12s so it fires on landing
    jumpBufferUntil: 0,
    // coyote time: the last moment the body was on the ground
    lastGroundAt: -99,
    // crouch spam: recent crouch toggles (timestamps) for the spam penalty
    crouchToggles: [],
    // was the body crouched last step (to detect a toggle)
    wasCrouching: false,
    // landing recovery: a hard landing slows the body briefly
    landRecoverUntil: 0,
    // vault: the body is climbing onto a low obstacle (see tryVault)
    vaulting: false,
    // reloading: set by main.js while the weapon reloads (no sprint)
    reloading: false,
    // switching: set by main.js while the weapon is being switched (no sprint)
    switching: false,
    // head bob: 0..1 phase of the bob cycle (main.js reads it for the camera)
    bobPhase: 0,
    // FOV kick: +sprint, -landing. main.js adds it to the camera FOV.
    fovKick: 0,
  };
}

// Vault check: is there a low obstacle directly ahead that the body can
function vaultHeight(overlaps, body, dt) {
  if (!body.onGround) return 0;
  const speed = Math.hypot(body.velocity.x, body.velocity.z);
  if (speed < 1.5) return 0;
  // probe ahead at waist height (0.9m) and at head height (1.6m)
  const fx = -Math.sin(body.yaw);
  const fz = -Math.cos(body.yaw);
  const px = body.position.x + fx * 0.5;
  const pz = body.position.z + fz * 0.5;
  const blockedWaist = overlaps(px, body.position.y, pz, 0.9, 0.02);
  const blockedHead = overlaps(px, body.position.y, pz, 1.7, 0.02);
  if (!blockedWaist || blockedHead) return 0;
  // the obstacle is between waist and head height: find its top by
  // probing upward in 0.1m steps (max VAULT_MAX)
  for (let h = 0.9; h <= VAULT_MAX; h += 0.1) {
    if (!overlaps(px, body.position.y + h, pz, 0.1, 0.02)) return h;
  }
  return 0;
}

export function createMover(colliders) {
  const collider = createCollider(colliders);
  const wish = new THREE.Vector3();

  function stepBody(body, dt, keys, aiming = false, now = 0) {
    // --- lean (Q/E): peek around a corner without showing the body ---
    // Leaning while aiming is slower (a held angle is a commitment).
    const leanRate = aiming ? 10 * LEAN_ADS_MULT : 10;
    const leanTarget = (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0);
    body.lean += (leanTarget - body.lean) * Math.min(1, dt * leanRate);

    // --- stance: crouch (Ctrl/C), otherwise stand ---
    const crouchKey = keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyC');
    // crouch spam: toggling crouch more than 4 times in 1s slows the body
    if (crouchKey !== body.wasCrouching) {
      body.crouchToggles.push(now);
      body.wasCrouching = crouchKey;
    }
    body.crouchToggles = body.crouchToggles.filter((t) => now - t < CROUCH_SPAM_WINDOW);
    const crouchSpam = body.crouchToggles.length > CROUCH_SPAM_MAX;
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

    // --- wish direction from the keys (yaw-relative) ---
    const forward = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    wish.set(0, 0, 0);
    if (forward || strafe) {
      const sin = Math.sin(body.yaw);
      const cos = Math.cos(body.yaw);
      wish.set(-sin * forward + cos * strafe, 0, -cos * forward - sin * strafe).normalize();
    }

    // --- stamina: sprint drains, walk/stand regens, empty locks sprint ---
    if (body.staminaLocked && body.stamina >= STAMINA_RECOVER) body.staminaLocked = false;

    // --- movement mode: slide > crouch > walk > sprint > run ---
    const walking = keys.has('ShiftLeft') || keys.has('ShiftRight') || aiming || body.reloading || body.switching;
    const canSprint = !body.staminaLocked && body.stamina > STAMINA_MIN_SPRINT && !body.reloading && !body.switching;
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
    // landing recovery: a hard landing slows the body for 0.35s
    // crouch spam: toggling crouch rapidly briefly slows the body
    const recoverMult = (now < body.landRecoverUntil ? 0.55 : 1.0) * (crouchSpam ? CROUCH_SPAM_SLOW : 1.0);
    const speed = (body.mode === 'slide' ? SLIDE_SPEED
      : body.mode === 'crouch' ? CROUCH_SPEED
      : body.mode === 'walk' ? WALK_SPEED
      : body.mode === 'sprint' ? SPRINT_SPEED
      : RUN_SPEED) * weight * recoverMult;

    // --- accelerate toward the wish velocity, friction when idle ---
    const wishDotVel = wish.x * body.velocity.x + wish.z * body.velocity.z;
    const strafeOnly = forward === 0 && strafe !== 0;
    const accel = (body.onGround ? GROUND_ACCEL : AIR_ACCEL) * (strafeOnly ? STRAFE_ACCEL_MULT : 1);
    const blend = Math.min(1, accel * dt / speed);
    let bx;
    let bz;
    if (body.onGround) {
      bx = body.velocity.x + (wish.x * speed - body.velocity.x) * blend;
      bz = body.velocity.z + (wish.z * speed - body.velocity.z) * blend;
    } else {
      // airborne: add wish * AIR_STEER, keep the existing momentum
      bx = body.velocity.x + wish.x * speed * AIR_STEER * dt * 10;
      bz = body.velocity.z + wish.z * speed * AIR_STEER * dt * 10;
      // cap the air speed so a strafe cannot accelerate past a sprint
      const airSpeed = Math.hypot(bx, bz);
      if (airSpeed > SPRINT_SPEED) {
        bx *= SPRINT_SPEED / airSpeed;
        bz *= SPRINT_SPEED / airSpeed;
      }
    }
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

    // --- jump: sprint jump boosts forward; bunny-hop chains are penalised ---
    if (keys.has('Space')) body.jumpBufferUntil = now + JUMP_BUFFER;
    if (body.onGround) body.lastGroundAt = now;
    const canJump = body.onGround || now - body.lastGroundAt < COYOTE_TIME;
    const jumpQueued = now < body.jumpBufferUntil;
    // Vault first: jumping against a low obstacle climbs onto it instead.
    if (jumpQueued && canJump) {
      body.jumpBufferUntil = 0;
      const vault = vaultHeight(collider.overlaps, body, dt);
      if (vault > 0) {
        body.position.y += vault + 0.05;
        body.velocity.y = 0;
        body.vaulting = true;
        body.onGround = false;
      } else {
        // slide jump: jumping out of a slide cancels it and boosts forward
        const wasSliding = body.sliding;
        if (wasSliding) {
          body.sliding = false;
          body.crouching = false;
          body.height = STAND_HEIGHT;
          body.velocity.x += wish.x * SLIDE_JUMP_BOOST;
          body.velocity.z += wish.z * SLIDE_JUMP_BOOST;
        }
        // bunny-hop: a jump within 0.4s of the last landing is weaker
        if (now - body.lastLandAt < BHOP_WINDOW) {
          body.hopChain = Math.min(body.hopChain + 1, 2);
        } else body.hopChain = 0;
        // crouch jump: jumping from a crouch is weaker
        const crouchMult = body.crouching ? CROUCH_JUMP_MULT : 1;
        // heavy weapons jump slightly lower (weight scales the jump)
        const jumpWeight = Math.max(JUMP_WEIGHT_MIN, WEIGHT[body.weaponKind] || 1.0);
        const hopMult = (1 - Math.min(BHOP_MAX, body.hopChain * BHOP_PENALTY)) * crouchMult * jumpWeight;
        collider.jump(body, hopMult);
        // sprint jump: extra forward speed when jumping at a sprint
        if (body.mode === 'sprint' && wish.lengthSq() > 0) {
          body.velocity.x += wish.x * SPRINT_JUMP_BOOST;
          body.velocity.z += wish.z * SPRINT_JUMP_BOOST;
        }
      }
    }
    const wasAirborne = !body.onGround;
    const fallSpeed = -body.velocity.y;
    collider.moveAxis(body, dt);
    collider.applyGravity(body, dt);
    // landing: the step the body touches down after falling. The game
    body.landed = wasAirborne && body.onGround;
    body.landSpeed = body.landed ? fallSpeed : 0;
    if (body.landed) {
      body.landDip = Math.min(1, fallSpeed / 12);
      body.lastLandAt = now;
      // landing recovery: a hard landing slows the body for 0.35s
      if (fallSpeed > FALL_SAFE) body.landRecoverUntil = now + LAND_RECOVERY;
      // fall damage: a fall faster than 9 m/s hurts, scaled to 60 at 15
      body.fallDamage = fallSpeed > FALL_SAFE
        ? Math.round(Math.min(FALL_MAX_DMG, (fallSpeed - FALL_SAFE) / (FALL_LETHAL - FALL_SAFE) * FALL_MAX_DMG))
        : 0;
    }
    body.landDip = Math.max(0, body.landDip - dt * 4);

    // --- footstep timing: a step fires each time the phase crosses 1 ---
    if (body.onGround) {
      const stepRate = body.mode === 'crouch' ? 1.1 : body.mode === 'walk' ? 1.4 : 2.1;
      const prev = Math.floor(body.stepPhase);
      body.stepPhase += Math.hypot(body.velocity.x, body.velocity.z) / RUN_SPEED * stepRate * dt;
      body.stepCount += Math.floor(body.stepPhase) - prev;
      body.bobPhase = (body.stepPhase % 1);
    }

    // --- FOV kick: sprint widens the view, a hard landing narrows it ---
    const fovTarget = body.mode === 'sprint' ? FOV_SPRINT : -body.landDip * 2;
    body.fovKick += (fovTarget - body.fovKick) * Math.min(1, dt * 8);
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
    // Steps fired since the last call (for footstep sounds + hearing
    // noise). main.js calls this every step and emits one noise per step.
    consumeSteps(body) {
      const n = body.stepCount;
      body.stepCount = 0;
      return n;
    },
    // 0..1: how fast the body is moving relative to a run.
    speedNorm(body) {
      return Math.min(1, Math.hypot(body.velocity.x, body.velocity.z) / RUN_SPEED);
    },
    // 0..1: stamina left. The HUD shows it as a thin bar under health.
    staminaNorm(body) {
      return Math.max(0, Math.min(1, body.stamina / STAMINA_MAX));
    },
    // How fast this weapon's ADS transition is (main.js eases the FOV).
    adsSpeed(body) {
      return ADS_SPEED[body.weaponKind] || 9;
    },
    // Health regen: hp per second to restore right now (0 while in combat).
    // main.js calls this for the player and adds the result to hp.
    regenRate(body, now) {
      if (now - body.lastDamageAt < REGEN_DELAY) return 0;
      return REGEN_RATE;
    },
    // Head bob: how far the camera should rise/fall with the current step,
    // in metres. main.js adds it to the camera height.
    bobOffset(body) {
      if (!body.onGround) return 0;
      const amp = body.mode === 'sprint' ? BOB_AMP * 1.4 : body.mode === 'crouch' ? BOB_AMP * 0.5 : BOB_AMP;
      const norm = Math.min(1, Math.hypot(body.velocity.x, body.velocity.z) / RUN_SPEED);
      return Math.sin(body.bobPhase * Math.PI * 2) * amp * norm;
    },
  };
}
