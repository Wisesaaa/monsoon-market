// Library — a 5v5 bombsite map inside a grand library (Point Blank style).
// Layout from Yiro's reference: CT spawn in the Main Reading Hall (north),
// T spawn in the Entrance Lobby (south), Site A = Study Room (west),
// Site B = Archive Room (east), Mid with a fountain, a Long A Corridor
// along the west edge and B Tunnels along the east edge, all joined by a
// Connecting Hallway. Warm interior light: lanterns + window light.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { makeTextures } from './textures.js';

const WALL_H = 5.5;
const WALL_T = 0.5;

export function createMap(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const tex = makeTextures();
  const colliders = [];
  const shootables = [];
  const minimapBlocks = [];
  const areas = [];

  const matWall = new THREE.MeshStandardMaterial({ color: new THREE.Color('#b39a72'), roughness: 0.9, map: tex.brick });
  const matWallDark = new THREE.MeshStandardMaterial({ color: new THREE.Color('#8a6a4a'), roughness: 0.9 });
  const matFloor = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c9b18c'), roughness: 0.85, map: tex.concrete });
  const matWood = new THREE.MeshStandardMaterial({ color: new THREE.Color('#7a5230'), roughness: 0.75, map: tex.wood });
  const matWoodDark = new THREE.MeshStandardMaterial({ color: new THREE.Color('#5f3d22'), roughness: 0.8, map: tex.wood });
  const matShelf = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6b4a2f'), roughness: 0.8 });
  const matBooks = new THREE.MeshStandardMaterial({ map: tex.books, roughness: 0.85 });
  const matCeil = new THREE.MeshStandardMaterial({ color: new THREE.Color('#8a6a4a'), roughness: 0.95, emissive: new THREE.Color('#3a2a18'), emissiveIntensity: 0.7 });
  const matWindow = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3a2f26'), emissive: new THREE.Color('#ffb45e'), emissiveIntensity: 1.6, roughness: 0.6 });
  const matWater = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3e6b8c'), roughness: 0.2, metalness: 0.1, emissive: new THREE.Color('#1a3a4a'), emissiveIntensity: 0.5 });
  const matLeaf = new THREE.MeshStandardMaterial({ color: new THREE.Color('#4d7a5a'), roughness: 0.9 });
  const matRug = new THREE.MeshStandardMaterial({ color: new THREE.Color('#a34a3a'), roughness: 0.95 });
  const matRugGold = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c98f2e'), roughness: 0.95 });

  function addBox(x, z, w, d, h, mat, opts = {}) {
    const y = opts.y ?? h / 2;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    if (opts.ry) mesh.rotation.y = opts.ry;
    mesh.castShadow = opts.shadow !== false;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (opts.ground !== false) {
      colliders.push(new THREE.Box3(
        new THREE.Vector3(x - w / 2, 0, z - d / 2),
        new THREE.Vector3(x + w / 2, h, z + d / 2),
      ));
      shootables.push(mesh);
      if (Math.max(w, d) >= 1.6) minimapBlocks.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
    }
    return mesh;
  }

  function addPlane(x, y, z, w, h, mat, ry = 0, rx = 0) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, 0);
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  // --- walls with door gaps ---
  // A wall along x at height z, from x0 to x1, with gaps (each [gx0, gx1]).
  function hWall(z, x0, x1, gaps = []) {
    let cur = x0;
    const segs = [];
    for (const [gx0, gx1] of gaps) {
      if (gx0 > cur) segs.push([cur, gx0]);
      cur = Math.max(cur, gx1);
    }
    if (cur < x1) segs.push([cur, x1]);
    for (const [sx0, sx1] of segs) {
      addBox((sx0 + sx1) / 2, z, sx1 - sx0, WALL_T, WALL_H, matWall);
    }
    // lintel over each gap
    for (const [gx0, gx1] of gaps) {
      addBox((gx0 + gx1) / 2, z, gx1 - gx0, WALL_T, WALL_H - 3, matWallDark, { y: 3 + (WALL_H - 3) / 2, ground: false });
    }
  }
  // A wall along z at x, from z0 to z1, with gaps (each [gz0, gz1]).
  function vWall(x, z0, z1, gaps = []) {
    let cur = z0;
    const segs = [];
    for (const [gz0, gz1] of gaps) {
      if (gz0 > cur) segs.push([cur, gz0]);
      cur = Math.max(cur, gz1);
    }
    if (cur < z1) segs.push([cur, z1]);
    for (const [sz0, sz1] of segs) {
      addBox(x, (sz0 + sz1) / 2, WALL_T, sz1 - sz0, WALL_H, matWall);
    }
    for (const [gz0, gz1] of gaps) {
      addBox(x, (gz0 + gz1) / 2, WALL_T, gz1 - gz0, WALL_H - 3, matWallDark, { y: 3 + (WALL_H - 3) / 2, ground: false });
    }
  }

  // --- floor: wood + checkered lobby ---
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(48, 36), matFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);
  const lobbyFloor = new THREE.Mesh(new THREE.PlaneGeometry(18, 6), new THREE.MeshStandardMaterial({ map: tex.checker, roughness: 0.7 }));
  lobbyFloor.rotation.x = -Math.PI / 2;
  lobbyFloor.position.set(0, 0.01, 15);
  lobbyFloor.receiveShadow = true;
  group.add(lobbyFloor);

  // --- ceiling (does not cast shadow, so window light still reaches in) ---
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(48, 0.2, 36), matCeil);
  ceil.position.set(0, WALL_H + 0.1, 0);
  group.add(ceil);
  // ceiling beams
  for (const bx of [-18, -6, 6, 18]) {
    addBox(bx, 0, 0.6, 36, 0.3, matWoodDark, { y: WALL_H - 0.1, ground: false, shadow: false });
  }

  // --- perimeter walls (the building shell) ---
  hWall(-18, -24, 24);
  hWall(18, -24, 24);
  vWall(-24, -18, 18);
  vWall(24, -18, 18);

  // --- interior walls ---
  hWall(-10, -13, 13, [[-7, -3], [3, 7]]); // reading hall / mid
  vWall(-13, -18, -10, [[-14, -12]]); // reading hall west
  vWall(13, -18, -10, [[-14, -12]]); // reading hall east
  hWall(12, -9, 9, [[-2, 2], [6, 8]]); // lobby / mid
  vWall(-9, 12, 18, [[13, 15]]); // lobby west
  vWall(9, 12, 18, [[13, 15]]); // lobby east
  vWall(-11, -7, 7, [[-2, 2]]); // site A / mid
  vWall(11, -7, 7, [[-2, 2]]); // site B / mid
  vWall(-22, -18, 18, [[-14, -12], [-1, 1], [13, 15]]); // long A corridor east
  vWall(22, -7, 14, [[-1, 1]]); // B tunnel west
  hWall(-7, 22, 24); // B tunnel north end

  // --- windows: warm glowing panes on the north + south walls ---
  for (const wx of [-18, -10, -2, 6, 14]) {
    addPlane(wx, 3.2, -17.7, 3, 2.2, matWindow, 0, 0);
  }
  for (const wx of [-14, -6, 2, 10, 18]) {
    addPlane(wx, 3.2, 17.7, 3, 2.2, matWindow, Math.PI, 0);
  }
  // window frames (thin bars)
  for (const wx of [-18, -10, -2, 6, 14]) {
    addBox(wx, -17.75, 3.2, 0.1, 0.15, matWoodDark, { y: 3.2, ground: false, shadow: false });
  }

  // --- light: warm interior (window light + lanterns) ---
  const sun = new THREE.DirectionalLight(new THREE.Color('#ffd9a0'), 2.2);
  sun.position.set(14, 30, 10);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.camera.far = 100;
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(new THREE.Color('#e8c48f'), new THREE.Color('#6a4a2a'), 0.9);
  scene.add(hemi);
  scene.fog = new THREE.Fog(new THREE.Color('#d9b98a'), 34, 85);
  // hanging lanterns (warm point lights, no shadows)
  function lantern(x, z) {
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), matWoodDark);
    chain.position.set(x, WALL_H - 0.6, z);
    group.add(chain);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.35),
      new THREE.MeshStandardMaterial({ color: new THREE.Color('#3a2a18'), emissive: new THREE.Color('#ffb45e'), emissiveIntensity: 1.8 }));
    lamp.position.set(x, WALL_H - 1.4, z);
    group.add(lamp);
    const light = new THREE.PointLight(new THREE.Color('#ffb45e'), 0.9, 13, 1.6);
    light.position.set(x, WALL_H - 1.4, z);
    group.add(light);
  }
  lantern(0, -14);
  lantern(-16, 0);
  lantern(16, 0);
  lantern(0, 0);
  lantern(0, 15);

  // --- bookshelf: wood frame + book-spine texture front ---
  function bookshelf(x, z, w = 2, ry = 0, h = 2.6) {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), matShelf);
    frame.position.y = h / 2;
    frame.castShadow = true;
    frame.receiveShadow = true;
    g.add(frame);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.2, h - 0.3), matBooks);
    front.position.set(0, h / 2, 0.26);
    g.add(front);
    const back = front.clone();
    back.position.z = -0.26;
    back.rotation.y = Math.PI;
    g.add(back);
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    group.add(g);
    colliders.push(new THREE.Box3(
      new THREE.Vector3(x - w / 2, 0, z - 0.3),
      new THREE.Vector3(x + w / 2, h, z + 0.3),
    ));
    shootables.push(frame);
    minimapBlocks.push([x - w / 2, z - 0.3, x + w / 2, z + 0.3]);
    return g;
  }

  // --- reading table + chairs ---
  function table(x, z, ry = 0) {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.2), matWood);
    top.position.y = 0.78;
    top.castShadow = true;
    top.receiveShadow = true;
    g.add(top);
    for (const [dx, dz] of [[-1.1, -0.5], [1.1, -0.5], [-1.1, 0.5], [1.1, 0.5]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.78, 0.1), matWoodDark);
      leg.position.set(dx, 0.39, dz);
      g.add(leg);
    }
    // books + lamp on the table
    const stack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.35), matBooks);
    stack.position.set(-0.6, 0.93, 0);
    g.add(stack);
    const stack2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.3), matBooks);
    stack2.position.set(0.5, 0.91, 0.1);
    g.add(stack2);
    // chairs (two sides)
    for (const dz of [-0.95, 0.95]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), matWoodDark);
      seat.position.set(0, 0.45, dz);
      g.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.08), matWoodDark);
      back.position.set(0, 0.75, dz + (dz > 0 ? 0.25 : -0.25));
      g.add(back);
    }
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    group.add(g);
    colliders.push(new THREE.Box3(
      new THREE.Vector3(x - 1.2, 0, z - 0.6),
      new THREE.Vector3(x + 1.2, 0.9, z + 0.6),
    ));
    shootables.push(top);
    minimapBlocks.push([x - 1.2, z - 0.6, x + 1.2, z + 0.6]);
  }

  // --- plant in a pot ---
  function plant(x, z) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.5, 10), new THREE.MeshStandardMaterial({ color: new THREE.Color('#a34a3a'), roughness: 0.8 }));
    pot.position.set(x, 0.25, z);
    pot.castShadow = true;
    group.add(pot);
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), matLeaf);
    bush.position.set(x, 0.85, z);
    bush.scale.y = 1.2;
    bush.castShadow = true;
    group.add(bush);
    colliders.push(new THREE.Box3(
      new THREE.Vector3(x - 0.3, 0, z - 0.3),
      new THREE.Vector3(x + 0.3, 0.5, z + 0.3),
    ));
  }

  // --- bench (lobby) ---
  function bench(x, z, ry = 0) {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.55), matWood);
    seat.position.y = 0.45;
    seat.castShadow = true;
    g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.1), matWood);
    back.position.set(0, 0.8, -0.25);
    g.add(back);
    for (const dx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.5), matWoodDark);
      leg.position.set(dx, 0.22, 0);
      g.add(leg);
    }
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    group.add(g);
    colliders.push(new THREE.Box3(
      new THREE.Vector3(x - 1.1, 0, z - 0.3),
      new THREE.Vector3(x + 1.1, 0.8, z + 0.3),
    ));
    minimapBlocks.push([x - 1.1, z - 0.3, x + 1.1, z + 0.3]);
  }

  // --- rug (round, flat) ---
  function rug(x, z, r = 3) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 24), matRug);
    m.position.set(x, 0.02, z);
    m.receiveShadow = true;
    group.add(m);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.6, 0.045, 24), matRugGold);
    inner.position.set(x, 0.02, z);
    inner.receiveShadow = true;
    group.add(inner);
  }

  // ============ MAIN READING HALL (CT spawn, north) ============
  // tall bookshelves along the north wall + reading tables
  bookshelf(-9, -17.2, 3);
  bookshelf(-3, -17.2, 3);
  bookshelf(3, -17.2, 3);
  bookshelf(9, -17.2, 3);
  table(-6, -14);
  table(6, -14);
  table(0, -12, Math.PI / 2);
  plant(-12, -12);
  plant(12, -12);
  rug(0, -14, 2.5);
  addPlane(0, 3.4, -17.7, 6, 1, new THREE.MeshStandardMaterial({ map: makeSign('MAIN READING HALL'), transparent: true }), 0, 0);

  // ============ ENTRANCE LOBBY (T spawn, south) ============
  bench(-6, 16.5);
  bench(6, 16.5);
  plant(-8, 13);
  plant(8, 13);
  plant(-4, 17);
  plant(4, 17);
  bookshelf(-7, 17.3, 2);
  bookshelf(7, 17.3, 2);
  // big double door (the entrance) on the south wall
  addBox(-1.2, 17.7, 1.2, 0.15, 3.4, matWoodDark, { y: 1.7, ground: false, shadow: false });
  addBox(1.2, 17.7, 1.2, 0.15, 3.4, matWoodDark, { y: 1.7, ground: false, shadow: false });
  addPlane(0, 4, 17.7, 6, 1, new THREE.MeshStandardMaterial({ map: makeSign('ENTRANCE LOBBY'), transparent: true }), Math.PI, 0);

  // ============ SITE A — STUDY ROOM (west) ============
  // rows of wooden study tables
  table(-19, -4);
  table(-14, -4);
  table(-19, 0);
  table(-14, 0);
  table(-19, 4);
  table(-14, 4);
  rug(-16.5, 0, 3);
  bookshelf(-21.5, -6, 2, Math.PI / 2);
  bookshelf(-21.5, 6, 2, Math.PI / 2);
  addPlane(-21.7, 3.4, 0, 6, 1, new THREE.MeshStandardMaterial({ map: makeSign('STUDY ROOM — SITE A'), transparent: true }), Math.PI / 2, 0);

  // ============ SITE B — ARCHIVE ROOM (east) ============
  // rows of tall bookshelves (the archive)
  bookshelf(14, -5, 2.5);
  bookshelf(19, -5, 2.5);
  bookshelf(14, -1, 2.5);
  bookshelf(19, -1, 2.5);
  bookshelf(14, 3, 2.5);
  bookshelf(19, 3, 2.5);
  bookshelf(14, 6, 2.5);
  bookshelf(19, 6, 2.5);
  rug(16.5, 0, 3);
  table(16.5, -5.5);
  addPlane(21.7, 3.4, 0, 6, 1, new THREE.MeshStandardMaterial({ map: makeSign('ARCHIVE ROOM — SITE B'), transparent: true }), -Math.PI / 2, 0);

  // ============ MID — fountain courtyard ============
  // fountain: stone basin + water + centre column
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.7, 16), matWallDark);
  basin.position.set(0, 0.35, 0);
  basin.castShadow = true;
  basin.receiveShadow = true;
  group.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.1, 16), matWater);
  water.position.set(0, 0.65, 0);
  group.add(water);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.4, 10), matWallDark);
  column.position.set(0, 1.2, 0);
  column.castShadow = true;
  group.add(column);
  const topBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.4, 0.25, 12), matWallDark);
  topBowl.position.set(0, 1.9, 0);
  group.add(topBowl);
  colliders.push(new THREE.Box3(
    new THREE.Vector3(-1.8, 0, -1.8),
    new THREE.Vector3(1.8, 1.2, 1.8),
  ));
  minimapBlocks.push([-1.8, -1.8, 1.8, 1.8]);
  plant(-4, -5);
  plant(4, -5);
  plant(-4, 5);
  plant(4, 5);
  // tall bookshelf blocks flanking mid (north + south)
  bookshelf(-4, -6.5, 3);
  bookshelf(4, -6.5, 3);
  bookshelf(-4, 6.5, 3);
  bookshelf(4, 6.5, 3);

  // ============ LONG A CORRIDOR (west edge, narrow) ============
  // bookshelves hug the west wall so the walkway stays clear
  bookshelf(-23.7, -8, 2, Math.PI / 2);
  bookshelf(-23.7, 8, 2, Math.PI / 2);
  // B TUNNELS (east edge) — low roof slab makes it feel like a tunnel
  addBox(23, 4, 2, 21, 0.4, matWoodDark, { y: 3.2, ground: false, shadow: false });
  bookshelf(23.7, -5, 2, -Math.PI / 2);
  bookshelf(23.7, 10, 2, -Math.PI / 2);

  // ============ SIGNS ============
  function makeSign(text) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 96;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 512, 96);
    ctx.fillStyle = 'rgba(43, 36, 28, 0.85)';
    ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = '#efe6d0';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 50);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  // (signs above use makeSign — hoisted as a function declaration)

  // ============ WAYPOINTS / ROUTES ============
  const waypoints = {
    atkSpawn: [0, 16],
    atkSouth1: [0, 13],
    atkMidSouth: [0, 8],
    atkMid: [0, -3.5],
    atkMidNorth: [0, -6],
    atkLong1: [-23, 12],
    atkLong2: [-23, 0],
    atkLong3: [-23, -13],
    siteA: [-16, 0],
    atkTun1: [23, 12],
    atkTun2: [23, 0],
    atkTun3: [23, -4],
    siteB: [16, 0],
    atkMidA: [-8, 0],
    atkMidB: [8, 0],
    defA: [-16, -4],
    defA2: [-19, 4],
    defB: [16, -4],
    defB2: [19, 4],
    defMid: [0, -8],
    defHall: [0, -14],
    connW: [-8, -14],
    connE: [8, -14],
    southW: [-6, 14],
    southE: [6, 14],
  };
  const routes = {
    attackA: ['atkSpawn', 'southW', 'atkLong1', 'atkLong2', 'siteA'],
    attackB: ['atkSpawn', 'southE', 'atkTun1', 'atkTun2', 'siteB'],
    attackMidA: ['atkSpawn', 'atkSouth1', 'atkMidSouth', 'atkMid', 'atkMidA', 'siteA'],
    attackMidB: ['atkSpawn', 'atkSouth1', 'atkMidSouth', 'atkMid', 'atkMidB', 'siteB'],
    defendA: ['defHall', 'defMid', 'atkMidA', 'defA'],
    defendB: ['defHall', 'defMid', 'atkMidB', 'defB'],
    defendMid: ['defHall', 'defMid', 'atkMid'],
    rotateAtoB: ['defA', 'atkMidA', 'atkMid', 'atkMidB', 'defB'],
    rotateBtoA: ['defB', 'atkMidB', 'atkMid', 'atkMidA', 'defA'],
    toA: ['atkMid', 'atkMidA', 'siteA'],
    toB: ['atkMid', 'atkMidB', 'siteB'],
  };
  const sites = {
    A: { minX: -22, maxX: -11, minZ: -7, maxZ: 7, x: -16.5, z: 0, name: 'STUDY ROOM' },
    B: { minX: 11, maxX: 22, minZ: -7, maxZ: 7, x: 16.5, z: 0, name: 'ARCHIVE ROOM' },
  };
  const spawns = {
    attack: [[-4, 16], [-2, 17], [0, 16], [2, 17], [4, 16]],
    defend: [[-8, -15], [-4, -16], [0, -15], [4, -16], [8, -15]],
  };

  function areaAt(x, z) {
    if (x >= -22 && x <= -11 && z >= -7 && z <= 7) return 'STUDY ROOM';
    if (x >= 11 && x <= 22 && z >= -7 && z <= 7) return 'ARCHIVE ROOM';
    if (x >= -13 && x <= 13 && z >= -18 && z <= -10) return 'MAIN READING HALL';
    if (x >= -24 && x <= -22) return 'LONG A CORRIDOR';
    if (x >= 22 && x <= 24 && z >= -7 && z <= 14) return 'B TUNNELS';
    if (z >= 12 && z <= 18) return 'ENTRANCE LOBBY';
    if (x >= -6 && x <= 6 && z >= -8 && z <= 8) return 'MID';
    if (z >= -2 && z <= 2 && x >= -11 && x <= 11) return 'CONNECTING HALLWAY';
    return 'LIBRARY';
  }

  const minimap = {
    minX: -25, maxX: 25, minZ: -19, maxZ: 19,
    blocks: minimapBlocks,
    sites,
  };

  return { colliders, shootables, waypoints, routes, sites, spawns, minimap, areas, areaAt, group };
}
