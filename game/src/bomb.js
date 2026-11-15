// Monsoon Market — bomb.js. The Stormcell: one attacker carries the
// charge, plants it at A or B, and the 40s fuse runs while defenders defuse.
import { ROUND, ECONOMY } from './state.js';

export function createBomb(G, deps) {
  const { inSite, audio, radio, onEvent, endRound, playerPlanting, playerDefusing } = deps;
  let plantedFast = false;

  function reset() {
    plantedFast = false;
    const sc = G.stormcell;
    sc.planted = false;
    sc.site = null;
    sc.fuse = 0;
    sc.plantProgress = 0;
    sc.defuseProgress = 0;
    sc.defuserId = null;
  }

  // Plant: the carrier stands in a site and holds E (player) or plants
  // on arrival (bot). Returns 'planted' when the charge goes down.
  function plantStep(dt) {
    const sc = G.stormcell;
    if (sc.planted) return null;
    const carrier = G.actors.find((a) => a.id === sc.carrierId && a.alive);
    if (!carrier) {
      // carrier dead: the charge drops where they died, a teammate picks it up
      const dead = G.actors.find((a) => a.id === sc.carrierId);
      const spot = dead ? dead.body.position : { x: 0, z: 0 };
      const picker = G.actors.find((a) => a.team === 'attack' && a.alive
        && Math.hypot(a.body.position.x - spot.x, a.body.position.z - spot.z) < 1.6);
      if (picker) {
        sc.carrierId = picker.id;
        if (picker.isPlayer) radio('YOU', 'You picked up the charge');
      }
      return null;
    }
    const site = inSite(carrier, 'A') ? 'A' : inSite(carrier, 'B') ? 'B' : null;
    const planting = carrier.isPlayer ? playerPlanting(site) : carrier.state === 'plant';
    if (site && planting) {
      sc.plantProgress += dt;
      if (sc.plantProgress >= ROUND.plantTime) {
        sc.planted = true;
        sc.site = site;
        sc.fuse = ROUND.fuse;
        G.phase = 'planted';
        if (carrier.isPlayer) carrier.money += ECONOMY.plant;
        radio(carrier.isPlayer ? 'YOU' : carrier.name, `Charge planted at ${site} — 40 seconds on the fuse`);
        audio.plantBeep();
        onEvent('planted', { site });
        return 'planted';
      }
    } else sc.plantProgress = Math.max(0, sc.plantProgress - dt * 2);
    return null;
  }

  // Fuse + defuse after the plant. Returns 'defused' or 'detonated' when
  // the round ends on the charge, null while the fuse is still running.
  function fuseStep(dt, aliveOf) {
    const sc = G.stormcell;
    sc.fuse -= dt;
    const attackers = aliveOf('attack');
    const defenders = aliveOf('defend');
    if (attackers.length === 0 && !plantedFast) {
      plantedFast = true;
      sc.fuse = Math.min(sc.fuse, 3);
    }
    if (defenders.length > 0) {
      const defuser = defenders.find((a) => (a.isPlayer ? playerDefusing() : a.state === 'defuse'));
      if (defuser) {
        const need = defuser.hasKit ? ROUND.defuseKitTime : ROUND.defuseTime;
        sc.defuseProgress += dt;
        sc.defuserId = defuser.id;
        if (sc.defuseProgress >= need) {
          if (defuser.isPlayer) defuser.money += ECONOMY.defuse;
          endRound('defend', 'charge defused');
          return 'defused';
        }
      } else {
        sc.defuseProgress = Math.max(0, sc.defuseProgress - dt * 2);
        sc.defuserId = null;
      }
    }
    if (sc.fuse <= 0) {
      audio.explode();
      onEvent('explode', { site: sc.site });
      endRound('attack', 'charge detonated');
      return 'detonated';
    }
    return null;
  }

  return { reset, plantStep, fuseStep };
}
