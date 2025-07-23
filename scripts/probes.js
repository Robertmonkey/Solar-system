// Manages probes launched by the user. Probes fly through the solar system
// and explode when they collide with celestial bodies. This module fixes the
// coordinate mismatch that previously caused probes to explode immediately.

import * as THREE from 'three';

// Active probes in the scene
const probes = [];

// Parameters controlling probe speed and collision radius
const PROBE_SPEED = 0.5; // units per second relative to the solar system scale
const COLLISION_RADIUS_FACTOR = 1.2; // collision occurs at body.radius * factor

// Launch a new probe. `position` and `direction` are THREE.Vector3 objects
// expressed in solar-system coordinates (relative to the Sun). The probe is
// created at the given position and travels in the given direction at a
// constant speed.
export function launchProbe(position, direction, scene) {
  const geometry = new THREE.SphereGeometry(0.2, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  scene.add(mesh);
  const velocity = direction.clone().normalize().multiplyScalar(PROBE_SPEED);
  probes.push({ mesh, velocity });
}

// Update all probes. deltaTime is in seconds. `solarGroup` is the root
// group returned from createSolarSystem and `solarBodies` is the array
// returned from createSolarSystem. When a probe collides with a body
// (distance < body.radius * COLLISION_RADIUS_FACTOR) it is removed and
// optionally a visual effect could be triggered.
export function updateProbes(deltaTime, solarGroup, solarBodies, scene) {
  const toRemove = [];
  const origin = solarGroup.getWorldPosition(new THREE.Vector3());
  probes.forEach((probe, index) => {
    // Integrate position in solar coordinates
    probe.mesh.position.addScaledVector(probe.velocity, deltaTime);
    // Check for collisions against every body
    for (const obj of solarBodies) {
      const bodyWorldPos = new THREE.Vector3();
      obj.group.getWorldPosition(bodyWorldPos);
      // Convert body position to solar coordinates relative to Sun
      bodyWorldPos.sub(origin);
      const distance = probe.mesh.position.distanceTo(bodyWorldPos);
      const threshold = obj.data.radius * COLLISION_RADIUS_FACTOR;
      if (distance < threshold) {
        // Collision detected
        toRemove.push(index);
        // TODO: trigger explosion effect here if desired
        break;
      }
    }
  });
  // Remove collided probes from scene and list
  toRemove.reverse().forEach(idx => {
    const probe = probes[idx];
    scene.remove(probe.mesh);
    probes.splice(idx, 1);
  });
}