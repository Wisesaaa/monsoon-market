// Yardline — the round machine. Freeze (buy) -> live -> planted ->
// round end -> next round, first to 7 of 12, teams swap at the half.
// It owns the timer, the money, the plant/defuse progress and the win checks.
// main.js drives it once per fixed step and reads the events it emits.
import { ROUND, ECONOMY, WEAPONS, UTILITY, TEAMS } from './state.js';

export function createRounds(G, deps) {
  const { audio, radio, feed, onEvent } = deps;
  let endTimer = 0;
  let plantedFast = false;

  function aliveOf(team) {
    return G.actors.filter((a) => a.team === team && a.alive);
  }

  function awardMoney(team, amount) {
    for (const a of G.actors) if (a.team === team) a.money += amount;
  }

  function endRound(winner, reason) {
    if (G.phase === 'roundEnd' || G.phase === 'matchEnd') return;
    G.phase = 'roundEnd';
    G.winner = winner;
    endTimer = 4;
    if (winner === 'attack') G.scoreAttack += 1;
    else G.scoreDefend += 1;
    awardMoney(winner, ECONOMY.win);
    awardMoney(winner === 'attack' ? 'defend' : 'attack', ECONOMY.loss);
    const score = `${G.scoreAttack} — ${G.scoreDefend}`;
    radio('SYSTEM', `${winner === 'attack' ? TEAMS.ATTACK.name : TEAMS.DEFEND.name} take round ${G.round} (${reason}) · ${score}`);
    onEvent('roundEnd', { winner, reason });
    if (G.scoreAttack >= ROUND.winRounds || G.scoreDefend >= ROUND.winRounds || G.round >= ROUND.maxRounds) {
      G.matchWinner = G.scoreAttack > G.scoreDefend ? 'attack' : G.scoreDefend > G.scoreAttack ? 'defend' : 'draw';
    }
  }

  function startRound() {
    G.phase = 'freeze';
    G.timer = ROUND.freeze;
    G.winner = null;
    plantedFast = false;
    G.stormcell.planted = false;
    G.stormcell.site = null;
    G.stormcell.fuse = 0;
    G.stormcell.plantProgress = 0;
    G.stormcell.defuseProgress = 0;
    G.stormcell.defuserId = null;
    if (G.round === ROUND.halfAt) {
      swapTeams();
      G.half = 2;
      radio('SYSTEM', 'Half time — teams swap sides');
    }
    deps.setupRound(G.round);
    audio.roundStart();
    onEvent('roundStart', { round: G.round });
  }

  function swapTeams() {
    for (const a of G.actors) {
      a.team = a.team === 'attack' ? 'defend' : 'attack';
      if (!a.isPlayer && a.mesh) {
        const body = a.team === 'attack' ? 0x6b4a2f : 0x2f4a5c;
        const trim = a.team === 'attack' ? 0xc96a3b : 0x3e6b8c;
        a.mesh.traverse((m) => {
          if (!m.isMesh) return;
          if (m.material.emissive && m.material.emissive.getHex() !== 0) m.material.emissive.setHex(trim);
          if (m.geometry.parameters && m.geometry.parameters.width === 0.52) m.material.color.setHex(body);
        });
      }
    }
  }

  function inSite(actor, site) {
    const s = deps.sites[site];
    const p = actor.body.position;
    return p.x >= s.minX && p.x <= s.maxX && p.z >= s.minZ && p.z <= s.maxZ;
  }

  function step(dt) {
    G.time += dt;
    if (G.phase === 'freeze') {
      G.timer -= dt;
      if (G.timer <= 0) {
        G.phase = 'live';
        G.timer = ROUND.live;
        onEvent('live', {});
      }
      return;
    }
    if (G.phase === 'roundEnd') {
      endTimer -= dt;
      if (endTimer <= 0) {
        if (G.matchWinner) {
          G.phase = 'matchEnd';
          onEvent('matchEnd', { winner: G.matchWinner });
        } else {
          G.round += 1;
          startRound();
        }
      }
      return;
    }
    if (G.phase === 'matchEnd') return;

    // live or planted
    if (G.phase === 'live') G.timer -= dt;

    // plant progress: carrier standing in a site holding E (player) or bot planting
    const sc = G.stormcell;
    if (!sc.planted) {
      const carrier = G.actors.find((a) => a.id === sc.carrierId && a.alive);
      if (carrier) {
        const site = inSite(carrier, 'A') ? 'A' : inSite(carrier, 'B') ? 'B' : null;
        const planting = carrier.isPlayer ? deps.playerPlanting(site) : carrier.state === 'plant';
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
          }
        } else sc.plantProgress = Math.max(0, sc.plantProgress - dt * 2);
      } else {
        // carrier dead: stormcell drops where they died, a teammate can pick it up
        const dead = G.actors.find((a) => a.id === sc.carrierId);
        const spot = dead ? dead.body.position : { x: 0, z: 0 };
        const picker = G.actors.find((a) => a.team === 'attack' && a.alive
          && Math.hypot(a.body.position.x - spot.x, a.body.position.z - spot.z) < 1.6);
        if (picker) {
          sc.carrierId = picker.id;
          if (picker.isPlayer) radio('YOU', 'You picked up the charge');
        }
      }
    } else {
      // planted: fuse + defuse
      sc.fuse -= dt;
      const attackers = aliveOf('attack');
      const defenders = aliveOf('defend');
      if (attackers.length === 0 && !plantedFast) {
        plantedFast = true;
        sc.fuse = Math.min(sc.fuse, 3);
      }
      if (defenders.length > 0) {
        const defuser = defenders.find((a) => a.isPlayer ? deps.playerDefusing() : a.state === 'defuse');
        if (defuser) {
          const need = defuser.hasKit ? ROUND.defuseKitTime : ROUND.defuseTime;
          sc.defuseProgress += dt;
          sc.defuserId = defuser.id;
          if (sc.defuseProgress >= need) {
            if (defuser.isPlayer) defuser.money += ECONOMY.defuse;
            endRound('defend', 'charge defused');
            return;
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
        return;
      }
    }

    // elimination / time
    const atkAlive = aliveOf('attack').length;
    const defAlive = aliveOf('defend').length;
    if (atkAlive === 0 && !sc.planted) {
      endRound('defend', 'team eliminated');
      return;
    }
    if (defAlive === 0 && !sc.planted) {
      endRound('attack', 'team eliminated');
      return;
    }
    if (G.phase === 'live' && G.timer <= 0) {
      endRound('defend', 'time expired');
    }
  }

  function buy(actor, itemId) {
    if (G.phase !== 'freeze') return false;
    if (WEAPONS[itemId]) {
      const def = WEAPONS[itemId];
      if (actor.money < def.price) return false;
      if (def.kind === 'knife' || def.kind === 'pistol') {
        // pistol replaces the sidearm; primary replaces slot 1
      }
      actor.money -= def.price;
      deps.setWeapon(actor, itemId);
      audio.buy();
      return true;
    }
    if (itemId === 'armor') {
      if (actor.money < ECONOMY.armor || actor.armor >= 100) return false;
      actor.money -= ECONOMY.armor;
      actor.armor = 100;
      audio.buy();
      return true;
    }
    if (itemId === 'helm') {
      if (actor.money < ECONOMY.helm || actor.hasHelm) return false;
      actor.money -= ECONOMY.helm;
      actor.hasHelm = true;
      audio.buy();
      return true;
    }
    if (UTILITY[itemId]) {
      const def = UTILITY[itemId];
      if (actor.money < def.price) return false;
      if (itemId === 'kit') {
        if (actor.hasKit) return false;
        actor.hasKit = true;
      } else {
        if (actor.utility[itemId] >= 2) return false;
        actor.utility[itemId] += 1;
      }
      actor.money -= def.price;
      audio.buy();
      return true;
    }
    return false;
  }

  return { step, startRound, endRound, buy, inSite, aliveOf };
}
