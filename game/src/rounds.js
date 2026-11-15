// Monsoon Market — the round machine. Freeze (buy) -> live -> planted ->
// round end -> next round, first to 7 of 12, teams swap at the half.
// It owns the timer, the money and the win checks. The charge itself
// (plant, fuse, defuse) lives in bomb.js; this file drives it once per
// fixed step and reads the events it emits.
import { ROUND, ECONOMY, WEAPONS, UTILITY, TEAMS } from './state.js';
import { createBomb } from './bomb.js';

export function createRounds(G, deps) {
  const { audio, radio, feed, onEvent } = deps;
  let endTimer = 0;
  const bomb = createBomb(G, {
    inSite,
    audio, radio, onEvent,
    endRound,
    playerPlanting: deps.playerPlanting,
    playerDefusing: deps.playerDefusing,
  });

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
    bomb.reset();
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
        const body = a.team === 'attack' ? 0x7a2438 : 0x1f4d5c;
        const trim = a.team === 'attack' ? 0xff2e88 : 0x22d3ee;
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

    // the charge (bomb.js): plant progress, then fuse + defuse
    const sc = G.stormcell;
    if (!sc.planted) {
      bomb.plantStep(dt);
    } else {
      const done = bomb.fuseStep(dt, aliveOf);
      if (done) return;
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
