// Yardline — weapons. Each viewmodel is built from many shapes so its
// silhouette reads as a real gun: a long barrel, a wooden handguard, a
// curved magazine, a stock, and two gloved hands holding it. No single box.
// Animations: walk sway and bob, recoil that kicks up and settles, a reload
// dip with a magazine swap, and a lower/raise on weapon switch.
// The numbers live in state.js; this module owns the look and the feel.
import * as THREE from 'three';
import { WEAPONS } from './state.js';
import { radialSprite } from './textures.js';

const STEEL = new THREE.MeshStandardMaterial({ color: new THREE.Color('#4a4e57'), roughness: 0.4, metalness: 0.7, emissive: new THREE.Color('#23262b'), emissiveIntensity: 0.7 });
const STEEL_DARK = new THREE.MeshStandardMaterial({ color: new THREE.Color('#33373e'), roughness: 0.5, metalness: 0.6, emissive: new THREE.Color('#1c1f24'), emissiveIntensity: 0.7 });
const WOOD = new THREE.MeshStandardMaterial({ color: new THREE.Color('#7a5230'), roughness: 0.75, metalness: 0.05, emissive: new THREE.Color('#2a1a0c'), emissiveIntensity: 0.5 });
const WOOD_DARK = new THREE.MeshStandardMaterial({ color: new THREE.Color('#5f3d22'), roughness: 0.8, metalness: 0.05, emissive: new THREE.Color('#20140a'), emissiveIntensity: 0.5 });
const TAN = new THREE.MeshStandardMaterial({ color: new THREE.Color('#8a7a5c'), roughness: 0.75, metalness: 0.05, emissive: new THREE.Color('#2a241a'), emissiveIntensity: 0.5 });
const TAN_DARK = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6b5d45'), roughness: 0.8, metalness: 0.05, emissive: new THREE.Color('#1e1810'), emissiveIntensity: 0.5 });
const GLOVE = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6b5a3a'), roughness: 0.9, metalness: 0, emissive: new THREE.Color('#1e180c'), emissiveIntensity: 0.5 });
const BRASS = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c9a227'), roughness: 0.35, metalness: 0.9 });
const POLYMER = new THREE.MeshStandardMaterial({ color: new THREE.Color('#23262b'), roughness: 0.7, metalness: 0.2 });

function box(w, h, d, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = false;
  return m;
}
function cyl(r, len, mat, x = 0, y = 0, z = 0, rx = Math.PI / 2) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat);
  m.position.set(x, y, z);
  m.rotation.x = rx;
  m.castShadow = false;
  return m;
}

// --- viewmodel builders: each returns { group, muzzle } where muzzle is the
// local position of the barrel tip (camera space, model at its base pose). ---
function buildRifle() {
  // LONGHAUL AR rebuilt from Yiro's reference sheet (AR-15 carbine, two-tone
  // black + tan/FDE): long M-LOK handguard, holographic red-dot, tan
  // vertical foregrip, curved tan mag, collapsible tan stock, birdcage
  // flash hider. Built pointing -z; the muzzle is at z = -0.72.
  const g = new THREE.Group();
  // receiver (black) + ejection port + selector + charging handle
  g.add(box(0.09, 0.11, 0.42, STEEL_DARK)); // receiver
  g.add(box(0.095, 0.04, 0.12, STEEL, 0.0, 0.02, -0.02)); // ejection port (right side)
  g.add(box(0.02, 0.02, 0.05, STEEL, 0.055, 0.0, 0.06)); // fire selector
  g.add(box(0.06, 0.02, 0.02, STEEL, 0, 0.06, 0.2)); // charging handle (T)
  // long barrel + birdcage flash hider (cylinder with slots)
  g.add(cyl(0.02, 0.52, STEEL, 0, 0.02, -0.44));
  g.add(cyl(0.026, 0.07, STEEL_DARK, 0, 0.02, -0.7));
  g.add(box(0.056, 0.02, 0.05, STEEL, 0, 0.02, -0.7)); // flash hider slots
  // M-LOK handguard (black, free-float) with side slots + top rail
  g.add(box(0.085, 0.1, 0.34, STEEL_DARK, 0, -0.01, -0.34));
  for (let i = 0; i < 4; i += 1) {
    // M-LOK slots on both sides
    g.add(box(0.005, 0.02, 0.06, STEEL, 0.044, -0.01, -0.46 + i * 0.08));
    g.add(box(0.005, 0.02, 0.06, STEEL, -0.044, -0.01, -0.46 + i * 0.08));
  }
  // top rail: thin strip with slots along receiver + handguard
  g.add(box(0.04, 0.015, 0.56, STEEL_DARK, 0, 0.062, -0.2));
  for (let i = 0; i < 7; i += 1) {
    g.add(box(0.045, 0.018, 0.012, STEEL, 0, 0.062, -0.44 + i * 0.07));
  }
  // holographic red-dot sight (boxy housing + round lens + hood)
  g.add(box(0.06, 0.07, 0.09, STEEL_DARK, 0, 0.11, 0.0)); // sight housing
  g.add(box(0.05, 0.05, 0.01, STEEL, 0, 0.11, -0.05)); // lens hood (front)
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2e1e') }));
  lens.position.set(0, 0.11, -0.056);
  lens.rotation.y = Math.PI;
  g.add(lens);
  g.add(box(0.03, 0.02, 0.03, STEEL, 0, 0.15, 0.0)); // sight top knob
  // vertical foregrip (tan, stubby, ribbed) under the handguard
  g.add(box(0.045, 0.11, 0.05, TAN, 0, -0.11, -0.38, 0.08));
  g.add(box(0.05, 0.012, 0.055, TAN_DARK, 0, -0.09, -0.38, 0.08)); // rib 1
  g.add(box(0.05, 0.012, 0.055, TAN_DARK, 0, -0.12, -0.38, 0.08)); // rib 2
  g.add(box(0.05, 0.012, 0.055, TAN_DARK, 0, -0.15, -0.38, 0.08)); // rib 3
  // curved tan magazine (three segments, each tilted a little more)
  g.add(box(0.05, 0.13, 0.07, TAN, 0, -0.11, -0.04, 0.12));
  g.add(box(0.05, 0.12, 0.07, TAN, 0, -0.2, -0.09, 0.32));
  g.add(box(0.05, 0.1, 0.06, TAN, 0, -0.27, -0.15, 0.55));
  g.add(box(0.055, 0.02, 0.075, TAN_DARK, 0, -0.31, -0.18, 0.55)); // mag baseplate
  // collapsible tan stock: cheek riser + butt plate + sling loop
  g.add(box(0.07, 0.08, 0.2, TAN, 0, 0.0, 0.3)); // stock body
  g.add(box(0.07, 0.03, 0.22, TAN_DARK, 0, 0.045, 0.3)); // cheek riser
  g.add(box(0.075, 0.12, 0.03, TAN_DARK, 0, -0.01, 0.41)); // butt plate
  g.add(box(0.02, 0.05, 0.02, STEEL_DARK, 0, -0.08, 0.4)); // sling loop
  g.add(box(0.05, 0.02, 0.1, STEEL_DARK, 0, -0.05, 0.26)); // buffer tube
  // pistol grip (tan, angled, beavertail)
  g.add(box(0.06, 0.13, 0.07, TAN, 0, -0.11, 0.12, 0.35));
  g.add(box(0.065, 0.03, 0.075, TAN_DARK, 0, -0.06, 0.12, 0.35)); // beavertail
  // trigger + trigger guard
  g.add(box(0.015, 0.04, 0.015, STEEL, 0, -0.07, 0.02));
  g.add(box(0.015, 0.02, 0.1, STEEL_DARK, 0, -0.09, 0.02)); // trigger guard
  // front sight post (folded low, under the rail) + rear sight
  g.add(box(0.02, 0.04, 0.02, STEEL, 0, 0.08, -0.66));
  g.add(box(0.05, 0.02, 0.06, STEEL, 0, 0.07, 0.16)); // rear sight
  // two gloved hands: rear on the grip, front on the foregrip
  g.add(box(0.1, 0.1, 0.13, GLOVE, 0, -0.11, 0.12, 0.35)); // rear hand on grip
  g.add(box(0.09, 0.1, 0.1, GLOVE, 0, -0.12, -0.38, 0.08)); // front hand on foregrip
  return { group: g, muzzle: new THREE.Vector3(0, 0.02, -0.72) };
}

function buildSmg() {
  const g = new THREE.Group();
  g.add(box(0.08, 0.09, 0.34, STEEL_DARK)); // receiver
  g.add(cyl(0.018, 0.3, STEEL, 0, 0.015, -0.3)); // short barrel
  g.add(box(0.07, 0.07, 0.2, POLYMER, 0, -0.01, -0.2)); // handguard
  g.add(box(0.045, 0.2, 0.06, STEEL, 0, -0.14, -0.02)); // straight magazine
  g.add(box(0.06, 0.07, 0.16, POLYMER, 0, -0.01, 0.24, -0.1)); // folding stock
  g.add(box(0.055, 0.11, 0.06, POLYMER, 0, -0.1, 0.1, 0.3)); // grip
  g.add(box(0.02, 0.04, 0.02, STEEL, 0, 0.06, -0.44)); // front sight
  g.add(box(0.04, 0.02, 0.05, STEEL, 0, 0.055, 0.1)); // rear sight
  g.add(box(0.05, 0.09, 0.06, POLYMER, 0, -0.1, -0.2, 0.15)); // front vertical grip
  g.add(box(0.09, 0.09, 0.12, GLOVE, 0, -0.1, 0.1, 0.3)); // rear hand
  g.add(box(0.09, 0.08, 0.12, GLOVE, 0, -0.1, -0.2, 0.15)); // front hand
  return { group: g, muzzle: new THREE.Vector3(0, 0.015, -0.46) };
}

function buildPistol() {
  const g = new THREE.Group();
  g.add(box(0.06, 0.07, 0.24, STEEL_DARK, 0, 0.01, -0.05)); // slide
  g.add(box(0.055, 0.05, 0.22, STEEL, 0, -0.03, -0.04)); // frame
  g.add(box(0.055, 0.14, 0.07, POLYMER, 0, -0.1, 0.06, 0.25)); // grip
  g.add(box(0.015, 0.03, 0.015, STEEL, 0, 0.055, -0.16)); // front sight
  g.add(box(0.04, 0.02, 0.03, STEEL, 0, 0.05, 0.05)); // rear sight
  g.add(cyl(0.016, 0.1, STEEL, 0, 0.01, -0.19)); // barrel tip
  g.add(box(0.09, 0.1, 0.12, GLOVE, 0, -0.1, 0.06, 0.25)); // main hand
  g.add(box(0.08, 0.08, 0.1, GLOVE, 0.02, -0.09, -0.02, 0.2)); // support hand
  return { group: g, muzzle: new THREE.Vector3(0, 0.01, -0.24) };
}

function buildDmr() {
  const g = new THREE.Group();
  g.add(box(0.08, 0.1, 0.48, STEEL_DARK)); // receiver
  g.add(cyl(0.018, 0.62, STEEL, 0, 0.02, -0.5)); // long barrel
  g.add(cyl(0.03, 0.2, STEEL_DARK, 0, 0.09, -0.08)); // scope tube
  g.add(cyl(0.038, 0.04, STEEL_DARK, 0, 0.09, -0.18)); // scope bell
  g.add(box(0.07, 0.08, 0.26, WOOD, 0, -0.015, -0.3)); // handguard
  g.add(box(0.045, 0.1, 0.06, STEEL, 0, -0.11, -0.02, 0.1)); // straight mag
  g.add(box(0.07, 0.09, 0.26, WOOD, 0, -0.02, 0.32, -0.05)); // stock
  g.add(box(0.055, 0.12, 0.06, POLYMER, 0, -0.11, 0.11, 0.3)); // grip
  g.add(box(0.09, 0.09, 0.12, GLOVE, 0, -0.11, 0.11, 0.3)); // rear hand
  g.add(box(0.09, 0.08, 0.13, GLOVE, 0, -0.07, -0.3)); // front hand
  return { group: g, muzzle: new THREE.Vector3(0, 0.02, -0.82) };
}

function buildShotgun() {
  const g = new THREE.Group();
  g.add(box(0.1, 0.11, 0.4, STEEL_DARK)); // receiver
  g.add(cyl(0.03, 0.5, STEEL, 0, 0.02, -0.42)); // thick barrel
  g.add(cyl(0.022, 0.46, STEEL_DARK, 0, -0.03, -0.4)); // magazine tube
  g.add(box(0.09, 0.08, 0.2, WOOD, 0, -0.07, -0.32)); // pump
  g.add(box(0.08, 0.1, 0.24, WOOD, 0, -0.02, 0.3, -0.06)); // stock
  g.add(box(0.06, 0.12, 0.07, POLYMER, 0, -0.11, 0.11, 0.3)); // grip
  g.add(box(0.02, 0.05, 0.02, STEEL, 0, 0.08, -0.64)); // front bead
  g.add(box(0.09, 0.09, 0.12, GLOVE, 0, -0.11, 0.11, 0.3)); // rear hand
  g.add(box(0.1, 0.09, 0.14, GLOVE, 0, -0.08, -0.32)); // front hand on pump
  return { group: g, muzzle: new THREE.Vector3(0, 0.02, -0.68) };
}

function buildKnife() {
  const g = new THREE.Group();
  const blade = box(0.015, 0.09, 0.3, new THREE.MeshStandardMaterial({ color: new THREE.Color('#b9bec6'), roughness: 0.25, metalness: 0.9 }), 0, 0.02, -0.2, -0.5);
  g.add(blade);
  g.add(box(0.04, 0.06, 0.14, POLYMER, 0, -0.02, 0.02, -0.5)); // handle
  g.add(box(0.09, 0.1, 0.13, GLOVE, 0, -0.02, 0.02, -0.5)); // hand
  return { group: g, muzzle: new THREE.Vector3(0, 0.02, -0.35) };
}

const BUILDERS = {
  rifle: buildRifle,
  smg: buildSmg,
  pistol: buildPistol,
  dmr: buildDmr,
  shotgun: buildShotgun,
  knife: buildKnife,
};

const BASE_POS = new THREE.Vector3(0.28, -0.25, -0.45);
const BASE_ROT_Y = 0.1;

export function createWeaponInstance(camera, weaponId) {
  const def = WEAPONS[weaponId];
  const built = (BUILDERS[def.kind] || buildRifle)();
  const model = built.group;
  model.position.copy(BASE_POS);
  model.scale.setScalar(0.95);
  model.rotation.y = BASE_ROT_Y;

  // muzzle flash: a bright sprite + a short-lived point light, both at the muzzle
  const flashTex = radialSprite('rgba(255, 240, 180, 1)', 'rgba(255, 140, 40, 0.55)');
  const flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: flashTex, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  flashSprite.position.copy(built.muzzle);
  flashSprite.scale.set(0.22, 0.22, 1);
  flashSprite.visible = false;
  model.add(flashSprite);
  const flashLight = new THREE.PointLight(new THREE.Color('#ffb45e'), 0, 7, 1.6);
  flashLight.position.copy(built.muzzle);
  model.add(flashLight);

  const state = {
    id: weaponId, mag: def.mag, reserve: def.reserve,
    cooldown: 0, reloadLeft: 0, flash: 0, kick: 0, bloom: 0,
    swayX: 0, swayY: 0, bobPhase: 0, switchT: 0,
  };

  function step(dt, move) {
    state.cooldown = Math.max(0, state.cooldown - dt);
    state.flash = Math.max(0, state.flash - dt);
    state.kick += (0 - state.kick) * Math.min(1, dt * 11);
    state.bloom = Math.max(0, state.bloom - dt * 0.05);
    // weapon switch: lower, then raise
    if (state.switchT > 0) state.switchT = Math.max(0, state.switchT - dt);
    // sway + bob only when we have movement input (the player's viewmodel)
    let swayX = 0;
    let swayY = 0;
    let bobY = 0;
    let bobX = 0;
    if (move) {
      const speed = move.speed || 0;
      state.bobPhase += dt * (2 + speed * 1.6);
      const bobAmp = Math.min(1, speed / 5.2) * 0.012;
      bobY = Math.abs(Math.sin(state.bobPhase)) * bobAmp;
      bobX = Math.sin(state.bobPhase * 0.5) * bobAmp * 0.5;
      const targetSwayX = THREE.MathUtils.clamp(-(move.lookX || 0) * 0.0016, -0.03, 0.03);
      const targetSwayY = THREE.MathUtils.clamp((move.lookY || 0) * 0.0016, -0.025, 0.025);
      state.swayX += (targetSwayX - state.swayX) * Math.min(1, dt * 10);
      state.swayY += (targetSwayY - state.swayY) * Math.min(1, dt * 10);
      swayX = state.swayX;
      swayY = state.swayY;
      // sway also decays when the mouse stops
      state.swayX *= Math.max(0, 1 - dt * 6);
      state.swayY *= Math.max(0, 1 - dt * 6);
    }
    // reload dip: the gun tilts down and drops, magazine swaps mid-way
    let reloadDip = 0;
    let reloadTilt = 0;
    if (state.reloadLeft > 0) {
      state.reloadLeft = Math.max(0, state.reloadLeft - dt);
      const t = 1 - state.reloadLeft / def.reload; // 0..1 through the reload
      reloadDip = Math.sin(t * Math.PI) * 0.14;
      reloadTilt = Math.sin(t * Math.PI) * 0.7;
      if (state.reloadLeft === 0 && def.mag !== Infinity) {
        const need = def.mag - state.mag;
        const take = Math.min(need, state.reserve);
        state.mag += take;
        state.reserve -= take;
      }
    }
    // switch lower: drops down 0.3s after equip
    const switchDip = state.switchT > 0 ? Math.sin((state.switchT / 0.3) * Math.PI) * 0.16 : 0;
    model.position.set(
      BASE_POS.x + bobX + swayX,
      BASE_POS.y - bobY - reloadDip - switchDip,
      BASE_POS.z + state.kick,
    );
    model.rotation.set(
      -0.03 + state.kick * 2.4 - reloadTilt,
      BASE_ROT_Y + swayX * 0.6,
      swayY * 0.5,
    );
    flashSprite.visible = state.flash > 0;
    if (state.flash > 0) {
      const s = 0.16 + Math.random() * 0.12;
      flashSprite.scale.set(s, s, 1);
      flashSprite.material.rotation = Math.random() * Math.PI;
    }
    flashLight.intensity = state.flash > 0 ? 26 : 0;
  }

  return {
    state,
    def,
    model,
    flash: flashSprite,
    flashLight,
    muzzleLocal: built.muzzle,
    step,
    attach(cam) {
      cam.add(model);
      state.switchT = 0.3; // raise-in animation on equip
    },
    detach(cam) {
      cam.remove(model);
    },
    ready() {
      return state.mag > 0 && state.cooldown === 0 && state.reloadLeft === 0 && state.switchT === 0;
    },
    pullTrigger() {
      state.cooldown = def.fireGap;
      state.flash = 0.055;
      state.kick = def.kind === 'knife' ? 0.015 : 0.05;
      state.bloom = Math.min(0.055, state.bloom + (def.bloomPerShot || 0.004));
    },
    takeRound() {
      if (def.mag === Infinity) return true;
      if (state.mag <= 0) return false;
      state.mag -= 1;
      return true;
    },
    reload() {
      if (state.reloadLeft > 0 || state.mag === def.mag || state.reserve === 0 || def.mag === Infinity) return false;
      state.reloadLeft = def.reload;
      return true;
    },
    spread(speed) {
      const moving = Math.min(1, speed / 5.2);
      return def.spreadStill + moving * def.spreadMove + state.bloom;
    },
    refill() {
      state.mag = def.mag;
      state.reserve = def.reserve;
      state.cooldown = 0;
      state.reloadLeft = 0;
      state.flash = 0;
      state.kick = 0;
      state.bloom = 0;
      state.switchT = 0;
    },
    dispose(cam) {
      if (cam) this.detach(cam);
    },
  };
}
