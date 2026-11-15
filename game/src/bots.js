// Yardline — the bots. Nine of them: four teammates, five opponents.
// Each has a name, a role and a route. Attackers follow a team plan to a site
// (and the carrier plants); defenders hold a site, listen, and rotate on
// contact or on a plant. They see with a cone + line of sight, hear gunshots,
// and shoot in bursts with a reaction time — never instantly, never perfectly.
import * as THREE from 'three';
import { WEAPONS, BOT_NAMES, ECONOMY } from './state.js';
import { createBody } from './player.js';
import { createWeaponInstance } from './weapons.js';

const VISION_RANGE = 42;
const VISION_HALF_ANGLE = 1.05;
const HEAR_RADIUS = 26;
const BOT_SPEED_KEY = 5.2;

const PLANS = [
  { id: 'splitA', text: 'SPLIT A — 3 long, 2 mid', site: 'A', routes: ['attackA', 'attackA', 'attackMidA', 'attackMidA', 'attackA'] },
  { id: 'rushB', text: 'B RUSH — 4 tunnel, 1 mid', site: 'B', routes: ['attackB', 'attackB', 'attackB', 'attackMidB', 'attackB'] },
  { id: 'midA', text: 'MID CONTROL — take mid, hit A', site: 'A', routes: ['attackMidA', 'attackMidA', 'attackMidA', 'attackA', 'attackB'] },
];

function bodyColor(team) {
  return team === 'attack' ? new THREE.Color('#6b4a2f') : new THREE.Color('#2f4a5c');
}
function trimColor(team) {
  return team === 'attack' ? new THREE.Color('#c96a3b') : new THREE.Color('#3e6b8c');
}

function makeBotMesh(team) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor(team), roughness: 0.8 });
  const trimMat = new THREE.MeshStandardMaterial({ color: trimColor(team), roughness: 0.5, emissive: trimColor(team), emissiveIntensity: 0.5 });
  const skinMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c9a184'), roughness: 0.8 });
  const darkMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#1c1e26'), roughness: 0.85 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.3), bodyMat);
  torso.position.y = 1.15;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), skinMat);
  head.position.y = 1.62;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.34), trimMat);
  cap.position.y = 1.8;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.2), darkMat);
  legL.position.set(-0.14, 0.4, 0);
  const legR = legL.clone();
  legR.position.x = 0.14;
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.62), darkMat);
  gun.position.set(0.28, 1.25, -0.25);
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.2, 0.32), trimMat);
  vest.position.y = 1.3;
  group.add(torso, head, cap, legL, legR, gun, vest);
  group.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
  return { group, head, torso };
}

// segment vs AABB, for line of sight. Returns true when blocked.
const _box = new THREE.Box3();
const _dir = new THREE.Vector3();
const _inv = new THREE.Vector3();
function losBlocked(from, to, colliders) {
  _dir.subVectors(to, from);
  const len = _dir.length();
  if (len < 0.001) return false;
  _dir.multiplyScalar(1 / len);
  _inv.set(1 / _dir.x, 1 / _dir.y, 1 / _dir.z);
  for (const c of colliders) {
    _box.copy(c);
    let tmin = 0;
    let tmax = len;
    let ok = true;
    for (const axis of ['x', 'y', 'z']) {
      const o = from[axis];
      const d = _dir[axis];
      const inv = _inv[axis];
      let t0 = (_box.min[axis] - o) * inv;
      let t1 = (_box.max[axis] - o) * inv;
      if (inv < 0) { const tmp = t0; t0 = t1; t1 = tmp; }
      tmin = Math.max(tmin, t0);
      tmax = Math.min(tmax, t1);
      if (tmax < tmin) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

export function createBots(scene, map, mover, G) {
  const bots = [];
  const hitMeshes = [];
  const random = (() => {
    let s = 1234567;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  })();

  function spawnBot(index, team, name, role) {
    const body = createBody(0, 0, team === 'attack' ? 0 : Math.PI);
    const { group, head, torso } = makeBotMesh(team);
    scene.add(group);
    head.userData = { actor: null, part: 'head' };
    torso.userData = { actor: null, part: 'body' };
    const bot = {
      id: `bot${index}`,
      name, role, team,
      isPlayer: false,
      body,
      mesh: group,
      headMesh: head,
      torsoMesh: torso,
      weapon: null,
      hp: 100,
      armor: 0,
      hasHelm: false,
      alive: true,
      money: ECONOMY.start,
      utility: { frag: 0, smoke: 0, flash: 0 },
      hasKit: false,
      route: null,
      routeIndex: 0,
      holdPos: null,
      watchYaw: 0,
      state: 'advance',
      target: null,
      lastSeen: null,
      lastSeenAt: -99,
      reaction: 0,
      burstLeft: 0,
      burstPause: 0,
      visionAt: 0,
      keys: new Set(),
      walkPhase: 0,
      radioAt: -99,
      // difficulty: 0.6 (rookie) .. 1.0 (sharp). Marksmen react faster.
      skill: role === 'Marksman' ? 0.9 + random() * 0.1 : 0.6 + random() * 0.3,
    };
    head.userData.actor = bot;
    torso.userData.actor = bot;
    hitMeshes.push(head, torso);
    bots.push(bot);
    return bot;
  }

  // four teammates + five opponents; the player fills the fifth attack slot
  const names = [...BOT_NAMES];
  for (let i = 0; i < 4; i += 1) {
    const n = names.shift();
    spawnBot(i, 'attack', n.name, n.role);
  }
  for (let i = 0; i < 5; i += 1) {
    const n = names.shift();
    spawnBot(4 + i, 'defend', n.name, n.role);
  }

  function buyFor(bot, round) {
    const budget = bot.money;
    let weapon = 'p9';
    if (round >= 2 && budget >= 2700) weapon = 'longhaul';
    else if (round >= 2 && budget >= 1500) weapon = 'yard';
    else if (budget >= 3500 && bot.role === 'Marksman') weapon = 'crane';
    if (bot.weapon) bot.weapon.dispose();
    bot.weapon = createWeaponInstance(null, weapon);
    bot.weapon.refill();
    if (budget >= 650 + WEAPONS[weapon].price) {
      bot.armor = 100;
      bot.hasHelm = budget >= 1000 + WEAPONS[weapon].price;
    }
    bot.money -= WEAPONS[weapon].price + (bot.armor ? 650 : 0) + (bot.hasHelm ? 350 : 0);
    bot.utility = { frag: round >= 3 ? 1 : 0, smoke: round >= 2 ? 1 : 0, flash: 0 };
  }

  function assignRound(planIndex) {
    const plan = PLANS[planIndex % PLANS.length];
    G.plan = { text: plan.text, site: plan.site, role: 'Entry' };
    const attackers = bots.filter((b) => b.team === 'attack');
    attackers.forEach((bot, i) => {
      bot.route = plan.routes[i % plan.routes.length];
      bot.routeIndex = 0;
      bot.state = 'advance';
      bot.target = null;
    });
    const defenders = bots.filter((b) => b.team === 'defend');
    const defRoutes = ['defendA', 'defendA', 'defendB', 'defendB', 'defendMid'];
    defenders.forEach((bot, i) => {
      bot.route = defRoutes[i];
      bot.routeIndex = 0;
      bot.state = 'hold';
      const wp = map.waypoints[bot.route];
      bot.holdPos = wp;
      bot.watchYaw = Math.PI; // defenders face south, into the yard
    });
    return plan;
  }

  function respawnAll(G) {
    const atkSpawns = map.spawns.attack;
    const defSpawns = map.spawns.defend;
    let ai = 0;
    let di = 0;
    for (const bot of bots) {
      const spawn = bot.team === 'attack' ? atkSpawns[ai % atkSpawns.length] : defSpawns[di % defSpawns.length];
      if (bot.team === 'attack') ai += 1; else di += 1;
      bot.body.position.set(spawn[0], 0, spawn[1]);
      bot.body.velocity.set(0, 0, 0);
      bot.body.yaw = bot.team === 'attack' ? 0 : Math.PI; // face into the yard
      bot.body.pitch = 0;
      bot.hp = 100;
      bot.alive = true;
      bot.mesh.visible = true;
      bot.mesh.rotation.set(0, 0, 0);
      bot.mesh.position.copy(bot.body.position);
      bot.target = null;
      bot.lastSeen = null;
      bot.state = bot.team === 'attack' ? 'advance' : 'hold';
      bot.routeIndex = 0;
      buyFor(bot, G.round);
    }
    // stormcell goes to a random attacker bot (never the player first round)
    const carriers = bots.filter((b) => b.team === 'attack' && b.alive);
    const carrier = carriers[Math.floor(random() * carriers.length)];
    G.stormcell.carrierId = carrier.id;
  }

  const eyePos = new THREE.Vector3();
  const targetPos = new THREE.Vector3();
  const toTarget = new THREE.Vector3();

  function canSee(bot, target, colliders) {
    if (!target.alive) return false;
    eyePos.set(bot.body.position.x, bot.body.position.y + bot.body.eye, bot.body.position.z);
    targetPos.set(target.body.position.x, target.body.position.y + 1.3, target.body.position.z);
    toTarget.subVectors(targetPos, eyePos);
    const dist = toTarget.length();
    if (dist > VISION_RANGE) return false;
    const facing = new THREE.Vector3(-Math.sin(bot.body.yaw), 0, -Math.cos(bot.body.yaw));
    const dot = (toTarget.x * facing.x + toTarget.z * facing.z) / (Math.hypot(toTarget.x, toTarget.z) || 1);
    if (dot < Math.cos(VISION_HALF_ANGLE)) return false;
    return !losBlocked(eyePos, targetPos, colliders);
  }

  function keysToward(bot, tx, tz) {
    const dx = tx - bot.body.position.x;
    const dz = tz - bot.body.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.4) return false;
    const wantYaw = Math.atan2(-dx, -dz);
    let dyaw = wantYaw - bot.body.yaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    bot.body.yaw += Math.max(-0.12, Math.min(0.12, dyaw));
    const k = bot.keys;
    k.clear();
    if (Math.abs(dyaw) < 0.6) k.add('KeyW');
    else if (dyaw > 0) k.add('KeyA');
    else k.add('KeyD');
    return true;
  }

  function stepBot(bot, dt, ctx) {
    if (!bot.alive) return;
    const { G, colliders, damage, tracer, noise, radio, time } = ctx;
    bot.visionAt -= dt;
    bot.weapon.step(dt);

    // --- pick a target, throttled ---
    if (bot.visionAt <= 0) {
      bot.visionAt = 0.12 + random() * 0.08;
      let best = null;
      let bestDist = Infinity;
      for (const other of ctx.actors) {
        if (other === bot || !other.alive || other.team === bot.team) continue;
        if (canSee(bot, other, colliders)) {
          const d = Math.hypot(other.body.position.x - bot.body.position.x, other.body.position.z - bot.body.position.z);
          if (d < bestDist) { best = other; bestDist = d; }
        }
      }
      if (best) {
        if (bot.target !== best) {
          // reaction delay: sharper bots react faster
          bot.reaction = (0.55 - bot.skill * 0.25) + random() * 0.25;
          if (time - bot.radioAt > 8) {
            bot.radioAt = time;
            radio(bot, `Contact ${best.name ? best.name : 'enemy'} — ${bot.role === 'Anchor' ? 'holding' : 'engaging'}`);
          }
        }
        bot.target = best;
        bot.lastSeen = { x: best.body.position.x, z: best.body.position.z };
        bot.lastSeenAt = time;
      } else if (bot.target && time - bot.lastSeenAt > 1.2) {
        bot.target = null;
      }
    }

    // --- hear gunshots ---
    if (!bot.target) {
      for (const n of G.noises) {
        const d = Math.hypot(n.x - bot.body.position.x, n.z - bot.body.position.z);
        if (d < n.radius && bot.state === 'hold') {
          bot.watchYaw = Math.atan2(-(n.x - bot.body.position.x), -(n.z - bot.body.position.z));
          if (time - bot.radioAt > 10) {
            bot.radioAt = time;
            radio(bot, 'Heard shots — checking');
          }
          break;
        }
      }
    }

    // --- engage ---
    if (bot.target && bot.target.alive) {
      const t = bot.target;
      const dx = t.body.position.x - bot.body.position.x;
      const dz = t.body.position.z - bot.body.position.z;
      bot.body.yaw = Math.atan2(-dx, -dz);
      bot.keys.clear();
      bot.reaction -= dt;
      if (bot.reaction <= 0 && bot.weapon.ready()) {
        if (bot.burstLeft <= 0) {
          bot.burstLeft = 3 + Math.floor(random() * 3);
          bot.burstPause = 0;
        }
        if (bot.burstPause <= 0) {
          bot.burstLeft -= 1;
          bot.burstPause = bot.weapon.def.fireGap;
          bot.weapon.pullTrigger();
          const dist = Math.hypot(dx, dz);
          const moving = Math.hypot(t.body.velocity.x, t.body.velocity.z) > 2;
          // accuracy: worse at range, worse if the target runs, worse if
          // this bot is still moving (it stops to shoot, so a bot that just
          // halted is less accurate), better when settled and skilled.
          const ownSpeed = Math.hypot(bot.body.velocity.x, bot.body.velocity.z);
          let chance = 0.5 - dist * 0.008 - (moving ? 0.12 : 0)
            - (ownSpeed > 1 ? 0.15 : 0) + (ownSpeed < 0.5 ? 0.06 : 0)
            + (bot.skill - 0.75) * 0.3 - (bot.weapon.def.kind === 'smg' ? 0.05 : 0);
          chance = Math.max(0.08, Math.min(0.78, chance));
          const hit = random() < chance;
          const head = hit && random() < 0.14;
          const from = new THREE.Vector3(bot.body.position.x + 0.3, bot.body.position.y + 1.35, bot.body.position.z);
          const to = hit
            ? new THREE.Vector3(t.body.position.x, t.body.position.y + (head ? 1.62 : 1.2), t.body.position.z)
            : new THREE.Vector3(t.body.position.x + (random() - 0.5) * 2.4, t.body.position.y + 1.2 + (random() - 0.5) * 1.6, t.body.position.z + (random() - 0.5) * 2.4);
          tracer(from, to);
          noise(bot.body.position.x, bot.body.position.z, HEAR_RADIUS);
          if (hit) {
            let dmg = bot.weapon.def.damage * (head ? bot.weapon.def.headMult : 1);
            if (t.armor > 0) dmg *= 0.6;
            damage(t, dmg, head, bot);
          }
          if (bot.burstLeft <= 0) bot.burstPause = 0.5 + random() * 0.7;
        } else bot.burstPause -= dt;
      }
      mover.stepBody(bot.body, dt, bot.keys);
      syncMesh(bot);
      return;
    }

    // --- plant / defuse ---
    if (bot.state === 'plant') {
      bot.keys.clear();
      mover.stepBody(bot.body, dt, bot.keys);
      syncMesh(bot);
      return;
    }
    if (bot.state === 'defuse') {
      bot.keys.clear();
      mover.stepBody(bot.body, dt, bot.keys);
      syncMesh(bot);
      return;
    }

    // --- move along the route ---
    if (bot.state === 'advance' && bot.route) {
      const route = map.routes[bot.route];
      if (route && bot.routeIndex < route.length) {
        const wp = map.waypoints[route[bot.routeIndex]];
        const arrived = !keysToward(bot, wp[0], wp[1]);
        if (arrived) bot.routeIndex += 1;
      } else {
        bot.state = 'hold';
        bot.holdPos = [bot.body.position.x, bot.body.position.z];
        bot.watchYaw = bot.body.yaw;
      }
    } else if (bot.state === 'hold') {
      bot.keys.clear();
      // slow scan
      bot.body.yaw += Math.sin(time * 0.5 + bot.id.charCodeAt(3)) * 0.002;
    }
    mover.stepBody(bot.body, dt, bot.keys);
    bot.walkPhase += dt * Math.hypot(bot.body.velocity.x, bot.body.velocity.z);
    syncMesh(bot);
  }

  function syncMesh(bot) {
    bot.mesh.position.set(bot.body.position.x, bot.body.position.y, bot.body.position.z);
    bot.mesh.rotation.y = bot.body.yaw + Math.PI;
    // simple walk bob
    const bob = Math.sin(bot.walkPhase * 2) * 0.03 * Math.min(1, Math.hypot(bot.body.velocity.x, bot.body.velocity.z) / 3);
    bot.mesh.position.y += Math.abs(bob);
  }

  function killBot(bot) {
    bot.alive = false;
    bot.mesh.rotation.x = -Math.PI / 2;
    bot.mesh.position.y = 0.25;
    bot.target = null;
  }

  return {
    bots,
    hitMeshes,
    assignRound,
    respawnAll,
    stepBot,
    killBot,
    syncMesh,
    losBlocked,
  };
}
