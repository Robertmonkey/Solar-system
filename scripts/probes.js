// Manages probes launched by the user. Probes fly through the solar system
// and explode when they collide with celestial bodies. This module fixes the
// coordinate mismatch that previously caused probes to explode immediately.

import * as THREE from 'three';

// Velocity and collision parameters
const PROBE_SPEED = 0.5; // units per second relative to the solar system scale
const COLLISION_RADIUS_FACTOR = 1.0; // intersects when distance < radius * factor

/**
 * Create the probe container.  Returned object manages an array of active
 * probes and a group that can be attached to the scene.
 */
export function createProbes() {
  const group = new THREE.Group();
  group.name = 'Probes';
  const list = [];
  return { group, list };
}

/**
 * Launch a new probe.  Accepts an optional settings object with `mass`
 * and `velocity` properties in the range [0,1].  The mass scales the
 * probe’s size and the velocity scales its speed.  Without settings the
 * defaults correspond to a medium sized, moderately fast probe.
 *
 * @param {{group: THREE.Group, list: Array}} probes Container returned from
 *     createProbes().
 * @param {THREE.Vector3} origin Launch position in solar coordinates.
 * @param {THREE.Vector3} direction Direction to travel.
 * @param {number} massValue Normalised mass in the range [0,1].
 * @param {number} velocityValue Normalised velocity in the range [0,1].
 */
export function launchProbe(probes, origin, direction, massValue = 0.5, velocityValue = 0.5) {
  const radius = 0.05 + 0.1 * massValue;
  const geometry = new THREE.SphereGeometry(radius, 8, 8);
  const material = new THREE.MeshPhongMaterial({ color: 0xffffaa, emissive: 0xffffaa });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(origin);
  probes.group.add(mesh);
  const speed = PROBE_SPEED * (0.2 + 1.8 * velocityValue);
  const velocity = direction.clone().normalize().multiplyScalar(speed);
  probes.list.push({ mesh, velocity, mass: massValue });
}

// Update all probes. deltaTime is in seconds. `solarGroup` is the root
// group returned from createSolarSystem and `solarBodies` is the array
// returned from createSolarSystem. When a probe collides with a body
// (distance < body.radius * COLLISION_RADIUS_FACTOR) it is removed and
// optionally a visual effect could be triggered.
export function updateProbes(probes, deltaTime, solarGroup, solarBodies) {
  const toRemove = [];
  const origin = solarGroup.getWorldPosition(new THREE.Vector3());
  probes.list.forEach((probe, index) => {
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
    const probe = probes.list[idx];
    probes.group.remove(probe.mesh);
    probes.list.splice(idx, 1);
  });
}
