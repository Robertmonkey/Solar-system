// Manages probes launched by the user. This version uses a basic material
// to ensure probes are always visible regardless of scene lighting.

import * as THREE from 'three';

const PROBE_BASE_SPEED = 200;
const COLLISION_RADIUS_FACTOR = 1.1;

export function createProbes() {
  const group = new THREE.Group();
  group.name = 'Probes';
  const list = [];
  return { group, list };
}

export function launchProbe(probes, origin, direction, massValue = 0.5, velocityValue = 0.5) {
  const radius = 0.01 + 0.05 * massValue;
  const geometry = new THREE.SphereGeometry(radius, 8, 8);
  // --- FIX: Use MeshBasicMaterial to make probes glow and always be visible ---
  const material = new THREE.MeshBasicMaterial({ color: 0xffffaa, toneMapped: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(origin);
  probes.group.add(mesh);
  const speed = PROBE_BASE_SPEED * (0.2 + 1.8 * velocityValue);
  const velocity = direction.clone().normalize().multiplyScalar(speed);
  probes.list.push({ mesh, velocity, mass: massValue, age: 0 });
}

export function updateProbes(probes, deltaTime, solarBodies, launcherMesh) {
  const toRemove = [];
  const launcherBox = launcherMesh ? new THREE.Box3().setFromObject(launcherMesh) : null;

  probes.list.forEach((probe, index) => {
    probe.age += deltaTime;
    probe.mesh.position.addScaledVector(probe.velocity, deltaTime);

    if (probe.age > 0.1) {
      if (launcherBox) {
        const probeBox = new THREE.Box3().setFromObject(probe.mesh);
        if (probeBox.intersectsBox(launcherBox)) {
          return;
        }
      }
        
      for (const obj of solarBodies) {
        const bodyWorldPos = obj.group.getWorldPosition(new THREE.Vector3());
        const probeWorldPos = probe.mesh.getWorldPosition(new THREE.Vector3());
        const distance = probeWorldPos.distanceTo(bodyWorldPos);
        
        const threshold = (obj.group.userData.radius || 0) * COLLISION_RADIUS_FACTOR;

        if (distance < threshold) {
          toRemove.push(index);
          break;
        }
      }
    }
  });

  toRemove.reverse().forEach(idx => {
    const probe = probes.list[idx];
    probe.mesh.geometry.dispose(); probe.mesh.material.dispose();
    probes.group.remove(probe.mesh);
    probes.list.splice(idx, 1);
  });
}
