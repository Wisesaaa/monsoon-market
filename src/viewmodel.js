// Monsoon Market — viewmodel.js. The first-person gun: the model you
// see, its sway/bob/recoil/reload/switch animation, muzzle flash and ADS.
import * as THREE from 'three';
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

// --- builders: each returns { group, muzzle } where muzzle is the local
// position of the barrel tip (camera space, model at its base pose). ---
function buildRifle() {
  // MONSOON AR rebuilt from Yiro's reference sheet (AR-15 carbine, two-tone
  // black + tan/FDE): long M-LOK handguard, holographic red-dot, tan
  // vertical foregrip, curved tan mag, collapsible tan stock, birdcage
  // flash hider. Built pointing -z; the muzzle is at z = -0.72.
  const g = new THREE.Group();
  g.add(box(0.09, 0.11, 0.42, STEEL_DARK));
  g.add(box(0.095, 0.04, 0.12, STEEL, 0.0, 0.02, -0.02));
  g.add(box(0.02, 0.02, 0.05, STEEL, 0.055, 0.0, 0.06));
  g.add(box(0.06, 0.02, 0.02, STEEL, 0, 0.06, 0.2));
  g.add(cyl(0.02, 0.52, STEEL, 0, 0.02, -0.44));
  g.add(cyl(0.026, 0.07, STEEL_DARK, 0, 0.02, -0.7));
  g.add(box(0.056, 0.02, 0.05, STEEL, 0, 0.02, -0.7));
  g.add(box(0.085, 0.1, 0.34, STEEL_DARK, 0, -0.01, -0.34));
  for (let i = 0; i < 4; i += 1) {
    g.add(box(0.005, 0.02, 0.06, STEEL, 0.044, -0.01, -0.46 + i * 0.08));
    g.add(box(0.005, 0.02, 0.06, STEEL, -0.044, -0.01, -0.46 + i * 0.08));
  }
  g.add(box(0.04, 0.015, 0.56, STEEL_DARK, 0, 0.062, -0.2));
  for (let i = 0; i < 7; i += 1) {
    g.add(box(0.045, 0.018, 0.012, STEEL, 0, 0.062, -0.44 + i * 0.07));
  }
  g.add(box(0.06, 0.07, 0.09, STEEL_DARK, 0, 0.11, 0.0));
  g.add(box(0.05, 0.05, 0.01, STEEL, 0, 0.11, -0.05));
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2e1e') }));
  lens.position.set(0, 0.11, -0.056);
  lens.rotation.y = Math.PI;
  g.add(lens);
  g.add(box(0.03, 0.02, 0.03, STEEL, 0, 0.15, 0.0));
  g.add(box(0.045, 0.11, 0.05, TAN, 0, -0.11, -0.38, 0.08));
  g.add(box(0.05, 0.012, 0.055, TAN_DARK, 0, -0.09, -0.38, 0.08));
  g.add(box(0.05, 0.012, 0.055, TAN_DARK, 0, -0.12, -0.38, 0.08));
  g.add(box(0.05, 0.012, 0.055, TAN_DARK, 0, -0.15, -0.38, 0.08));
  g.add(box(0.05, 0.13, 0.07, TAN, 0, -0.11, -0.04, 0.12));
  g.add(box(0.05, 0.12, 0.07, TAN, 0, -0.2, -0.09, 0.32));
  g.add(box(0.05, 0.1, 0.06, TAN, 0, -0.27, -0.15, 0.55));
  g.add(box(0.055, 0.02, 0.075, TAN_DARK, 0, -0.31, -0.18, 0.55));
  g.add(box(0.07, 0.08, 0.2, TAN, 0, 0.0, 0.3));
  g.add(box(0.07, 0.03, 0.22, TAN_DARK, 0, 0.045, 0.3));
  g.add(box(0.075, 0.12, 0.03, TAN_DARK, 0, -0.01, 0.41));
  g.add(box(0.02, 0.05, 0.02, STEEL_DARK, 0, -0.08, 0.4));
  g.add(box(0.05, 0.02, 0.1, STEEL_DARK, 0, -0.05, 0.26));
  g.add(box(0.06, 0.13, 0.07, TAN, 0, -0.11, 0.12, 0.35));
  g.add(box(0.065, 0.03, 0.075, TAN_DARK, 0, -0.06, 0.12, 0.35));
  g.add(box(0.015, 0.04, 0.015, STEEL, 0, -0.07, 0.02));
  g.add(box(0.015, 0.02, 0.1, STEEL_DARK, 0, -0.09, 0.02));
  g.add(box(0.02, 0.04, 0.02, STEEL, 0, 0.08, -0.66));
  g.add(box(0.05, 0.02, 0.06, STEEL, 0, 0.07, 0.16));
  g.add(box(0.1, 0.1, 0.13, GLOVE, 0, -0.11, 0.12, 0.35));
  g.add(box(0.09, 0.1, 0.1, GLOVE, 0, -0.12, -0.38, 0.08));
  return { group: g, muzzle: new THREE.Vector3(0, 0.02, -0.72) };
}

function buildSmg() {
  const g = new THREE.Group();
  g.add(box(0.08, 0.09, 0.34, STEEL_DARK));
  g.add(cyl(0.018, 0.3, STEEL, 0, 0.015, -0.3));
  g.add(box(0.07, 0.07, 0.2, POLYMER, 0, -0.01, -0.2));
  g.add(box(0.045, 0.2, 0.06, STEEL, 0, -0.14, -0.02));
  g.add(box(0.06, 0.07, 0.16, POLYMER, 0, -0.01, 0.24, -0.1));
  g.add(box(0.055, 0.11, 0.06, POLYMER, 0, -0.1, 0.1, 0.3));
  g.add(box(0.02, 0.04, 0.02, STEEL, 0, 0.06, -0.44));
  g.add(box(0.04, 0.02, 0.05, STEEL, 0, 0.055, 0.1));
  g.add(box(0.05, 0.09, 0.06, POLYMER, 0, -0.1, -0.2, 0.15));
  g.add(box(0.09, 0.09, 0.12, GLOVE, 0, -0.1, 0.1, 0.3));
  g.add(box(0.09, 0.08, 0.12, GLOVE, 0, -0.1, -0.2, 0.15));
  return { group: g, muzzle: new THREE.Vector3(0, 0.015, -0.46) };
}

function buildPistol() {
  const g = new THREE.Group();
  g.add(box(0.06, 0.07, 0.24, STEEL_DARK, 0, 0.01, -0.05));
  g.add(box(0.055, 0.05, 0.22, STEEL, 0, -0.03, -0.04));
  g.add(box(0.055, 0.14, 0.07, POLYMER, 0, -0.1, 0.06, 0.25));
  g.add(box(0.015, 0.03, 0.015, STEEL, 0, 0.055, -0.16));
  g.add(box(0.04, 0.02, 0.03, STEEL, 0, 0.05, 0.05));
  g.add(cyl(0.016, 0.1, STEEL, 0, 0.01, -0.19));
  g.add(box(0.09, 0.1, 0.12, GLOVE, 0, -0.1, 0.06, 0.25));
  g.add(box(0.08, 0.08, 0.1, GLOVE, 0.02, -0.09, -0.02, 0.2));
  return { group: g, muzzle: new THREE.Vector3(0, 0.01, -0.24) };
}

function buildDmr() {
  const g = new THREE.Group();
  g.add(box(0.08, 0.1, 0.48, STEEL_DARK));
  g.add(cyl(0.018, 0.62, STEEL, 0, 0.02, -0.5));
  g.add(cyl(0.03, 0.2, STEEL_DARK, 0, 0.09, -0.08));
  g.add(cyl(0.038, 0.04, STEEL_DARK, 0, 0.09, -0.18));
  g.add(box(0.07, 0.08, 0.26, WOOD, 0, -0.015, -0.3));
  g.add(box(0.045, 0.1, 0.06, STEEL, 0, -0.11, -0.02, 0.1));
  g.add(box(0.07, 0.09, 0.26, WOOD, 0, -0.02, 0.32, -0.05));
  g.add(box(0.055, 0.12, 0.06, POLYMER, 0, -0.11, 0.11, 0.3));
  g.add(box(0.09, 0.09, 0.12, GLOVE, 0, -0.11, 0.11, 0.3));
  g.add(box(0.09, 0.08, 0.13, GLOVE, 0, -0.07, -0.3));
  return { group: g, muzzle: new THREE.Vector3(0, 0.02, -0.82) };
}

function buildShotgun() {
  const g = new THREE.Group();
  g.add(box(0.1, 0.11, 0.4, STEEL_DARK));
  g.add(cyl(0.03, 0.5, STEEL, 0, 0.02, -0.42));
  g.add(cyl(0.022, 0.46, STEEL_DARK, 0, -0.03, -0.4));
  g.add(box(0.09, 0.08, 0.2, WOOD, 0, -0.07, -0.32));
  g.add(box(0.08, 0.1, 0.24, WOOD, 0, -0.02, 0.3, -0.06));
  g.add(box(0.06, 0.12, 0.07, POLYMER, 0, -0.11, 0.11, 0.3));
  g.add(box(0.02, 0.05, 0.02, STEEL, 0, 0.08, -0.64));
  g.add(box(0.09, 0.09, 0.12, GLOVE, 0, -0.11, 0.11, 0.3));
  g.add(box(0.1, 0.09, 0.14, GLOVE, 0, -0.08, -0.32));
  return { group: g, muzzle: new THREE.Vector3(0, 0.02, -0.68) };
}

function buildKnife() {
  const g = new THREE.Group();
  const blade = box(0.015, 0.09, 0.3, new THREE.MeshStandardMaterial({ color: new THREE.Color('#b9bec6'), roughness: 0.25, metalness: 0.9 }), 0, 0.02, -0.2, -0.5);
  g.add(blade);
  g.add(box(0.04, 0.06, 0.14, POLYMER, 0, -0.02, 0.02, -0.5));
  g.add(box(0.09, 0.1, 0.13, GLOVE, 0, -0.02, 0.02, -0.5));
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
const ADS_POS = new THREE.Vector3(0, -0.14, -0.35);
const BASE_ROT_Y = 0.1;

// A viewmodel: the gun model + its animation state. `step(dt, move)`
// drives sway, bob, recoil, reload dip, switch raise and ADS. `kick()`
// and `flash()` are called by the weapon when it fires; `setReloading`
// and `setSwitching` by the weapon when it reloads or is equipped.
// `aiming` is 0..1: 0 = hip, 1 = fully aimed down the sights.
export function createViewmodel(kind) {
  const built = (BUILDERS[kind] || buildRifle)();
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
    flash: 0, kick: 0,
    swayX: 0, swayY: 0, bobPhase: 0,
    aiming: 0,
    adsTarget: 0,
    reloadT: 0, reloadDur: 1,
    switchT: 0,
  };

  function step(dt, move) {
    state.flash = Math.max(0, state.flash - dt);
    state.kick += (0 - state.kick) * Math.min(1, dt * 11);
    // ADS eases in/out over ~0.15s; sway and bob shrink while aiming
    state.aiming += (state.adsTarget - state.aiming) * Math.min(1, dt * 12);
    const ads = state.aiming;
    let swayX = 0;
    let swayY = 0;
    let bobY = 0;
    let bobX = 0;
    if (move) {
      const speed = move.speed || 0;
      state.bobPhase += dt * (2 + speed * 1.6);
      const bobAmp = Math.min(1, speed / 5.2) * 0.012 * (1 - ads * 0.8);
      bobY = Math.abs(Math.sin(state.bobPhase)) * bobAmp;
      bobX = Math.sin(state.bobPhase * 0.5) * bobAmp * 0.5;
      const targetSwayX = THREE.MathUtils.clamp(-(move.lookX || 0) * 0.0016, -0.03, 0.03);
      const targetSwayY = THREE.MathUtils.clamp((move.lookY || 0) * 0.0016, -0.025, 0.025);
      state.swayX += (targetSwayX - state.swayX) * Math.min(1, dt * 10);
      state.swayY += (targetSwayY - state.swayY) * Math.min(1, dt * 10);
      swayX = state.swayX * (1 - ads * 0.7);
      swayY = state.swayY * (1 - ads * 0.7);
      state.swayX *= Math.max(0, 1 - dt * 6);
      state.swayY *= Math.max(0, 1 - dt * 6);
    }
    // reload dip: the gun tilts down and drops, magazine swaps mid-way
    let reloadDip = 0;
    let reloadTilt = 0;
    if (state.reloadT > 0) {
      reloadDip = Math.sin(state.reloadT * Math.PI) * 0.14;
      reloadTilt = Math.sin(state.reloadT * Math.PI) * 0.7;
    }
    // switch lower: drops down 0.3s after equip
    const switchDip = state.switchT > 0 ? Math.sin((state.switchT / 0.3) * Math.PI) * 0.16 : 0;
    // ADS: the gun slides to the centre of the screen and the sight lines up
    const pos = new THREE.Vector3().lerpVectors(BASE_POS, ADS_POS, ads);
    model.position.set(
      pos.x + bobX + swayX,
      pos.y - bobY - reloadDip - switchDip,
      pos.z + state.kick,
    );
    model.rotation.set(
      -0.03 + state.kick * 2.4 - reloadTilt,
      BASE_ROT_Y * (1 - ads) + swayX * 0.6,
      swayY * 0.5,
    );
    flashSprite.visible = state.flash > 0;
    if (state.flash > 0) {
      const s = 0.16 + Math.random() * 0.12;
      flashSprite.scale.set(s, s, 1);
      flashSprite.material.rotation = Math.random() * Math.PI;
    }
    flashLight.intensity = state.flash > 0 ? 26 : 0;
    if (state.switchT > 0) state.switchT = Math.max(0, state.switchT - dt);
  }

  return {
    model,
    flash: flashSprite,
    flashLight,
    muzzleLocal: built.muzzle,
    state,
    step,
    kick(amount) {
      state.kick = amount;
    },
    showFlash() {
      state.flash = 0.055;
    },
    setAiming(on) {
      state.adsTarget = on ? 1 : 0;
    },
    isAiming() {
      return state.aiming > 0.5;
    },
    // 0..1 spread multiplier from ADS: aiming tightens the spread a lot.
    adsSpreadMult() {
      return 1 - state.aiming * 0.55;
    },
    setReload(progress) {
      state.reloadT = progress;
    },
    setSwitching(seconds) {
      state.switchT = seconds;
    },
    attach(cam) {
      cam.add(model);
      state.switchT = 0.3;
    },
    detach(cam) {
      cam.remove(model);
    },
  };
}
