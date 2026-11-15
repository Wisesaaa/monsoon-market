// Yardline — the map. A container yard with a readable tactical structure:
// three lanes (Long Haul west, Mid Yard centre, Tunnel east), two bombsites
// (Crane Bay A, Stack Yard B) and a connector for rotations. Cover is
// shipping containers, stacked crates and chest-high walls; the floor is
// cracked concrete, the walls are brick, and one warm sun lights it all.
// All geometry is original; the lane names are ours.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { makeTextures, skyTexture, radialSprite } from './textures.js';

function makeSign(text, sub, w = 3.2, h = 0.9) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 144;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2b241c';
  ctx.fillRect(0, 0, 512, 144);
  ctx.fillStyle = '#c98f2e';
  ctx.fillRect(0, 0, 512, 10);
  ctx.fillRect(0, 134, 512, 10);
  ctx.fillStyle = '#efe6d0';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 78);
  ctx.fillStyle = '#c9b18c';
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText(sub, 256, 116);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }),
  );
  return mesh;
}

export function createMap(scene) {
  const T = makeTextures();
  const group = new THREE.Group();
  scene.add(group);

  const colliders = [];
  const shootables = [];
  const minimapBlocks = [];
  const contactTex = radialSprite('rgba(20, 14, 8, 0.5)', 'rgba(20, 14, 8, 0)');

  const matFloor = new THREE.MeshStandardMaterial({ map: T.concrete, roughness: 0.95 });
  matFloor.map.repeat.set(10, 8);
  const matBrick = new THREE.MeshStandardMaterial({ map: T.brick, roughness: 0.9 });
  matBrick.map.repeat.set(1, 1);
  const matWood = new THREE.MeshStandardMaterial({ map: T.wood, roughness: 0.85 });
  const matSand = new THREE.MeshStandardMaterial({ map: T.sand, roughness: 1 });
  const matSteel = new THREE.MeshStandardMaterial({ map: T.steel, roughness: 0.5, metalness: 0.6 });
  const matBlue = new THREE.MeshStandardMaterial({ map: T.containerBlue, roughness: 0.7, metalness: 0.25 });
  const matGreen = new THREE.MeshStandardMaterial({ map: T.containerGreen, roughness: 0.7, metalness: 0.25 });
  const matRed = new THREE.MeshStandardMaterial({ map: T.containerRed, roughness: 0.7, metalness: 0.25 });
  const matYellow = new THREE.MeshStandardMaterial({ map: T.containerYellow, roughness: 0.7, metalness: 0.25 });
  const matTerra = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.terracotta), roughness: 0.85 });
  const matDark = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3a332b'), roughness: 0.9 });

  // A box in the world: mesh + collider + shootable + (optionally) a minimap rect
  // and a soft contact shadow that grounds it on the concrete.
  function addBox(x, z, w, d, h, mat, opts = {}) {
    const y = (opts.y ?? 0) + h / 2;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = opts.shadow !== false;
    mesh.receiveShadow = true;
    if (opts.ry) mesh.rotation.y = opts.ry;
    group.add(mesh);
    const halfW = w / 2;
    const halfD = d / 2;
    const box = new THREE.Box3(
      new THREE.Vector3(x - halfW, y - h / 2, z - halfD),
      new THREE.Vector3(x + halfW, y + h / 2, z + halfD),
    );
    colliders.push(box);
    shootables.push(mesh);
    if (opts.map !== false && Math.max(w, d) >= 1.6) {
      minimapBlocks.push([x - halfW, z - halfD, x + halfW, z + halfD]);
    }
    if (opts.ground !== false && h >= 1.5) {
      const sh = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.max(w, d) * 1.15, Math.max(w, d) * 1.15),
        new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false }),
      );
      sh.rotation.x = -Math.PI / 2;
      sh.position.set(x, 0.02, z);
      sh.renderOrder = 0;
      group.add(sh);
    }
    return mesh;
  }

  // --- ground: cracked concrete, sand apron outside the fence ---
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(52, 40), matFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0);
  floor.receiveShadow = true;
  group.add(floor);
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(120, 110), matSand);
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, -0.05, 0);
  apron.receiveShadow = true;
  group.add(apron);

  // --- sky dome: warm gradient ---
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(120, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
  );
  sky.position.y = 0;
  group.add(sky);

  // --- light: one warm afternoon sun + sky fill ---
  const sun = new THREE.DirectionalLight(new THREE.Color(PALETTE.sun), 3.0);
  sun.position.set(-26, 34, 18);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.camera.far = 90;
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(new THREE.Color('#bcd6ea'), new THREE.Color('#c9b18c'), 1.15);
  scene.add(hemi);
  scene.fog = new THREE.Fog(new THREE.Color('#e8d9b8'), 46, 110);

  // --- perimeter: brick fence walls ---
  addBox(0, -18.5, 50, 1, 3.6, matBrick, { ground: false });
  addBox(0, 18.5, 50, 1, 3.6, matBrick, { ground: false });
  addBox(-24.5, 0, 1, 38, 3.6, matBrick, { ground: false });
  addBox(24.5, 0, 1, 38, 3.6, matBrick, { ground: false });

  // --- LONG HAUL (west lane, x -22..-14): long sightline, containers on the sides ---
  addBox(-21.5, 8, 2.4, 6, 2.6, matBlue); // container, west side
  addBox(-21.5, -2, 2.4, 6, 2.6, matRed); // container, west side
  addBox(-21.5, -10, 2.4, 5, 2.6, matGreen); // container near site A
  addBox(-13.5, 12, 2.4, 5, 2.6, matYellow); // container, east side of long
  addBox(-13.5, 2, 2.4, 5, 2.6, matBlue); // container, east side of long
  addBox(-18, 2, 4, 0.6, 1.1, matTerra, { ground: false }); // chest-high wall, long
  addBox(-16, 6, 1.2, 1.2, 1.2, matWood); // crate
  addBox(-16, 6, 1.2, 1.2, 1.2, matWood, { y: 1.2, ground: false, map: false }); // stacked crate
  addBox(-19.5, -6, 1.2, 1.2, 1.2, matWood); // crate near A

  // --- MID YARD (centre, x -5..5): the gate arch + mid crates ---
  addBox(-4.5, 0, 2.4, 2.4, 2.6, matGreen); // gate pillar west
  addBox(4.5, 0, 2.4, 2.4, 2.6, matRed); // gate pillar east
  addBox(0, 0, 11.4, 1.2, 0.9, matYellow, { y: 3.4, ground: false, map: false }); // gate beam overhead (painted gantry)
  addBox(3, 9, 1.2, 1.2, 1.2, matWood); // crate, mid south (off the centre line)
  addBox(0, -8, 1.2, 1.2, 1.2, matWood); // crate, mid north
  addBox(0, 4, 3, 0.6, 1.1, matTerra, { ground: false }); // low wall, mid
  addBox(-2, -6, 1.2, 1.2, 1.2, matWood); // crate, mid top
  addBox(2, -6, 1.2, 1.2, 1.2, matWood); // crate, mid top

  // --- TUNNEL (east lane, x 14..22): roofed corridor, containers for walls ---
  addBox(13, 10, 2.4, 6, 2.6, matRed); // tunnel west wall
  addBox(13, 2, 2.4, 6, 2.6, matBlue); // tunnel west wall
  addBox(13, -4, 2.4, 5, 2.6, matGreen); // tunnel west wall near B
  addBox(21.5, 10, 2.4, 6, 2.6, matGreen); // tunnel east wall
  addBox(21.5, 2, 2.4, 6, 2.6, matYellow); // tunnel east wall
  addBox(21.5, -6, 2.4, 4, 2.6, matRed); // tunnel east wall near B
  addBox(17.5, 8, 9, 3, 0.5, matYellow, { y: 3.8, ground: false, map: false }); // tunnel roof slab 1
  addBox(17.5, -1, 9, 3, 0.5, matYellow, { y: 3.8, ground: false, map: false }); // tunnel roof slab 2
  addBox(17.5, 4, 3, 0.6, 1.1, matTerra, { ground: false }); // low wall in tunnel

  // --- CONNECTOR (z -2, x -14..14): rotation corridor between the lanes ---
  addBox(-9, -2, 2.4, 2.4, 2.6, matYellow); // container, connector west
  addBox(9, -2, 2.4, 2.4, 2.6, matBlue); // container, connector east
  addBox(0, -2, 1.2, 1.2, 1.2, matWood); // crate, connector centre

  // --- SITE A — CRANE BAY (west, x -21..-15, z -13..-7) ---
  addBox(-18, -11, 1.2, 1.2, 1.2, matWood); // crate in site
  addBox(-16, -12, 2.4, 2.4, 2.6, matBlue); // container, site A edge
  // the crane: mast + jib + counter-jib + hook cable
  addBox(-22.5, -14, 1.4, 1.4, 12, matYellow, { ground: false, map: false });
  addBox(-20.5, -14, 5, 0.9, 0.9, matYellow, { y: 11.5, ground: false, map: false });
  addBox(-24, -14, 2.5, 0.8, 0.8, matDark, { y: 11.5, ground: false, map: false });
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 6, 6), matDark);
  cable.position.set(-18.5, 8.5, -14);
  group.add(cable);

  // --- SITE B — STACK YARD (east, x 15..21, z -13..-7) ---
  addBox(18, -11, 2.4, 2.4, 2.6, matGreen); // container, site B
  addBox(18, -11, 2.4, 2.4, 2.6, matRed, { y: 2.6, ground: false, map: false }); // stacked on top
  addBox(15.5, -8.5, 1.2, 1.2, 1.2, matWood); // crate in site B
  addBox(20.5, -8.5, 1.2, 1.2, 1.2, matWood); // crate in site B

  // --- spawn areas: a few crates and a low wall each side ---
  addBox(-5, 16, 1.2, 1.2, 1.2, matWood);
  addBox(5, 16, 1.2, 1.2, 1.2, matWood);
  addBox(0, 17, 4, 0.6, 1.1, matTerra, { ground: false });
  addBox(-5, -16, 2.4, 2.4, 2.6, matBlue);
  addBox(5, -16, 1.2, 1.2, 1.2, matWood);
  addBox(0, -17, 4, 0.6, 1.1, matTerra, { ground: false });

  // --- signs ---
  const signA = makeSign('CRANE BAY', 'SITE A — LONG HAUL');
  signA.position.set(-18, 3.4, -13.2);
  signA.rotation.y = 0;
  group.add(signA);
  const signB = makeSign('STACK YARD', 'SITE B — TUNNEL');
  signB.position.set(18, 3.4, -13.2);
  group.add(signB);
  const signMid = makeSign('MID YARD', 'CONTAINER GATE');
  signMid.position.set(0, 4.6, -0.65);
  signMid.rotation.y = Math.PI;
  group.add(signMid);

  // --- nav: named waypoints bots follow (all on open lanes) ---
  const waypoints = {
    atkSpawn: [0, 16], atkLong1: [-18, 12], atkLong2: [-18, 4], atkLong3: [-18, -4], siteA: [-18, -10],
    atkTun1: [17.5, 12], atkTun2: [17.5, 4], atkTun3: [17.5, -4], siteB: [18, -10],
    atkMid1: [0, 12], atkMid2: [0, 5], gate: [0, 0], midTop: [0, -6], midA: [-9, -8], midB: [9, -8],
    defA: [-14, -12], defA2: [-19, -12], defB: [14, -12], defB2: [20, -12], defMid: [0, -13],
    connW: [-11, -2], connE: [11, -2],
  };
  const routes = {
    attackA: ['atkSpawn', 'atkLong1', 'atkLong2', 'atkLong3', 'siteA'],
    attackB: ['atkSpawn', 'atkTun1', 'atkTun2', 'atkTun3', 'siteB'],
    attackMidA: ['atkSpawn', 'atkMid1', 'atkMid2', 'gate', 'midTop', 'midA', 'siteA'],
    attackMidB: ['atkSpawn', 'atkMid1', 'atkMid2', 'gate', 'midTop', 'midB', 'siteB'],
    defendA: ['defA'],
    defendB: ['defB'],
    defendMid: ['defMid'],
    rotateAtoB: ['midA', 'midTop', 'midB', 'siteB'],
    rotateBtoA: ['midB', 'midTop', 'midA', 'siteA'],
    toA: ['midA', 'siteA'],
    toB: ['midB', 'siteB'],
  };

  const sites = {
    A: { minX: -21, maxX: -15, minZ: -13, maxZ: -7, x: -18, z: -10, name: 'CRANE BAY' },
    B: { minX: 15, maxX: 21, minZ: -13, maxZ: -7, x: 18, z: -10, name: 'STACK YARD' },
  };

  const spawns = {
    attack: [[-4, 16], [-2, 17], [0, 16], [2, 17], [4, 16]],
    defend: [[-14, -15], [-7, -16], [0, -15], [7, -16], [14, -15]],
  };

  // --- areas: HUD callout when the player walks into one ---
  const areas = [
    { name: 'LONG HAUL', minX: -23, maxX: -13, minZ: -14, maxZ: 15 },
    { name: 'TUNNEL', minX: 13, maxX: 23, minZ: -14, maxZ: 15 },
    { name: 'MID YARD', minX: -6, maxX: 6, minZ: -14, maxZ: 15 },
    { name: 'CRANE BAY', minX: -23, maxX: -13, minZ: -14, maxZ: -7 },
    { name: 'STACK YARD', minX: 13, maxX: 23, minZ: -14, maxZ: -7 },
    { name: 'CONNECTOR', minX: -13, maxX: 13, minZ: -4, maxZ: 0 },
    { name: 'ATTACK SPAWN', minX: -8, maxX: 8, minZ: 13, maxZ: 18 },
    { name: 'DEFEND SPAWN', minX: -8, maxX: 8, minZ: -18, maxZ: -13 },
  ];
  function areaAt(x, z) {
    // sites first (they overlap their lane), then lanes, then spawns
    for (const a of areas) {
      if (a.name === 'CRANE BAY' || a.name === 'STACK YARD') {
        if (x >= a.minX && x <= a.maxX && z >= a.minZ && z <= a.maxZ) return a.name;
      }
    }
    for (const a of areas) {
      if (a.name === 'LONG HAUL' || a.name === 'TUNNEL' || a.name === 'MID YARD') {
        if (x >= a.minX && x <= a.maxX && z >= a.minZ && z <= a.maxZ) return a.name;
      }
    }
    for (const a of areas) {
      if (x >= a.minX && x <= a.maxX && z >= a.minZ && z <= a.maxZ) return a.name;
    }
    return 'YARD';
  }

  const minimap = {
    minX: -25, maxX: 25, minZ: -19, maxZ: 19,
    blocks: minimapBlocks,
    sites,
  };

  return { colliders, shootables, waypoints, routes, sites, spawns, minimap, areas, areaAt, group };
}
