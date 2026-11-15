// Yardline — boot and the one loop: a fixed 60 Hz simulation feeding
// a render at the display's rate. ?shot=cover|buy|mid|site with &seed=N sets
// up a deterministic frame for a capture, renders it twice, then freezes it
// and sets window.__shotReady.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { WEAPONS, ROUND, ECONOMY, TEAMS, createGameState } from './state.js';
import { createMap } from './map.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createBody, createMover } from './player.js';
import { createWeaponInstance } from './weapons.js';
import { createEffects } from './effects.js';
import { createBots } from './bots.js';
import { createRounds } from './rounds.js';
import { createHud } from './hud.js';
import { createHearing } from './hearing.js';
import { createGrenades } from './grenade.js';

const FIXED_STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;

function mulberry32(initial) {
  let a = initial;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(seed);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.sky);
const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 140);
scene.add(camera);
// warm fill light on the camera so the viewmodel never goes black at sunset
const viewFill = new THREE.PointLight(new THREE.Color('#ffd9a0'), 0.55, 3, 1.5);
viewFill.position.set(0, 0.1, 0.15);
camera.add(viewFill);

const map = createMap(scene);
const audio = createAudio();
const effects = createEffects(scene, camera);
const input = createInput(renderer.domElement, onLockChange);
const mover = createMover(map.colliders);
const G = createGameState();
// hearing.js owns the noise system: gunshots, footsteps, plant beeps.
const hearing = createHearing(G.noises);
// grenade.js owns the throwable utility (frag / smoke / flash).
const grenadeSys = createGrenades(scene);

const player = {
  id: 'you', name: 'You', team: 'attack', isPlayer: true,
  body: createBody(0, 16, Math.PI),
  hp: 100, armor: 0, hasHelm: false, alive: true,
  money: ECONOMY.start,
  utility: { frag: 0, smoke: 0, flash: 0 },
  hasKit: false,
  loadout: { primary: null, secondary: null, knife: null },
  activeSlot: 'secondary',
  weapon: null,
};
player.loadout.secondary = createWeaponInstance(null, 'p9');
player.loadout.knife = createWeaponInstance(null, 'knife');
player.weapon = player.loadout.secondary;
player.weapon.attach(camera);
G.actors.push(player);

const bots = createBots(scene, map, mover, G);
G.actors.push(...bots.bots);
const shootables = map.shootables.concat(bots.hitMeshes);

const hud = createHud(map.minimap, { onBuy: (id) => buyItem(id) });

function radio(who, text) {
  G.radio.push({ who, text });
  hud.radio(who, text, who === 'YOU');
  if (who !== 'SYSTEM') audio.radio();
}
function feed(text, kind) {
  G.feed.push({ text, kind });
  hud.killFeed(text, kind);
}

function equipSlot(slot) {
  if (slot === 'primary' && !player.loadout.primary) return;
  if (player.weapon) player.weapon.detach(camera);
  player.activeSlot = slot;
  player.weapon = player.loadout[slot];
  player.weapon.attach(camera);
  // weapon weight: a DMR slows the body, a pistol does not
  player.body.weaponKind = player.weapon.def.kind;
  syncWeaponHud();
}

function setWeapon(actor, itemId) {
  if (!actor.isPlayer) {
    if (actor.weapon) actor.weapon.dispose();
    actor.weapon = createWeaponInstance(null, itemId);
    actor.weapon.refill();
    return;
  }
  const def = WEAPONS[itemId];
  const slot = def.kind === 'pistol' ? 'secondary' : def.kind === 'knife' ? 'knife' : 'primary';
  if (player.loadout[slot]) player.loadout[slot].dispose(camera);
  player.loadout[slot] = createWeaponInstance(null, itemId);
  player.loadout[slot].refill();
  equipSlot(slot);
}

function buyItem(itemId) {
  if (rounds.buy(player, itemId)) syncWeaponHud();
}

function damage(target, amount, isHead, attacker) {
  if (!target.alive || G.phase === 'matchEnd') return;
  let dmg = amount;
  if (isHead && target.hasHelm) dmg *= 0.5;
  if (target.armor > 0) {
    const absorbed = Math.min(target.armor, dmg * 0.5);
    target.armor -= absorbed;
    dmg -= absorbed;
  }
  target.hp -= dmg;
  // damage scoreboard: track who dealt how much, for the round-end screen
  if (attacker) attacker.damageDealt = (attacker.damageDealt || 0) + Math.round(dmg);
  target.damageTaken = (target.damageTaken || 0) + Math.round(dmg);
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    if (target.isPlayer) {
      audio.explode();
      feed(`${attacker ? attacker.name : 'World'} eliminated YOU`, 'bad');
      hud.showBanner('ELIMINATED', 'Your team fights on — next round you are back in.');
      if (document.pointerLockElement) document.exitPointerLock();
    } else {
      bots.killBot(target, attacker, G.time);
      const wname = attacker && attacker.weapon ? attacker.weapon.def.name : '';
      feed(`${attacker ? attacker.name : ''} ${wname}${isHead ? ' HS' : ''} ${target.name}`, attacker && attacker.isPlayer ? 'good' : '');
      if (attacker) {
        attacker.money += ECONOMY.kill;
        if (attacker.isPlayer) {
          audio.hit(true);
          hud.hitMarker(true);
        }
      }
      if (G.stormcell.carrierId === target.id) {
        radio('SYSTEM', `${target.name} dropped the charge`);
      }
    }
  } else if (target.isPlayer) {
    audio.hit(false);
    hud.hitMarker(false);
    if (attacker) damageDirection(attacker);
  }
}

// red wedge in the HUD pointing at whoever just shot the player
function damageDirection(attacker) {
  const dx = attacker.body.position.x - player.body.position.x;
  const dz = attacker.body.position.z - player.body.position.z;
  const attackerYaw = Math.atan2(-dx, -dz);
  let rel = attackerYaw - player.body.yaw;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  hud.damageFrom(-rel * 180 / Math.PI);
}

const raycaster = new THREE.Raycaster();
raycaster.far = 120;
const _dir = new THREE.Vector3();
const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _muzzle = new THREE.Vector3();

function playerShoot() {
  const w = player.weapon;
  if (!w || !player.alive) return;
  if (!w.ready()) {
    if (w.state.mag === 0 && w.state.reloadLeft === 0) audio.dryFire();
    return;
  }
  if (!w.takeRound()) return;
  w.pullTrigger();
  audio.shot(w.def.kind, false);
  // eject a brass shell from the muzzle, up and to the right
  const muzzleWorld = w.model.localToWorld(new THREE.Vector3().copy(w.muzzleLocal));
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  effects.shell(muzzleWorld, right);
  camera.getWorldDirection(_dir);
  const spread = w.spread(mover.groundSpeed(player.body));
  const pellets = w.def.pellets || 1;
  let anyHit = false;
  for (let p = 0; p < pellets; p += 1) {
    _to.copy(_dir);
    _to.x += (random() * 2 - 1) * spread;
    _to.y += (random() * 2 - 1) * spread;
    _to.z += (random() * 2 - 1) * spread;
    _to.normalize();
    _from.copy(camera.position);
    raycaster.set(_from, _to);
    const hits = raycaster.intersectObjects(shootables, false);
    let end = null;
    let hitActor = null;
    let hitPart = null;
    for (const h of hits) {
      const actor = h.object.userData.actor;
      if (actor && !actor.alive) continue;
      end = h.point;
      hitActor = actor || null;
      hitPart = h.object.userData.part || null;
      break;
    }
    if (!end) {
      end = _to.clone().multiplyScalar(80).add(_from);
    }
    _muzzle.copy(camera.position).addScaledVector(_dir, 0.5);
    _muzzle.y -= 0.12;
    effects.tracer(_muzzle, end);
    if (hitActor) {
      const isHead = hitPart === 'head';
      let dmg = w.def.damage * (isHead ? w.def.headMult : 1);
      if (hitActor.armor > 0) dmg *= 0.6;
      damage(hitActor, dmg, isHead, player);
      hud.damageNumber(Math.round(dmg), isHead);
      anyHit = true;
    } else if (hits.length > 0) {
      effects.spark(end, 5);
      // bullet hole on the wall, facing back along the shot
      const n = new THREE.Vector3().copy(_to).multiplyScalar(-1);
      effects.decal(end, n);
    }
  }
  if (anyHit) audio.hit(false);
  player.body.pitch = Math.min(1.45, player.body.pitch + w.def.kick + random() * 0.003);
  player.body.yaw += (random() * 2 - 1) * w.def.kick * 0.4;
  syncWeaponHud();
}

function throwGrenade(kind) {
  if (!player.alive || player.utility[kind] <= 0) return;
  camera.getWorldDirection(_dir);
  const target = new THREE.Vector3().copy(camera.position).addScaledVector(_dir, 20);
  if (grenadeSys.throwAt(camera.position, target, kind, player)) syncWeaponHud();
}

const rounds = createRounds(G, {
  audio,
  radio,
  feed,
  sites: map.sites,
  setupRound(round) {
    // player respawn
    const died = !player.alive;
    const spawn = player.team === 'attack' ? map.spawns.attack[2] : map.spawns.defend[2];
    player.body.position.set(spawn[0], 0, spawn[1]);
    player.body.velocity.set(0, 0, 0);
    player.body.yaw = player.team === 'attack' ? 0 : Math.PI;
    player.body.pitch = 0;
    player.hp = 100;
    player.alive = true;
    player.armor = died ? 0 : player.armor;
    player.hasHelm = died ? false : player.hasHelm;
    if (died) {
      if (player.loadout.primary) { player.loadout.primary.dispose(camera); player.loadout.primary = null; }
      if (player.activeSlot === 'primary') equipSlot('secondary');
      player.loadout.secondary = createWeaponInstance(null, 'p9');
      player.loadout.secondary.refill();
      if (player.activeSlot === 'secondary') {
        player.weapon.detach(camera);
        player.weapon = player.loadout.secondary;
        player.weapon.attach(camera);
      }
    } else {
      player.weapon.refill();
    }
    bots.assignRound((round - 1) % 3);
    bots.respawnAll(G);
    hud.showBuy(true, player.money);
    hud.hideBanner();
  },
  playerPlanting(site) {
    return player.alive && G.stormcell.carrierId === 'you' && site !== null
      && (input.state.keys.has('KeyE'));
  },
  playerDefusing() {
    if (!player.alive || !G.stormcell.planted || player.team !== 'defend') return false;
    const s = map.sites[G.stormcell.site];
    const p = player.body.position;
    return input.state.keys.has('KeyE')
      && p.x >= s.minX && p.x <= s.maxX && p.z >= s.minZ && p.z <= s.maxZ;
  },
  setWeapon,
  onEvent(kind, data) {
    if (kind === 'roundStart') {
      hud.showBuy(true, player.money);
      radio('SYSTEM', `Round ${data.round} — ${G.plan ? G.plan.text : ''}`);
    } else if (kind === 'live') {
      hud.showBuy(false);
      hud.setBuyAfford(player.money);
    } else if (kind === 'planted') {
      hud.showBanner('CHARGE PLANTED', `Site ${data.site} — 40 seconds on the fuse`, 4000);
    } else if (kind === 'roundEnd') {
      hud.showBuy(false);
      // damage scoreboard: every actor's damage dealt this match, best first
      const table = G.actors
        .map((a) => ({ name: a.isPlayer ? 'YOU' : a.name, team: a.team, dmg: a.damageDealt || 0, alive: a.alive }))
        .sort((a, b) => b.dmg - a.dmg);
      hud.showOverlay('roundEnd', { round: G.round, winner: data.winner === 'attack' ? TEAMS.ATTACK.name : TEAMS.DEFEND.name, reason: data.reason, table });
      setTimeout(() => hud.hideOverlay(), 3800);
    } else if (kind === 'matchEnd') {
      const score = `${G.scoreAttack} — ${G.scoreDefend}`;
      hud.showOverlay('matchEnd', { winner: data.winner, score });
    } else if (kind === 'explode') {
      effects.smoke(new THREE.Vector3(map.sites[data.site].x, 1, map.sites[data.site].z));
    }
  },
});

const botCtx = {
  G,
  colliders: map.colliders,
  actors: G.actors,
  time: 0,
  damage,
  tracer: (from, to) => effects.tracer(from, to),
  hearing,
  // grenades: bots throw utility when they execute a site
  throwGrenade: (bot, kind, target) => {
    const from = new THREE.Vector3(bot.body.position.x, bot.body.position.y + 1.4, bot.body.position.z);
    return grenadeSys.throwAt(from, target, kind, bot);
  },
  radio: (bot, text) => radio(bot.name, text),
};

function syncWeaponHud() {
  const w = player.weapon;
  const slots = [
    { label: '1 ' + (player.loadout.primary ? player.loadout.primary.def.name : '—'), active: player.activeSlot === 'primary' },
    { label: '2 P9', active: player.activeSlot === 'secondary' },
    { label: '3 KNIFE', active: player.activeSlot === 'knife' },
  ];
  hud.setWeapon(w.def.id, w.state.mag, w.state.reserve, slots, player.utility);
}

function syncCamera() {
  // landing dip: the camera drops a little after a hard landing
  const dip = player.body.landDip * 0.09;
  camera.position.set(player.body.position.x, player.body.position.y + player.body.eye - dip, player.body.position.z);
  // lean (Q/E): roll the camera and shift it sideways a touch, so a peek
  // around a corner reads as a lean, not a strafe
  const lean = player.body.lean;
  camera.rotation.set(player.body.pitch, player.body.yaw, -lean * 0.06, 'YXZ');
  camera.position.x += Math.cos(player.body.yaw) * lean * 0.12;
  camera.position.z -= Math.sin(player.body.yaw) * lean * 0.12;
}

function syncHud() {
  hud.setVitals(player.hp, player.armor, player.hasHelm, player.money);
  hud.setTopBar(G.scoreAttack, G.scoreDefend, G.timer, G.round, ROUND.maxRounds, G.plan ? G.plan.text : '', G.phase);
  hud.setCrosshair(player.weapon ? player.weapon.spread(mover.groundSpeed(player.body)) * 900 : 0);
  hud.setCarrying(G.stormcell.carrierId === 'you' && !G.stormcell.planted);
  const sc = G.stormcell;
  if (!sc.planted && sc.carrierId === 'you') {
    const site = rounds.inSite(player, 'A') ? 'A' : rounds.inSite(player, 'B') ? 'B' : null;
    hud.setPlantBar(site !== null, site ? `PLANTING AT ${site} — hold E` : '', sc.plantProgress / ROUND.plantTime);
  } else if (sc.planted && player.team === 'defend') {
    hud.setPlantBar(sc.defuserId === 'you', sc.defuserId === 'you' ? 'DEFUSING — hold E' : `FUSE ${Math.max(0, Math.ceil(sc.fuse))}s`, sc.defuseProgress / ROUND.defuseTime);
  } else if (sc.planted) {
    hud.setPlantBar(true, `FUSE ${Math.max(0, Math.ceil(sc.fuse))}s — defend the charge`, sc.fuse / ROUND.fuse);
  } else {
    hud.setPlantBar(false, '', 0);
  }
  hud.drawMinimap(G, player);
  // area callout: name the part of the market the player is standing in
  const area = map.areaAt(player.body.position.x, player.body.position.z);
  hud.setArea(area);
}

function step(dt) {
  botCtx.time = G.time;
  // player movement
  if (player.alive && G.phase !== 'matchEnd') {
    const wantAds = input.state.aiming && player.weapon && player.weapon.def.kind !== 'knife';
    mover.stepBody(player.body, dt, input.state.keys, wantAds);
    // footsteps: a soft thud every couple of metres while moving on the ground
    const spd = mover.groundSpeed(player.body);
    if (spd > 0.5 && player.body.onGround) {
      stepAcc += spd * dt;
      if (stepAcc > 2.4) {
        stepAcc = 0;
        audio.step();
      }
    }
  }
  // player weapon: sway and bob follow the mouse and the feet
  if (player.weapon) {
    // ADS: right mouse aims down the sights (not for the knife). While
    // aiming the viewmodel centres, the spread tightens and the FOV
    // narrows, so a held angle is a real decision, not a free zoom.
    const wantAds = input.state.aiming && player.weapon.def.kind !== 'knife' && player.alive;
    player.weapon.setAiming(wantAds);
    const targetFov = wantAds ? 55 : 74;
    if (Math.abs(camera.fov - targetFov) > 0.1) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 12);
      camera.updateProjectionMatrix();
    }
    player.weapon.step(dt, {
      speed: mover.groundSpeed(player.body),
      lookX: lastLook.x,
      lookY: lastLook.y,
    });
  }
  // bots only fight once the round is live (or the cell is planted);
  // during freeze and round end they hold at their spawns.
  const combat = G.phase === 'live' || G.phase === 'planted';
  for (const bot of bots.bots) {
    if (!bot.alive) continue;
    if (combat) bots.stepBot(bot, dt, botCtx);
    else bot.weapon.step(dt);
  }
  // bot planting: carrier bot at its site plants
  const sc = G.stormcell;
  if (!sc.planted) {
    const carrier = G.actors.find((a) => a.id === sc.carrierId);
    if (carrier && !carrier.isPlayer && carrier.alive) {
      const site = rounds.inSite(carrier, 'A') ? 'A' : rounds.inSite(carrier, 'B') ? 'B' : null;
      if (site && carrier.state === 'hold' && carrier.route && carrier.route.startsWith('attack')) {
        carrier.state = 'plant';
        radio(carrier.name, `Planting at ${site} — cover me`);
      }
    }
  } else {
    // bot defuse: defenders rotate to the planted site, then defuse
    const defenders = G.actors.filter((a) => a.team === 'defend' && a.alive && !a.isPlayer);
    for (const d of defenders) {
      if (d.state === 'defuse') continue;
      if (rounds.inSite(d, sc.site)) {
        d.state = 'defuse';
        radio(d.name, `Defusing at ${sc.site}`);
      } else if (d.state !== 'advance') {
        // nav.js picks the rotation route from the defender's side
        d.route = bots.nav.rotationRoute(d.body.position.x, sc.site);
        d.routeIndex = 0;
        d.state = 'advance';
      }
    }
  }
  // noises decay (hearing.js owns the array)
  hearing.decay(dt);
  grenadeSys.step(dt, { G, damage, effects, audio, hud, bots: bots.bots, player });
  effects.step(dt);
  rounds.step(dt);
}

let elapsed = 0;
let frozen = false;
let started = false;
let accumulator = 0;
let lastTime = performance.now();
let stepAcc = 0;
let lastLook = { x: 0, y: 0 };

hud.setVitals(100, 0, false, ECONOMY.start);
syncWeaponHud();
hud.setTopBar(0, 0, ROUND.freeze, 1, ROUND.maxRounds, '', 'freeze');
hud.onPlay(() => {
  if (shot) return;
  audio.unlock();
  if (G.phase === 'matchEnd') {
    // restart the match
    G.scoreAttack = 0;
    G.scoreDefend = 0;
    G.round = 1;
    G.half = 1;
    G.matchWinner = null;
    player.money = ECONOMY.start;
    player.team = 'attack';
    rounds.startRound();
  }
  input.requestLock();
});

function onLockChange(locked) {
  if (shot) return;
  if (locked) {
    started = true;
    hud.hideOverlay();
    hud.showBuy(G.phase === 'freeze', player.money);
  } else if (G.phase !== 'matchEnd' && player.alive) {
    hud.showOverlay(started ? 'paused' : 'start');
    hud.showBuy(false);
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  if (!frozen) {
    const look = input.takeLook();
    lastLook = look;
    if (player.alive) {
      player.body.yaw -= look.x * 0.0022;
      player.body.pitch = Math.max(-1.45, Math.min(1.45, player.body.pitch - look.y * 0.0022));
    }
    // weapon slots / grenades / buy / reload
    if (G.phase === 'freeze') {
      const buyKeys = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];
      const buyIds = ['drizzle', 'monsoon', 'stallbreaker', 'longrain', 'armor', 'helm', 'frag', 'smoke', 'flash', 'kit'];
      buyKeys.forEach((code, i) => {
        if (input.wasPressed(code)) buyItem(buyIds[i]);
      });
      hud.setBuyAfford(player.money);
    } else {
      if (input.wasPressed('Digit1')) equipSlot('primary');
      if (input.wasPressed('Digit2')) equipSlot('secondary');
      if (input.wasPressed('Digit3')) equipSlot('knife');
      if (input.wasPressed('Digit4')) throwGrenade('frag');
      if (input.wasPressed('Digit5')) throwGrenade('smoke');
      if (input.wasPressed('Digit6')) throwGrenade('flash');
    }
    if (input.wasPressed('KeyR') && player.weapon) {
      if (player.weapon.reload()) audio.reload();
    }
    if (input.state.firing && player.weapon) {
      if (player.weapon.def.auto) {
        if (player.weapon.ready()) playerShoot();
      } else if (input.wasPressed('Mouse0') && player.weapon.ready()) {
        playerShoot();
      }
    }
    accumulator += dt;
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < 5) {
      step(FIXED_STEP);
      accumulator -= FIXED_STEP;
      steps += 1;
    }
    if (accumulator > FIXED_STEP * 5) accumulator = 0;
    syncCamera();
    syncHud();
    input.endFrame();
  }
  renderer.render(scene, camera);
}

function settle(steps) {
  for (let i = 0; i < steps; i += 1) step(FIXED_STEP);
}

function aimAt(point) {
  const dx = point.x - player.body.position.x;
  const dy = point.y - (player.body.position.y + player.body.eye);
  const dz = point.z - player.body.position.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  player.body.yaw = Math.atan2(-dx, -dz);
  player.body.pitch = Math.asin(Math.max(-1, Math.min(1, dy / len)));
  syncCamera();
}

function placeActor(actor, x, z, yaw) {
  actor.body.position.set(x, 0, z);
  actor.body.velocity.set(0, 0, 0);
  actor.body.yaw = yaw;
  actor.body.pitch = 0;
  if (!actor.isPlayer) {
    actor.state = 'hold';
    actor.target = null;
    bots.syncMesh(actor);
  }
}

function drawTracerTo(point) {
  camera.getWorldDirection(_dir);
  _muzzle.copy(camera.position).addScaledVector(_dir, 0.5);
  _muzzle.y -= 0.12;
  effects.tracer(_muzzle, point);
}

function runShot(name) {
  hud.hideOverlay();
  audio.unlock();
  // fresh round, deterministic
  G.round = name === 'cover' ? 7 : name === 'mid' ? 5 : name === 'site' ? 9 : 3;
  G.scoreAttack = name === 'cover' ? 4 : 2;
  G.scoreDefend = name === 'cover' ? 3 : 1;
  rounds.startRound();
  hud.clearRadio();
  hud.clearFeed();
  radio('SYSTEM', `Round ${G.round} — ${G.plan ? G.plan.text : ''}`);
  settle(10);
  G.phase = 'live';
  G.timer = name === 'cover' ? 72 : name === 'mid' ? 58 : name === 'site' ? 44 : 96;
  hud.showBuy(false);
  const attackers = bots.bots.filter((b) => b.team === 'attack');
  const defenders = bots.bots.filter((b) => b.team === 'defend');
  // staged shots use the rifle so the viewmodel reads in the frame
  if (name !== 'buy') setWeapon(player, 'monsoon');

  if (name === 'cover') {
    // neon alley firefight through the gate
    placeActor(player, -6, 12, Math.PI * 0.92);
    player.money = 2350;
    G.stormcell.carrierId = 'you';
    placeActor(defenders[0], 4, -2, Math.PI / 2);
    placeActor(defenders[1], -8, -6, -Math.PI / 2);
    placeActor(attackers[0], -3, 10, Math.PI);
    radio('Rani', 'Contact at Fish Lane — two on B long');
    settle(8);
    aimAt(new THREE.Vector3(4, 1.3, -2));
    playerShoot();
    settle(4);
    drawTracerTo(new THREE.Vector3(4, 1.3, -2));
  } else if (name === 'buy') {
    G.phase = 'freeze';
    G.timer = 6;
    placeActor(player, 0, 14, Math.PI);
    player.money = 2350;
    hud.showBuy(true, player.money);
    hud.setBuyAfford(player.money);
    settle(20);
    aimAt(new THREE.Vector3(0, 1.6, 2));
  } else if (name === 'mid') {
    placeActor(player, -5, 11, Math.PI * 0.95);
    player.money = 1850;
    G.stormcell.carrierId = 'you';
    placeActor(defenders[0], 4, 0, Math.PI);
    placeActor(defenders[1], -8, -4, 0);
    placeActor(attackers[0], 3, 8, Math.PI);
    effects.smoke(new THREE.Vector3(0, 1, 2));
    radio('Sari', 'Two mid — smoking the gate');
    settle(6);
    aimAt(new THREE.Vector3(4, 1.3, 0));
    playerShoot();
    settle(4);
    drawTracerTo(new THREE.Vector3(4, 1.3, 0));
  } else if (name === 'site') {
    // stormcell planted at B, defender defusing, player pushing in
    G.stormcell.planted = true;
    G.stormcell.site = 'B';
    G.stormcell.fuse = 37;
    G.phase = 'planted';
    placeActor(player, 8, 1, Math.PI * 0.72);
    player.money = 3200;
    placeActor(defenders[0], 17, -8, Math.PI / 2);
    defenders[0].state = 'defuse';
    placeActor(defenders[1], 13, -4, 0);
    placeActor(attackers[0], 12, 2, Math.PI);
    hud.showBanner('STORMCELL PLANTED', 'Site B — 37 seconds on the fuse', 60000);
    radio('YOU', 'Stormcell planted at B — hold the court');
    settle(6);
    aimAt(new THREE.Vector3(17, 1.3, -8));
    playerShoot();
    settle(4);
    drawTracerTo(new THREE.Vector3(17, 1.3, -8));
  }
  syncCamera();
  syncWeaponHud();
  syncHud();
  // keep the muzzle flash lit for the capture frame on the shooting shots
  if (name === 'cover' || name === 'mid' || name === 'site') {
    player.weapon.flash.visible = true;
    player.weapon.flash.scale.set(0.24, 0.24, 1);
    player.weapon.flashLight.intensity = 26;
  }
  paintTwiceThenReady();
}

function paintTwiceThenReady() {
  // Render synchronously, twice: the capture browser may throttle
  // requestAnimationFrame in a background tab, so the shot must not depend
  // on it. The two renders let shadows and the rain settle. Readiness is
  // signalled on the document as well as on window, so a capture script
  // that cannot read page globals can still see it.
  syncCamera();
  renderer.render(scene, camera);
  syncCamera();
  renderer.render(scene, camera);
  window.__shotReady = true;
  document.documentElement.setAttribute('data-shot-ready', 'true');
  frozen = true;
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

syncCamera();
rounds.startRound();
if (shot) runShot(shot);
else requestAnimationFrame(frame);
