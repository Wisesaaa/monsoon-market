// Monsoon Market — the bots. Nine of them: four teammates, five opponents.
import * as THREE from 'three';
import { WEAPONS, BOT_NAMES, ECONOMY } from './state.js';
import { createBody } from './player.js';
import { createWeaponInstance } from './weapons.js';
import { createNav } from './nav.js';

const VISION_RANGE = 42;
const VISION_HALF_ANGLE = 1.05;
const BOT_SPEED_KEY = 5.2;

const PLANS = [
  { id: 'splitA', text: 'SPLIT A — 3 long, 2 mid', site: 'A', routes: ['attackA', 'attackA', 'attackMidA', 'attackMidA', 'attackA'] },
  { id: 'rushB', text: 'B RUSH — 4 B long, 1 mid', site: 'B', routes: ['attackB', 'attackB', 'attackB', 'attackMidB', 'attackB'] },
  { id: 'midA', text: 'MID CONTROL — take mid, hit A', site: 'A', routes: ['attackMidA', 'attackMidA', 'attackMidA', 'attackA', 'attackB'] },
];

function bodyColor(team) {
  return team === 'attack' ? new THREE.Color('#7a2438') : new THREE.Color('#1f4d5c');
}
function trimColor(team) {
  return team === 'attack' ? new THREE.Color('#ff2e88') : new THREE.Color('#22d3ee');
}

function makeBotMesh(team) {
  // A soldier, not a box: helmet, vest with pouches, backpack, arms holding
  const group = new THREE.Group();
  const uniform = new THREE.MeshStandardMaterial({ color: team === 'attack' ? new THREE.Color('#6b5a3a') : new THREE.Color('#3a4a52'), roughness: 0.9 });
  const vestMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#2e2a24'), roughness: 0.85 });
  const trimMat = new THREE.MeshStandardMaterial({ color: trimColor(team), roughness: 0.5, emissive: trimColor(team), emissiveIntensity: 0.4 });
  const skinMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c9a184'), roughness: 0.8 });
  const darkMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#1c1e24'), roughness: 0.85 });
  const bootMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#241f18'), roughness: 0.9 });

  function b(w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    group.add(m);
    return m;
  }

  // legs + boots
  const legL = b(0.17, 0.85, 0.19, uniform, -0.12, 0.48, 0);
  const legR = b(0.17, 0.85, 0.19, uniform, 0.12, 0.48, 0);
  b(0.18, 0.1, 0.3, bootMat, -0.12, 0.05, -0.04);
  b(0.18, 0.1, 0.3, bootMat, 0.12, 0.05, -0.04);
  // torso + vest + pouches + backpack
  const torso = b(0.52, 0.6, 0.3, uniform, 0, 1.18, 0);
  b(0.54, 0.42, 0.08, vestMat, 0, 1.2, -0.17);
  b(0.12, 0.16, 0.06, vestMat, -0.14, 1.18, -0.22);
  b(0.12, 0.16, 0.06, vestMat, 0.14, 1.18, -0.22);
  b(0.1, 0.12, 0.05, trimMat, 0, 1.32, -0.22);
  b(0.4, 0.48, 0.16, vestMat, 0, 1.22, 0.22);
  b(0.3, 0.1, 0.06, darkMat, 0, 1.5, 0.24);
  // head + helmet
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), skinMat);
  head.position.set(0, 1.66, 0);
  head.castShadow = true;
  group.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.175, 12, 10), uniform);
  helmet.scale.set(1, 0.72, 1.05);
  helmet.position.set(0, 1.74, 0.01);
  helmet.castShadow = true;
  group.add(helmet);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.03, 12), uniform);
  brim.position.set(0, 1.68, 0);
  group.add(brim);
  // arms: rear arm to the grip, front arm to the handguard
  const armR = b(0.13, 0.13, 0.5, uniform, 0.3, 1.32, -0.18, 0.5, 0, 0);
  const armL = b(0.13, 0.13, 0.45, uniform, -0.28, 1.3, -0.22, 0.35, 0, 0);
  b(0.1, 0.1, 0.12, skinMat, 0.3, 1.18, -0.38);
  b(0.1, 0.1, 0.12, skinMat, -0.28, 1.2, -0.42);
  // rifle held forward, slightly angled, in both hands
  const gun = new THREE.Group();
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.62), darkMat);
  gunBody.castShadow = true;
  gun.add(gunBody);
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.34, 8), darkMat);
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0, 0.02, -0.45);
  gun.add(gunBarrel);
  const gunMag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.07), new THREE.MeshStandardMaterial({ color: new THREE.Color('#8a7a5c'), roughness: 0.75 }));
  gunMag.position.set(0, -0.1, -0.05);
  gunMag.rotation.x = 0.25;
  gun.add(gunMag);
  const gunStock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.18), new THREE.MeshStandardMaterial({ color: new THREE.Color('#8a7a5c'), roughness: 0.75 }));
  gunStock.position.set(0, -0.01, 0.36);
  gun.add(gunStock);
  const gunSight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.07), darkMat);
  gunSight.position.set(0, 0.08, 0.0);
  gun.add(gunSight);
  gun.position.set(0.05, 1.28, -0.42);
  gun.rotation.y = -0.08;
  group.add(gun);
  group.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
  return { group, head, torso, legL, legR };
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
  // nav owns the waypoint graph: routes, steering, rotations.
  const nav = createNav(map);
  const random = (() => {
    let s = 1234567;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  })();

  function spawnBot(index, team, name, role) {
    const body = createBody(0, 0, team === 'attack' ? 0 : Math.PI);
    const { group, head, torso, legL, legR } = makeBotMesh(team);
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
      legL, legR,
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
      state: 'advance', // advance | hold | investigate | retreat | postplant | plant | defuse | retake
      investigatePos: null,
      investigateAt: 0,
      retreatAt: 0,
      retreatFrom: null,
      postplant: false,
      postplantPos: null,
      postplantAt: 0,
      retakePos: null, // [x, z] rally point for a coordinated retake
      retakeAt: 0,
      lastFragAt: -99, // last time this bot threw a frag
      lastRoundWon: true, // for the economy: a loss + low money = save round
      lowHpCalled: false, // has this bot called out its low HP this life
      reloadCalled: false, // has this bot called out its reload this mag
      lastTradeAt: -99,
      diedAt: -99,
      killerPos: null,
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

  // Economy: bots buy like a team, not like a slot machine. A lost round
  function buyFor(bot, round) {
    const budget = bot.money;
    // save round: the team lost the previous round and is broke — pistol
    // + armor only, so the next round can afford a rifle
    const saveRound = round >= 2 && budget < 2000 && bot.lastRoundWon === false;
    let weapon = 'p9';
    if (!saveRound) {
      if (round >= 2 && budget >= 2700) weapon = 'monsoon';
      else if (round >= 2 && budget >= 1500) weapon = 'drizzle';
      else if (budget >= 3500 && bot.role === 'Marksman') weapon = 'longrain';
    }
    if (bot.weapon) bot.weapon.dispose();
    bot.weapon = createWeaponInstance(null, weapon);
    bot.weapon.refill();
    // force buy: a rich team buys armor + helm even after a loss
    const forceBuy = budget >= 4000;
    if (!saveRound && (budget >= 650 + WEAPONS[weapon].price || forceBuy)) {
      bot.armor = 100;
      bot.hasHelm = budget >= 1000 + WEAPONS[weapon].price;
    }
    // defenders buy a defuse kit when they can afford it (defuse 2.5s)
    if (bot.team === 'defend' && !saveRound && budget >= 400 + WEAPONS[weapon].price + (bot.armor ? 650 : 0)) {
      bot.hasKit = true;
    }
    bot.money -= WEAPONS[weapon].price + (bot.armor ? 650 : 0) + (bot.hasHelm ? 350 : 0) + (bot.hasKit ? 400 : 0);
    bot.utility = { frag: round >= 3 ? 1 : 0, smoke: round >= 2 ? 1 : 0, flash: round >= 3 ? 1 : 0 };
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
      bot.watchYaw = Math.PI;
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
      bot.body.yaw = bot.team === 'attack' ? 0 : Math.PI; // face into the market
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
      bot.postplant = false;
      bot.postplantPos = null;
      bot.diedAt = -99;
      bot.killerPos = null;
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

  // Steer a body toward a point. Kept here as a thin wrapper over nav so
  // the rest of the file reads the same; nav owns the turning math.
  function keysToward(bot, tx, tz) {
    return !nav.steerToward(bot.body, tx, tz, bot.keys);
  }

  function stepBot(bot, dt, ctx) {
    if (!bot.alive) return;
    const { G, colliders, damage, tracer, hearing, throwGrenade, radio, time } = ctx;
    bot.visionAt -= dt;
    bot.weapon.step(dt);

    // --- trade kill: a teammate just died near this bot — peek the spot
    // they died at, instead of waiting for the killer to come to us. ---
    if (!bot.target && bot.lastTradeAt !== time) {
      for (const other of ctx.actors) {
        if (other.team !== bot.team || other.alive || other === bot) continue;
        if (other.diedAt === undefined || time - other.diedAt > 3) continue;
        const d = Math.hypot(other.body.position.x - bot.body.position.x, other.body.position.z - bot.body.position.z);
        if (d < 16 && other.killerPos) {
          bot.state = 'investigate';
          bot.investigatePos = [other.killerPos.x, other.killerPos.z];
          bot.investigateAt = time;
          bot.lastTradeAt = time;
          break;
        }
      }
    }

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

    // hearing.js returns the loudest fresh noise in range. A bot holding a
    if (!bot.target && hearing) {
      const heard = hearing.hear(bot.body.position.x, bot.body.position.z);
      if (heard) {
        const yaw = Math.atan2(-(heard.x - bot.body.position.x), -(heard.z - bot.body.position.z));
        if (bot.state === 'hold') {
          bot.watchYaw = yaw;
          if (time - bot.radioAt > 10) {
            bot.radioAt = time;
            radio(bot, heard.kind === 'gunshot' ? 'Heard shots — checking' : `Heard ${heard.kind} — checking`);
          }
        } else if (bot.state === 'advance' && heard.kind === 'gunshot' && heard.dist < 12) {
          bot.state = 'investigate';
          bot.investigatePos = [heard.x, heard.z];
          bot.investigateAt = time;
          if (time - bot.radioAt > 10) {
            bot.radioAt = time;
            radio(bot, 'Shots close by — checking it out');
          }
        }
      }
    }

    // --- retake: the charge is planted — defenders rally before pushing ---
    if (G.stormcell.planted && bot.team === 'defend' && bot.alive && !bot.target) {
      const site = map.sites[G.stormcell.site];
      const rally = nav.nearestWaypoint(site.x, site.z + 8);
      const rallyPos = nav.waypointPos(rally) || [site.x, site.z + 8];
      const matesReady = ctx.actors.filter((a) => a.team === 'defend' && a.alive
        && a !== bot && Math.hypot(a.body.position.x - rallyPos[0], a.body.position.z - rallyPos[1]) < 6).length;
      const fuseLow = G.stormcell.fuse < 15;
      if (bot.state !== 'retake' && bot.state !== 'defuse' && (matesReady >= 1 || fuseLow)) {
        bot.state = 'retake';
        bot.retakePos = rallyPos;
        bot.retakeAt = time;
        if (time - bot.radioAt > 8) {
          bot.radioAt = time;
          radio(bot, `Retaking ${site.name} together — go on my mark`);
        }
      }
      if (bot.state === 'retake' && bot.retakePos) {
        const arrived = !keysToward(bot, bot.retakePos[0], bot.retakePos[1]);
        const matesHere = ctx.actors.filter((a) => a.team === 'defend' && a.alive
          && Math.hypot(a.body.position.x - bot.body.position.x, a.body.position.z - bot.body.position.z) < 5).length;
        // push the site when a mate is here, or when the fuse is low
        if (arrived && (matesHere >= 1 || fuseLow || time - bot.retakeAt > 6)) {
          bot.state = 'advance';
          bot.route = null;
          bot.investigatePos = [site.x, site.z];
          bot.investigateAt = time;
        }
        mover.stepBody(bot.body, dt, bot.keys, false, time);
        bot.walkPhase += dt * Math.hypot(bot.body.velocity.x, bot.body.velocity.z);
        syncMesh(bot);
        return;
      }
    }

    // --- frag utility: a bot that sees (or hears) an enemy at mid range
    if (bot.target && bot.target.alive && bot.utility.frag > 0 && throwGrenade) {
      const t = bot.target;
      const dist = Math.hypot(t.body.position.x - bot.body.position.x, t.body.position.z - bot.body.position.z);
      if (dist > 8 && dist < 20 && time - bot.lastFragAt > 12) {
        bot.lastFragAt = time;
        const target = new THREE.Vector3(t.body.position.x, 1.2, t.body.position.z);
        if (throwGrenade(bot, 'frag', target) && time - bot.radioAt > 8) {
          bot.radioAt = time;
          radio(bot, 'Frag out — pushing after it');
        }
      }
    }

    if (bot.target && bot.target.alive) {
      const t = bot.target;
      const dx = t.body.position.x - bot.body.position.x;
      const dz = t.body.position.z - bot.body.position.z;
      // retreat: a hurt bot (under 30 HP) falls back toward its hold
      // position instead of trading — it lives to hold the next angle.
      if (bot.hp < 30 && bot.state !== 'retreat' && Math.hypot(dx, dz) < 14) {
        bot.state = 'retreat';
        bot.retreatAt = time;
        bot.retreatFrom = { x: t.body.position.x, z: t.body.position.z };
        if (time - bot.radioAt > 8) {
          bot.radioAt = time;
          radio(bot, 'Hurt — falling back');
        }
      }
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
          if (hearing) hearing.emit(bot.body.position.x, bot.body.position.z, 'gunshot');
          if (hit) {
            let dmg = bot.weapon.def.damage * (head ? bot.weapon.def.headMult : 1);
            if (t.armor > 0) dmg *= 0.6;
            damage(t, dmg, head, bot);
          }
          // low HP callout: a bot under 30 HP says so, so a teammate
          // knows to trade for it instead of letting it die alone.
          if (bot.hp < 30 && !bot.lowHpCalled && time - bot.radioAt > 8) {
            bot.lowHpCalled = true;
            bot.radioAt = time;
            radio(bot, 'Low HP — trade me if I go down');
          }
          // reloading callout: a bot that empties its mag mid-fight says
          // so, so a teammate covers the angle while it reloads.
          if (bot.weapon.state.mag === 0 && !bot.reloadCalled) {
            bot.reloadCalled = true;
            if (time - bot.radioAt > 8) {
              bot.radioAt = time;
              radio(bot, 'Reloading — cover me');
            }
          } else if (bot.weapon.state.mag > 0) {
            bot.reloadCalled = false;
          }
          if (bot.burstLeft <= 0) bot.burstPause = 0.5 + random() * 0.7;
        } else bot.burstPause -= dt;
      }
      mover.stepBody(bot.body, dt, bot.keys);
      syncMesh(bot);
      return;
    }

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

    // --- post-plant: the charge is down — attackers stop pushing and
    // take post-plant angles on the site instead of sitting on the bomb. ---
    if (G.stormcell.planted && bot.team === 'attack' && bot.alive
      && (bot.state === 'advance' || bot.state === 'hold') && !bot.postplant) {
      const site = map.sites[G.stormcell.site];
      // a post-plant spot: near the site, but off the plant itself, so the
      // bot watches an entrance instead of standing on the charge
      const spot = nav.nearestWaypoint(site.x + (bot.id.charCodeAt(3) % 2 ? 6 : -6), site.z + 4);
      bot.postplant = true;
      bot.state = 'postplant';
      bot.postplantPos = nav.waypointPos(spot) || [site.x, site.z];
      bot.postplantAt = time;
    }
    if (bot.state === 'postplant' && bot.postplantPos) {
      const arrived = !keysToward(bot, bot.postplantPos[0], bot.postplantPos[1]);
      if (arrived || time - bot.postplantAt > 5) {
        bot.state = 'hold';
        bot.holdPos = [bot.body.position.x, bot.body.position.z];
        // watch the site, not the wall behind it
        const site = map.sites[G.stormcell.site];
        bot.watchYaw = Math.atan2(-(site.x - bot.body.position.x), -(site.z - bot.body.position.z));
      }
      mover.stepBody(bot.body, dt, bot.keys);
      bot.walkPhase += dt * Math.hypot(bot.body.velocity.x, bot.body.velocity.z);
      syncMesh(bot);
      return;
    }

    // --- retreat: run from the enemy that hurt the bot, toward the hold
    // position (or the spawn). Ends after 2.5s or on reaching safety.
    if (bot.state === 'retreat') {
      const from = bot.retreatFrom || { x: bot.body.position.x, z: bot.body.position.z };
      const awayX = bot.body.position.x + (bot.body.position.x - from.x);
      const awayZ = bot.body.position.z + (bot.body.position.z - from.z);
      keysToward(bot, awayX, awayZ);
      mover.stepBody(bot.body, dt, bot.keys);
      bot.walkPhase += dt * Math.hypot(bot.body.velocity.x, bot.body.velocity.z);
      syncMesh(bot);
      if (time - bot.retreatAt > 2.5 || bot.hp > 60) {
        bot.state = bot.team === 'attack' ? 'advance' : 'hold';
        bot.target = null;
      }
      return;
    }

    if (bot.state === 'advance' && bot.route) {
      const next = nav.followRoute(bot);
      if (next < 0) {
        // map control: a mid route ends at mid, not at a site — the bot
        if (bot.team === 'attack' && (bot.route === 'attackMidA' || bot.route === 'attackMidB')) {
          if (time - bot.radioAt > 8) {
            bot.radioAt = time;
            radio(bot, 'Mid is ours — holding both lanes');
          }
        }
        // route finished: if this is an attack route ending at a site,
        // execute — smoke the entrance, flash the site, then hold.
        if (bot.team === 'attack' && bot.route.startsWith('attack') && throwGrenade) {
          const siteKey = (bot.route === 'attackA' || bot.route === 'attackMidA') ? 'A' : 'B';
          const site = map.sites[siteKey];
          const sitePos = new THREE.Vector3(site.x, 1.2, site.z);
          if (bot.utility.smoke > 0) {
            throwGrenade(bot, 'smoke', sitePos);
            if (time - bot.radioAt > 8) {
              bot.radioAt = time;
              radio(bot, `Smoking ${site.name} — go go go`);
            }
          } else if (bot.utility.flash > 0) {
            throwGrenade(bot, 'flash', sitePos);
          }
        }
        bot.state = 'hold';
        bot.holdPos = [bot.body.position.x, bot.body.position.z];
        bot.watchYaw = bot.body.yaw;
      }
    } else if (bot.state === 'investigate' && bot.investigatePos) {
      // walk to the sound that pulled the bot off its route
      const arrived = !keysToward(bot, bot.investigatePos[0], bot.investigatePos[1]);
      if (arrived || time - bot.investigateAt > 6) {
        // nothing there, or waited long enough: back to the route
        bot.state = 'advance';
        bot.investigatePos = null;
      }
    } else if (bot.state === 'hold') {
      bot.keys.clear();
      // hold an angle: face the lane the bot is watching, with only a
      // small scan so the crosshair stays near the entrance.
      const targetYaw = bot.watchYaw || 0;
      let dyaw = targetYaw - bot.body.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      bot.body.yaw += dyaw * Math.min(1, dt * 3);
      bot.body.yaw += Math.sin(time * 0.5 + bot.id.charCodeAt(3)) * 0.001;
    }
    mover.stepBody(bot.body, dt, bot.keys);
    bot.walkPhase += dt * Math.hypot(bot.body.velocity.x, bot.body.velocity.z);
    syncMesh(bot);
  }

  function syncMesh(bot) {
    bot.mesh.position.set(bot.body.position.x, bot.body.position.y, bot.body.position.z);
    bot.mesh.rotation.y = bot.body.yaw + Math.PI;
    // walk: legs swing opposite, body bobs
    const speed = Math.min(1, Math.hypot(bot.body.velocity.x, bot.body.velocity.z) / 3);
    const swing = Math.sin(bot.walkPhase * 2) * 0.45 * speed;
    if (bot.legL) bot.legL.rotation.x = swing;
    if (bot.legR) bot.legR.rotation.x = -swing;
    const bob = Math.abs(Math.sin(bot.walkPhase * 2)) * 0.03 * speed;
    bot.mesh.position.y += bob;
  }

  function killBot(bot, killer, time) {
    bot.alive = false;
    bot.mesh.rotation.x = -Math.PI / 2;
    bot.mesh.position.y = 0.25;
    bot.target = null;
    // trade-kill info: when and where this bot died, so a teammate can peek it
    bot.diedAt = time !== undefined ? time : 0;
    bot.killerPos = killer && killer.body
      ? { x: killer.body.position.x, z: killer.body.position.z }
      : null;
  }

  return {
    bots,
    hitMeshes,
    nav,
    assignRound,
    respawnAll,
    stepBot,
    killBot,
    syncMesh,
    losBlocked,
  };
}
