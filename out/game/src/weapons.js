// Weapons: the numbers live in state.js; this module owns the view models,
// the magazine, the reload, and the spread that punishes firing on the move.
// One weapon instance per actor, built from the same code for player and bots.
import * as THREE from 'three';
import { WEAPONS } from './state.js';
import { PALETTE } from './palette.js';

const VIEW = {
  rifle: { receiver: [0.09, 0.1, 0.46], barrel: [0.045, 0.045, 0.42], stock: [0.075, 0.08, 0.22], accent: '#ff2e88' },
  smg: { receiver: [0.08, 0.09, 0.36], barrel: [0.04, 0.04, 0.3], stock: [0.07, 0.07, 0.16], accent: '#22d3ee' },
  dmr: { receiver: [0.08, 0.09, 0.5], barrel: [0.04, 0.04, 0.55], stock: [0.07, 0.08, 0.2], accent: '#ffb020' },
  shotgun: { receiver: [0.1, 0.11, 0.4], barrel: [0.06, 0.06, 0.42], stock: [0.08, 0.09, 0.2], accent: '#ff9a3c' },
  pistol: { receiver: [0.07, 0.09, 0.2], barrel: [0.04, 0.04, 0.12], stock: [0.06, 0.1, 0.08], accent: '#ff2e88' },
  knife: { receiver: [0.02, 0.12, 0.3], barrel: [0.015, 0.02, 0.02], stock: [0.03, 0.05, 0.1], accent: '#e9e6df' },
};

export function createWeaponInstance(camera, weaponId) {
  const def = WEAPONS[weaponId];
  const shape = VIEW[def.kind] || VIEW.rifle;
  const grip = new THREE.MeshBasicMaterial({ color: new THREE.Color('#171208') });
  const body = new THREE.MeshBasicMaterial({ color: new THREE.Color('#0b0c10') });
  const accentMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(shape.accent) });

  const model = new THREE.Group();
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(...shape.receiver), body);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(...shape.barrel), grip);
  barrel.position.set(0, 0.025, -0.38);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(...shape.stock), grip);
  stock.position.set(0, -0.02, 0.3);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.16), accentMat);
  stripe.position.set(0, 0.055, -0.1);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.02), accentMat);
  sight.position.set(0, 0.075, -0.5);
  model.add(receiver, barrel, stock, stripe, sight);
  model.position.set(0.28, -0.25, -0.45);
  model.scale.setScalar(0.75);

  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.2),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.neonAmber), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
  );
  flash.position.set(0.24, -0.18, -0.95);
  flash.visible = false;

  const flashLight = new THREE.PointLight(new THREE.Color(PALETTE.neonAmber), 0, 6);
  flashLight.position.set(0.24, -0.16, -0.6);

  const state = {
    id: weaponId, mag: def.mag, reserve: def.reserve,
    cooldown: 0, reloadLeft: 0, flash: 0, kick: 0, bloom: 0,
  };

  function step(dt) {
    state.cooldown = Math.max(0, state.cooldown - dt);
    state.flash = Math.max(0, state.flash - dt);
    state.kick += (0 - state.kick) * Math.min(1, dt * 14);
    state.bloom = Math.max(0, state.bloom - dt * 0.06);
    model.position.z = -0.45 + state.kick;
    model.rotation.x = -0.05 + state.kick * 2.2;
    model.rotation.y = 0.14;
    flash.visible = state.flash > 0;
    flash.rotation.z = state.flash * 12;
    flashLight.intensity = state.flash > 0 ? 18 : 0;
    if (state.reloadLeft > 0) {
      state.reloadLeft = Math.max(0, state.reloadLeft - dt);
      model.rotation.x = -0.55 * Math.min(1, (def.reload - state.reloadLeft) * 2);
      if (state.reloadLeft === 0 && def.mag !== Infinity) {
        const need = def.mag - state.mag;
        const take = Math.min(need, state.reserve);
        state.mag += take;
        state.reserve -= take;
      }
    }
  }

  return {
    state,
    def,
    model,
    flash,
    flashLight,
    step,
    attach(cam) {
      cam.add(model);
      cam.add(flash);
      cam.add(flashLight);
    },
    detach(cam) {
      cam.remove(model);
      cam.remove(flash);
      cam.remove(flashLight);
    },
    ready() {
      return state.mag > 0 && state.cooldown === 0 && state.reloadLeft === 0;
    },
    pullTrigger() {
      state.cooldown = def.fireGap;
      state.flash = 0.06;
      state.kick = def.kind === 'knife' ? 0.02 : 0.055;
      state.bloom = Math.min(0.05, state.bloom + (def.kind === 'smg' ? 0.004 : 0.006));
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
    },
    dispose(cam) {
      if (cam) this.detach(cam);
    },
  };
}
