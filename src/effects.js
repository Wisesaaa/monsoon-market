// Effects: tracers, smoke, hit sparks and rain. All pooled and reused —
// nothing allocates in the hot loop. Tracers are stretched boxes between
// two points; smoke is a soft sprite that grows and fades; rain is one
// Points cloud recycled around the camera.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const MAX_TRACERS = 24;
const MAX_SPARKS = 40;
const MAX_SMOKE = 8;
const RAIN_COUNT = 700;

export function createEffects(scene, camera) {
  const tracers = [];
  const tracerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe9a8'), transparent: true, opacity: 0.9, depthWrite: false });
  const tracerGeo = new THREE.BoxGeometry(0.02, 0.02, 1);
  for (let i = 0; i < MAX_TRACERS; i += 1) {
    const mesh = new THREE.Mesh(tracerGeo, tracerMat);
    mesh.visible = false;
    scene.add(mesh);
    tracers.push({ mesh, ttl: 0 });
  }
  let tracerIndex = 0;
  const up = new THREE.Vector3(0, 0, 1);
  const dir = new THREE.Vector3();
  const mid = new THREE.Vector3();

  const sparks = [];
  const sparkMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.neonAmber), transparent: true, opacity: 1 });
  const sparkGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
  for (let i = 0; i < MAX_SPARKS; i += 1) {
    const mesh = new THREE.Mesh(sparkGeo, sparkMat);
    mesh.visible = false;
    scene.add(mesh);
    sparks.push({ mesh, vel: new THREE.Vector3(), ttl: 0 });
  }
  let sparkIndex = 0;

  // smoke: soft radial-gradient puffs, not flat discs
  const smokeCanvas = document.createElement('canvas');
  smokeCanvas.width = 128;
  smokeCanvas.height = 128;
  const sctx = smokeCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(200, 204, 216, 0.55)');
  grad.addColorStop(0.6, 'rgba(200, 204, 216, 0.28)');
  grad.addColorStop(1, 'rgba(200, 204, 216, 0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const smokeTex = new THREE.CanvasTexture(smokeCanvas);
  const smokeMat = new THREE.MeshBasicMaterial({ map: smokeTex, transparent: true, opacity: 0.5, depthWrite: false });
  const smokes = [];
  const smokeGeo = new THREE.SphereGeometry(1, 10, 8);
  for (let i = 0; i < MAX_SMOKE; i += 1) {
    const mesh = new THREE.Mesh(smokeGeo, smokeMat.clone());
    mesh.visible = false;
    scene.add(mesh);
    smokes.push({ mesh, ttl: 0, max: 1 });
  }
  let smokeIndex = 0;

  // rain: one Points cloud, drops fall and wrap around the camera
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(RAIN_COUNT * 3);
  const rainVel = new Float32Array(RAIN_COUNT);
  for (let i = 0; i < RAIN_COUNT; i += 1) {
    rainPos[i * 3] = (Math.random() - 0.5) * 50;
    rainPos[i * 3 + 1] = Math.random() * 18;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    rainVel[i] = 14 + Math.random() * 8;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({
    color: new THREE.Color('#8fa8ff'), size: 0.06, transparent: true, opacity: 0.5, sizeAttenuation: true,
  }));
  scene.add(rain);

  return {
    tracer(from, to) {
      const t = tracers[tracerIndex];
      tracerIndex = (tracerIndex + 1) % MAX_TRACERS;
      dir.subVectors(to, from);
      const len = dir.length();
      if (len < 0.1) return;
      mid.addVectors(from, to).multiplyScalar(0.5);
      t.mesh.position.copy(mid);
      t.mesh.lookAt(to);
      t.mesh.scale.set(1, 1, len);
      t.mesh.visible = true;
      t.mesh.material.opacity = 0.9;
      t.ttl = 0.07;
    },
    spark(point, count = 6) {
      for (let n = 0; n < count; n += 1) {
        const s = sparks[sparkIndex];
        sparkIndex = (sparkIndex + 1) % MAX_SPARKS;
        s.mesh.position.copy(point);
        s.vel.set((Math.random() - 0.5) * 4, Math.random() * 3 + 1, (Math.random() - 0.5) * 4);
        s.mesh.visible = true;
        s.ttl = 0.25 + Math.random() * 0.15;
      }
    },
    smoke(point) {
      const s = smokes[smokeIndex];
      smokeIndex = (smokeIndex + 1) % MAX_SMOKE;
      s.mesh.position.set(point.x, 1.2, point.z);
      s.mesh.scale.set(0.6, 0.6, 0.6);
      s.mesh.visible = true;
      s.mesh.material.opacity = 0.35;
      s.ttl = 12;
      s.max = 12;
    },
    step(dt) {
      for (const t of tracers) {
        if (t.ttl > 0) {
          t.ttl -= dt;
          t.mesh.material.opacity = Math.max(0, t.ttl / 0.07) * 0.9;
          if (t.ttl <= 0) t.mesh.visible = false;
        }
      }
      for (const s of sparks) {
        if (s.ttl > 0) {
          s.ttl -= dt;
          s.mesh.position.addScaledVector(s.vel, dt);
          s.vel.y -= 9 * dt;
          if (s.ttl <= 0) s.mesh.visible = false;
        }
      }
      for (const s of smokes) {
        if (s.ttl > 0) {
          s.ttl -= dt;
          const age = 1 - s.ttl / s.max;
          const scale = 0.6 + age * 3.2;
          s.mesh.scale.set(scale, scale * 0.7, scale);
          s.mesh.material.opacity = 0.35 * (1 - age * 0.7);
          if (s.ttl <= 0) s.mesh.visible = false;
        }
      }
      // rain falls around the camera
      const positions = rainGeo.attributes.position.array;
      const cx = camera.position.x;
      const cz = camera.position.z;
      for (let i = 0; i < RAIN_COUNT; i += 1) {
        positions[i * 3 + 1] -= rainVel[i] * dt;
        positions[i * 3] -= 2 * dt;
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 14 + Math.random() * 4;
          positions[i * 3] = cx + (Math.random() - 0.5) * 50;
          positions[i * 3 + 2] = cz + (Math.random() - 0.5) * 50;
        }
        // wrap horizontally around the camera
        if (positions[i * 3] < cx - 25) positions[i * 3] += 50;
        if (positions[i * 3] > cx + 25) positions[i * 3] -= 50;
        if (positions[i * 3 + 2] < cz - 25) positions[i * 3 + 2] += 50;
        if (positions[i * 3 + 2] > cz + 25) positions[i * 3 + 2] -= 50;
      }
      rainGeo.attributes.position.needsUpdate = true;
    },
  };
}
