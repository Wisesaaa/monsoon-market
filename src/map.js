// Monsoon Market — the map. A rain-slicked night market, 46 x 38 m, three lanes:
// A-long down the west stalls to Spice Row (site A), B-long down the east stalls
// to Lantern Court (site B), and Fish Lane through the neon gate at mid.
// Every solid box is a collider for players and bots and a surface bullets stop on.
// Signs are drawn on canvas at runtime — no external assets.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const WALL_H = 5;

function signTexture(text, fg, bg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = fg;
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createMap(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const colliders = [];
  const shootables = [];
  const lights = [];

  const mat = {};
  for (const name of Object.keys(PALETTE)) {
    mat[name] = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE[name]),
      roughness: name === 'ground' ? 0.32 : 0.9,
      metalness: name === 'ground' ? 0.25 : 0.02,
    });
  }
  const neonPink = new THREE.MeshStandardMaterial({ color: 0x1a0512, emissive: new THREE.Color(PALETTE.neonPink), emissiveIntensity: 2.2 });
  const neonCyan = new THREE.MeshStandardMaterial({ color: 0x04141a, emissive: new THREE.Color(PALETTE.neonCyan), emissiveIntensity: 2.0 });
  const neonAmber = new THREE.MeshStandardMaterial({ color: 0x1a1002, emissive: new THREE.Color(PALETTE.neonAmber), emissiveIntensity: 1.8 });
  const lanternMat = new THREE.MeshStandardMaterial({ color: 0x1a0d02, emissive: new THREE.Color(PALETTE.lantern), emissiveIntensity: 2.4 });

  function box(w, h, d, x, y, z, material, collide = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (collide) {
      colliders.push(new THREE.Box3().setFromObject(mesh));
      shootables.push(mesh);
    }
    return mesh;
  }

  function cylinder(rTop, rBottom, h, x, y, z, material, collide = true) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 12), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (collide) {
      const half = Math.max(rTop, rBottom);
      colliders.push(new THREE.Box3(new THREE.Vector3(x - half, y - h / 2, z - half), new THREE.Vector3(x + half, y + h / 2, z + half)));
      shootables.push(mesh);
    }
    return mesh;
  }

  function sign(text, w, h, x, y, z, rotY, fg, bg) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: signTexture(text, fg, bg) }),
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    group.add(mesh);
    return mesh;
  }

  function lantern(x, z, withLight) {
    const pole = cylinder(0.06, 0.08, 3.4, x, 1.7, z, mat.woodDark, false);
    pole.castShadow = false;
    const lamp = box(0.42, 0.55, 0.42, x, 3.5, z, lanternMat, false);
    lamp.castShadow = false;
    if (withLight) {
      const light = new THREE.PointLight(new THREE.Color(PALETTE.lantern), 10, 12, 1.8);
      light.position.set(x, 3.3, z);
      scene.add(light);
      lights.push(light);
    }
  }

  function stall(x, z, rotY, awning) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    group.add(g);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.05, 1.3), mat.wood);
    counter.position.y = 0.52;
    counter.castShadow = true;
    counter.receiveShadow = true;
    g.add(counter);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.09, 1.7), awning === 'red' ? mat.awningRed : mat.awningTeal);
    top.position.y = 2.45;
    top.castShadow = true;
    g.add(top);
    for (const px of [-1.3, 1.3]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.45, 0.09), mat.woodDark);
      post.position.set(px, 1.22, 0.7);
      g.add(post);
    }
    const goods = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.9), awning === 'red' ? neonAmber : neonCyan);
    goods.position.y = 1.2;
    g.add(goods);
    // one collider for the whole stall, in world space
    const c = new THREE.Box3().setFromObject(counter);
    colliders.push(c);
    shootables.push(counter);
  }

  // --- ground, wet and reflective ---
  box(46.4, 0.4, 38.4, 0, -0.2, 0, mat.ground);
  // puddles: glossy dark planes catching the neon
  const puddleMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#0a0e22'), roughness: 0.06, metalness: 0.7 });
  for (const [x, z, w, d] of [[-6, 4, 5, 3], [7, -2, 4, 2.6], [0, 10, 6, 3], [-15, -4, 4, 3], [14, 8, 5, 2.6]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), puddleMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.012, z);
    p.receiveShadow = true;
    group.add(p);
  }

  // --- perimeter walls ---
  box(46.4, WALL_H, 0.5, 0, WALL_H / 2, -19.2, mat.wall);
  box(46.4, WALL_H, 0.5, 0, WALL_H / 2, 19.2, mat.wall);
  box(0.5, WALL_H, 38.4, -23.2, WALL_H / 2, 0, mat.wall);
  box(0.5, WALL_H, 38.4, 23.2, WALL_H / 2, 0, mat.wall);
  // plaster band on the north wall, behind the sites
  box(46.4, 1.2, 0.2, 0, 4.2, -18.9, mat.plaster, false);

  // --- the neon gate at mid ---
  box(0.7, 4.6, 0.7, -3.4, 2.3, 2, mat.woodDark);
  box(0.7, 4.6, 0.7, 3.4, 2.3, 2, mat.woodDark);
  box(7.5, 0.9, 0.9, 0, 4.6, 2, mat.woodDark);
  const gateSign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 0.7), new THREE.MeshBasicMaterial({ map: signTexture('MONSOON MARKET', '#ffffff', '#12040c') }));
  gateSign.position.set(0, 4.6, 1.52);
  group.add(gateSign);
  const gateGlow = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 0.16), neonPink);
  gateGlow.position.set(0, 4.15, 1.53);
  group.add(gateGlow);
  const gateLight = new THREE.PointLight(new THREE.Color(PALETTE.neonPink), 20, 16, 1.8);
  gateLight.position.set(0, 4.2, 3.4);
  scene.add(gateLight);
  lights.push(gateLight);

  // --- stalls: A-long (west), B-long (east), mid rows ---
  stall(-20, 8, Math.PI / 2, 'red');
  stall(-20, 0, Math.PI / 2, 'teal');
  stall(-20, -6, Math.PI / 2, 'red');
  stall(20, 8, -Math.PI / 2, 'teal');
  stall(20, 0, -Math.PI / 2, 'red');
  stall(20, -6, -Math.PI / 2, 'teal');
  stall(-8, 12, 0, 'red');
  stall(8, 12, 0, 'teal');
  stall(-9, -12, 0, 'teal');
  stall(9, -12, 0, 'red');
  stall(-4, -15, 0, 'red');
  stall(4, -15, 0, 'teal');

  // --- crates and barrels for cover ---
  for (const [x, z, s] of [[-12, 6, 1.2], [-11, 6, 0.8], [-12.8, 12, 1.2], [12, 6, 1.2], [12.9, 6, 0.8], [12, -6, 1.2], [-6, -4, 1.2], [6, -4, 1.2], [-4, 7, 1.2], [5, 7, 0.8], [0, -10, 1.2]]) {
    box(s, s, s, x, s / 2, z, mat.wood);
  }
  for (const [x, z] of [[-17, 2], [-16, 3], [17, 2], [16, 3], [-8, 2], [8, 2], [-13, -9], [13, -9]]) {
    cylinder(0.45, 0.45, 1.1, x, 0.55, z, mat.woodDark);
  }

  // --- site A: Spice Row (west) ---
  sign('SPICE ROW', 5, 1.1, -22.9, 3.6, -8, Math.PI / 2, '#ffd9a0', '#2a1503');
  sign('SITE A', 2.6, 0.9, -17, 3.2, -11.2, 0, '#1a0d02', '#ffb020');
  for (const [x, z] of [[-18, -9], [-16.5, -9.5], [-19, -7], [-15.5, -7.5]]) {
    box(1.1, 0.7, 0.8, x, 0.35, z, neonAmber);
  }
  // --- site B: Lantern Court (east) ---
  sign('LANTERN COURT', 5.5, 1.1, 22.9, 3.6, -8, -Math.PI / 2, '#bdf3ff', '#04121a');
  sign('SITE B', 2.6, 0.9, 17, 3.2, -11.2, 0, '#04121a', '#22d3ee');
  for (const [x, z, c] of [[18, -9, '#ff2e88'], [16, -9.5, '#22d3ee'], [19, -7, '#ffb020'], [15.5, -7.5, '#ff2e88']]) {
    const vase = cylinder(0.32, 0.42, 0.95, x, 0.48, z, new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.35, metalness: 0.1 }));
    vase.castShadow = true;
  }
  box(3.4, 0.25, 2.2, 17.5, 0.12, -8.5, mat.woodDark);

  // --- lanterns and string lights ---
  lantern(-10, 6, true);
  lantern(10, 6, true);
  lantern(-10, -6, false);
  lantern(10, -6, false);
  lantern(-17, -4, true);
  lantern(17, -4, true);
  lantern(0, -12, true);
  // string lights across Lantern Court
  const bulbGeo = new THREE.SphereGeometry(0.09, 6, 6);
  for (let i = 0; i <= 10; i += 1) {
    const t = i / 10;
    const x = 13 + t * 8;
    const z = -6 - Math.sin(t * Math.PI) * 1.2;
    const bulb = new THREE.Mesh(bulbGeo, lanternMat);
    bulb.position.set(x, 3.6 - Math.sin(t * Math.PI) * 0.7, z);
    group.add(bulb);
  }

  // --- lights: moon + sky ---
  const sky = new THREE.HemisphereLight(new THREE.Color('#3a4a7a'), new THREE.Color('#141828'), 1.5);
  scene.add(sky);
  const ambient = new THREE.AmbientLight(new THREE.Color('#2a3050'), 0.5);
  scene.add(ambient);
  const moon = new THREE.DirectionalLight(new THREE.Color('#8fa8ff'), 2.2);
  moon.position.set(-14, 22, -8);
  moon.target.position.set(0, 0, 0);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.left = -26;
  moon.shadow.camera.right = 26;
  moon.shadow.camera.top = 26;
  moon.shadow.camera.bottom = -26;
  moon.shadow.camera.far = 60;
  moon.shadow.bias = -0.0006;
  scene.add(moon, moon.target);
  const warm = new THREE.DirectionalLight(new THREE.Color('#ffb27a'), 0.85);
  warm.position.set(10, 12, 14);
  scene.add(warm);

  scene.fog = new THREE.Fog(new THREE.Color(PALETTE.sky), 26, 70);

  // --- nav: named waypoints bots follow ---
  const waypoints = {
    atkSpawn: [0, 16], atkA1: [-14, 14], atkA2: [-19, 6], atkA3: [-18, -3], siteA: [-17, -8],
    atkB1: [14, 14], atkB2: [19, 6], atkB3: [18, -3], siteB: [17, -8],
    atkMid1: [0, 12], atkMid2: [0, 5], gate: [0, 2], midTop: [0, -6], midA: [-9, -8], midB: [9, -8],
    defA: [-14, -13], defA2: [-19, -11], defB: [14, -13], defB2: [19, -11], defMid: [0, -13],
    atkAAlt: [-8, 10], atkBAlt: [8, 10],
  };
  const routes = {
    attackA: ['atkSpawn', 'atkA1', 'atkA2', 'atkA3', 'siteA'],
    attackB: ['atkSpawn', 'atkB1', 'atkB2', 'atkB3', 'siteB'],
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
    A: { x: -17, z: -8, name: 'Spice Row', minX: -20.5, maxX: -13.5, minZ: -11.5, maxZ: -4.5 },
    B: { x: 17, z: -8, name: 'Lantern Court', minX: 13.5, maxX: 20.5, minZ: -11.5, maxZ: -4.5 },
  };
  const spawns = {
    attack: [[-4, 16], [-2, 17], [0, 16], [2, 17], [4, 16]],
    defend: [[-14, -15], [-7, -16], [0, -15], [7, -16], [14, -15]],
  };

  // minimap rectangles: perimeter + the big cover blocks
  const minimap = {
    minX: -23, maxX: 23, minZ: -19, maxZ: 19,
    blocks: [
      [-21.5, 6.5, -18.5, 9.5], [-18.5, -1.5, 21.5, -4.5], [18.5, 6.5, 21.5, 9.5],
      [-9.5, 10.5, -6.5, 13.5], [6.5, 10.5, 9.5, 13.5], [-10.5, -13.5, -7.5, -10.5],
      [7.5, -13.5, 10.5, -10.5], [-5.5, -16.5, -2.5, -13.5], [2.5, -16.5, 5.5, -13.5],
    ],
    sites,
  };

  return { colliders, shootables, waypoints, routes, sites, spawns, minimap, group };
}
