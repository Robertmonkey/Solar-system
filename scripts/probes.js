// Manages probes launched by the user. Probes fly through the solar system
// and will now ignore the launcher barrel when checking for collisions.

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
  const material = new THREE.MeshPhongMaterial({ color: 0xffffaa, emissive: 0xffffaa, emissiveIntensity: 2 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(origin);
  probes.group.add(mesh);
  const speed = PROBE_BASE_SPEED * (0.2 + 1.8 * velocityValue);
  const velocity = direction.clone().normalize().multiplyScalar(speed);
  // Add an age to prevent collision with launcher right at the start
  probes.list.push({ mesh, velocity, mass: massValue, age: 0 });
}

// Update all probes. deltaTime is in seconds.
export function updateProbes(probes, deltaTime, solarBodies, launcherMesh) {
  const toRemove = [];
  const launcherBox = new THREE.Box3().setFromObject(launcherMesh);

  probes.list.forEach((probe, index) => {
    probe.age += deltaTime;
    probe.mesh.position.addScaledVector(probe.velocity, deltaTime);

    // After a brief moment, start checking for collisions
    if (probe.age > 0.1) {
       // Skip collision check if probe is still inside the launcher barrel
      const probeBox = new THREE.Box3().setFromObject(probe.mesh);
      if (probeBox.intersectsBox(launcherBox)) {
        return;
      }
        
      for (const obj of solarBodies) {
        const bodyPos = obj.group.getWorldPosition(new THREE.Vector3());
        const probePos = probe.mesh.getWorldPosition(new THREE.Vector3());
        const distance = probePos.distanceTo(bodyPos);
        const threshold = obj.group.userData.radius * COLLISION_RADIUS_FACTOR;

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
