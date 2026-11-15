// Yardline — effects: tracers, sparks, smoke, ejected shells, bullet decals
// and drifting dust. All pooled and reused — nothing allocates in the hot
// loop. Tracers are stretched boxes between two points; smoke is a soft
// sprite that grows and fades; dust is one Points cloud drifting in the sun.
import * as THREE from 'three';
import { radialSprite } from './textures.js';

const MAX_TRACERS = 24;
const MAX_SPARKS = 40;
const MAX_SMOKE = 8;
const MAX_SHELLS = 16;
const MAX_DECALS = 24;
const DUST_COUNT = 350;

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
  const sparkMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb45e'), transparent: true, opacity: 1 });
  const sparkGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
  for (let i = 0; i < MAX_SPARKS; i += 1) {
    const mesh = new THREE.Mesh(sparkGeo, sparkMat);
    mesh.visible = false;
    scene.add(mesh);
    sparks.push({ mesh, vel: new THREE.Vector3(), ttl: 0 });
  }
  let sparkIndex = 0;

  // smoke: soft radial-gradient puffs, not flat discs
  const smokeTex = radialSprite('rgba(220, 214, 200, 0.55)', 'rgba(220, 214, 200, 0.28)');
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

  // ejected brass shells: tiny boxes that pop up-right, fall and settle
  const shells = [];
  const shellGeo = new THREE.BoxGeometry(0.02, 0.02, 0.045);
  const shellMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c9a227'), roughness: 0.35, metalness: 0.9 });
  for (let i = 0; i < MAX_SHELLS; i += 1) {
    const mesh = new THREE.Mesh(shellGeo, shellMat);
    mesh.visible = false;
    scene.add(mesh);
    shells.push({ mesh, vel: new THREE.Vector3(), rot: new THREE.Vector3(), ttl: 0 });
  }
  let shellIndex = 0;

  // bullet decals: dark scorch circles stuck slightly off the surface
  const decals = [];
  const decalTex = radialSprite('rgba(30, 24, 18, 0.85)', 'rgba(30, 24, 18, 0.25)');
  const decalGeo = new THREE.CircleGeometry(0.09, 12);
  for (let i = 0; i < MAX_DECALS; i += 1) {
    const mesh = new THREE.Mesh(decalGeo, new THREE.MeshBasicMaterial({
      map: decalTex, transparent: true, opacity: 0.9, depthWrite: false,
    }));
    mesh.visible = false;
    mesh.renderOrder = 1;
    scene.add(mesh);
    decals.push({ mesh, ttl: 0 });
  }
  let decalIndex = 0;

  // dust: warm motes drifting slowly in the sunlight
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(DUST_COUNT * 3);
  const dustVel = new Float32Array(DUST_COUNT);
  for (let i = 0; i < DUST_COUNT; i += 1) {
    dustPos[i * 3] = (Math.random() - 0.5) * 60;
    dustPos[i * 3 + 1] = Math.random() * 8 + 0.3;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    dustVel[i] = 0.15 + Math.random() * 0.35;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: new THREE.Color('#e8d9b0'), size: 0.05, transparent: true, opacity: 0.55, sizeAttenuation: true,
  }));
  scene.add(dust);

  const _n = new THREE.Vector3();
  const _q = new THREE.Quaternion();

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
    shell(from, right) {
      const s = shells[shellIndex];
      shellIndex = (shellIndex + 1) % MAX_SHELLS;
      s.mesh.position.copy(from);
      s.vel.set(right.x * (1.2 + Math.random()), 1.6 + Math.random() * 0.8, right.z * (1.2 + Math.random()));
      s.vel.x += (Math.random() - 0.5) * 0.6;
      s.vel.z += (Math.random() - 0.5) * 0.6;
      s.rot.set(Math.random() * 12, Math.random() * 12, Math.random() * 12);
      s.mesh.visible = true;
      s.ttl = 1.6;
    },
    decal(point, normal) {
      const d = decals[decalIndex];
      decalIndex = (decalIndex + 1) % MAX_DECALS;
      _n.copy(normal).normalize();
      d.mesh.position.copy(point).addScaledVector(_n, 0.02);
      _q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _n);
      d.mesh.quaternion.copy(_q);
      d.mesh.visible = true;
      d.ttl = 25;
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
      for (const s of shells) {
        if (s.ttl > 0) {
          s.ttl -= dt;
          s.vel.y -= 12 * dt;
          s.mesh.position.addScaledVector(s.vel, dt);
          s.mesh.rotation.x += s.rot.x * dt;
          s.mesh.rotation.y += s.rot.y * dt;
          s.mesh.rotation.z += s.rot.z * dt;
          if (s.mesh.position.y < 0.03) {
            s.mesh.position.y = 0.03;
            s.vel.set(0, 0, 0);
            s.rot.set(0, 0, 0);
            s.mesh.rotation.x = Math.PI / 2;
          }
          if (s.ttl <= 0) s.mesh.visible = false;
        }
      }
      for (const d of decals) {
        if (d.ttl > 0) {
          d.ttl -= dt;
          if (d.ttl <= 0) d.mesh.visible = false;
        }
      }
      // dust drifts slowly with the wind
      const positions = dustGeo.attributes.position.array;
      const cx = camera.position.x;
      const cz = camera.position.z;
      for (let i = 0; i < DUST_COUNT; i += 1) {
        positions[i * 3] += dustVel[i] * dt;
        positions[i * 3 + 1] += Math.sin((positions[i * 3] + i) * 0.4) * 0.02 * dt;
        if (positions[i * 3] > cx + 30) positions[i * 3] -= 60;
        if (positions[i * 3] < cx - 30) positions[i * 3] += 60;
        if (positions[i * 3 + 2] > cz + 30) positions[i * 3 + 2] -= 60;
        if (positions[i * 3 + 2] < cz - 30) positions[i * 3 + 2] += 60;
        if (positions[i * 3 + 1] < 0.2) positions[i * 3 + 1] = 0.2;
        if (positions[i * 3 + 1] > 9) positions[i * 3 + 1] = 9;
      }
      dustGeo.attributes.position.needsUpdate = true;
    },
  };
}
