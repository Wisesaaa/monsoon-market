// Monsoon Market — weapons. The numbers live in state.js (damage, fire
// rate, magazine, spread); this module owns the firing: cooldowns, ammo,
// reloads, bloom, and the spread a shot actually leaves with. The gun you
// see — the model, the sway, the recoil, the muzzle flash, aim-down-
// sights — lives in viewmodel.js; this file drives it.
import { WEAPONS } from './state.js';
import { createViewmodel } from './viewmodel.js';

export function createWeaponInstance(camera, weaponId) {
  const def = WEAPONS[weaponId];
  const vm = createViewmodel(def.kind);
  const model = vm.model;

  const state = {
    id: weaponId, mag: def.mag, reserve: def.reserve,
    cooldown: 0, reloadLeft: 0, bloom: 0,
    switchT: 0,
  };

  function step(dt, move) {
    state.cooldown = Math.max(0, state.cooldown - dt);
    state.bloom = Math.max(0, state.bloom - dt * 0.05);
    if (state.switchT > 0) state.switchT = Math.max(0, state.switchT - dt);
    // reload: the viewmodel dips while the timer runs; ammo moves at the end
    if (state.reloadLeft > 0) {
      state.reloadLeft = Math.max(0, state.reloadLeft - dt);
      const t = 1 - state.reloadLeft / def.reload;
      vm.setReload(Math.sin(t * Math.PI));
      if (state.reloadLeft === 0 && def.mag !== Infinity) {
        const need = def.mag - state.mag;
        const take = Math.min(need, state.reserve);
        state.mag += take;
        state.reserve -= take;
        vm.setReload(0);
      }
    }
    vm.setSwitching(state.switchT);
    vm.step(dt, move);
  }

  return {
    state,
    def,
    model,
    flash: vm.flash,
    flashLight: vm.flashLight,
    muzzleLocal: vm.muzzleLocal,
    viewmodel: vm,
    step,
    attach(cam) {
      vm.attach(cam);
      state.switchT = 0.3;
    },
    detach(cam) {
      vm.detach(cam);
    },
    ready() {
      return state.mag > 0 && state.cooldown === 0 && state.reloadLeft === 0 && state.switchT === 0;
    },
    pullTrigger() {
      state.cooldown = def.fireGap;
      vm.showFlash();
      vm.kick(def.kind === 'knife' ? 0.015 : 0.05);
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
    // Spread: still + movement + bloom, tightened a lot while aiming.
    spread(speed) {
      const moving = Math.min(1, speed / 5.2);
      const base = def.spreadStill + moving * def.spreadMove + state.bloom;
      return base * vm.adsSpreadMult();
    },
    setAiming(on) {
      vm.setAiming(on);
    },
    isAiming() {
      return vm.isAiming();
    },
    refill() {
      state.mag = def.mag;
      state.reserve = def.reserve;
      state.cooldown = 0;
      state.reloadLeft = 0;
      state.bloom = 0;
      state.switchT = 0;
      vm.setReload(0);
    },
    dispose(cam) {
      if (cam) this.detach(cam);
    },
  };
}
