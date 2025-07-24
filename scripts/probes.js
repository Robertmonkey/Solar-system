// Manages probes launched by the user. Probes fly through the solar system
// and explode when they collide with celestial bodies. This module fixes the
// coordinate mismatch that previously caused probes to explode immediately.

import * as THREE from 'three';

// Active probes in the scene
const probes = [];

// Parameters controlling probe speed and collision radius
const PROBE_SPEED = 0.5; // units per second relative to the solar system scale
const COLLISION_RADIUS_FACTOR = 1.2; // collision occurs at body.radius * factor

/**
 * Launch a new probe.  Accepts an optional settings object with `mass`
 * and `velocity` properties in the range [0,1].  The mass scales the
 * probe’s size and the velocity scales its speed.  Without settings the
 * defaults correspond to a medium sized, moderately fast probe.
 *
 * @param {THREE.Vector3} position Position in solar coordinates.
 * @param {THREE.Vector3} direction Direction to travel.
 * @param {THREE.Scene} scene The scene to which the probe is added.
 * @param {{mass?: number, velocity?: number}} settings Optional probe settings.
 */
export function launchProbe(position, direction, scene, settings = {}) {
  const mass = typeof settings.mass === 'number' ? settings.mass : 0.5;
  const vel = typeof settings.velocity === 'number' ? settings.velocity : 0.5;
  // Scale probe size based on mass.  Small mass yields 0.15 radius, large mass yields 0.4.
  const radius = 0.15 + 0.25 * mass;
  const geometry = new THREE.SphereGeometry(radius, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  scene.add(mesh);
  // Velocity factor: slowest is 20% of PROBE_SPEED, fastest is 200% of PROBE_SPEED.
  const speedFactor = 0.2 + 1.8 * vel;
  const velocityVec = direction.clone().normalize().multiplyScalar(PROBE_SPEED * speedFactor);
  probes.push({ mesh, velocity: velocityVec });
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
      // Convert body position to solar-system-centric coordinates by subtracting the Sun
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
