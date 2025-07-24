// Manages probes launched by the user. Probes fly through the solar system
// and explode when they collide with celestial bodies. This module fixes the
// coordinate mismatch that previously caused probes to explode immediately.

import * as THREE from 'three';
import { KM_TO_WORLD_UNITS, SIZE_MULTIPLIER } from './constants.js';

// Velocity and collision parameters
const PROBE_BASE_SPEED = 200; // units per second
const COLLISION_RADIUS_FACTOR = 1.1; // Intersects when distance < radius * factor

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
 * Launch a new probe.
 * @param {{group: THREE.Group, list: Array}} probes Container returned from createProbes().
 * @param {THREE.Vector3} origin Launch position in solar coordinates.
 * @param {THREE.Vector3} direction Direction to travel.
 * @param {number} massValue Normalised mass in the range [0,1].
 * @param {number} velocityValue Normalised velocity in the range [0,1].
 */
export function launchProbe(probes, origin, direction, massValue = 0.5, velocityValue = 0.5) {
  const radius = 0.01 + 0.05 * massValue;
  const geometry = new THREE.SphereGeometry(radius, 8, 8);
  const material = new THREE.MeshPhongMaterial({ color: 0xffffaa, emissive: 0xffffaa, emissiveIntensity: 2 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(origin);
  probes.group.add(mesh);
  const speed = PROBE_BASE_SPEED * (0.2 + 1.8 * velocityValue);
  const velocity = direction.clone().normalize().multiplyScalar(speed);
  probes.list.push({ mesh, velocity, mass: massValue });
}

// Update all probes. deltaTime is in seconds.
export function updateProbes(probes, deltaTime, solarBodies) {
  const toRemove = [];
  probes.list.forEach((probe, index) => {
    // Integrate position in solar coordinates
    probe.mesh.position.addScaledVector(probe.velocity, deltaTime);

    // Check for collisions against every body
    for (const obj of solarBodies) {
      // Get positions in the same coordinate space (solar system root)
      const bodyPos = obj.group.position;
      const distance = probe.mesh.position.distanceTo(bodyPos);
      
      // Use the scaled radius stored in userData for accurate collision
      const threshold = obj.group.userData.radius * COLLISION_RADIUS_FACTOR;

      if (distance < threshold) {
        toRemove.push(index);
        // TODO: trigger explosion effect here if desired
        break;
      }
    }
  });

  // Remove collided probes from scene and list
  toRemove.reverse().forEach(idx => {
    const probe = probes.list[idx];
    probe.mesh.geometry.dispose();
    probe.mesh.material.dispose();
    probes.group.remove(probe.mesh);
    probes.list.splice(idx, 1);
  });
}
