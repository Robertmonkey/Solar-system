/*
 * probes.js
 *
 * Handles the creation and physics of probes launched from the cockpit.
 * Each probe is subject to the gravitational pull of every body in
 * the solar system.  They are visualised as small coloured spheres
 * leaving streaks behind to hint at their trajectory.  The physics
 * uses a basic Euler integrator: for modest frame rates and short
 * durations this is sufficient, though a more sophisticated integrator
 * could be implemented for greater accuracy.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';
import { computeGravity } from './utils.js';

// Array of active probes in the scene
const probes = [];

/**
 * Launch a new probe.  The probe originates at the cockpit’s nose
 * position and heads out along the -Z axis of the cockpit.  Its
 * initial speed is determined by the supplied speed fraction and the
 * maximum speed of light.  A simple trail is implemented via a
 * Line geometry storing recent positions.
 *
 * @param {THREE.Object3D} cockpitGroup the cockpit group whose local
 *        transform defines the launch direction
 * @param {number} speedFraction between 0 and 1; 1 corresponds to c
 * @param {number} mass mass of the probe in kilograms (affects gravitational acceleration)
 * @param {THREE.Scene} scene the scene to which the probe’s mesh and trail are added
 */
export function launchProbe(cockpitGroup, speedFraction, mass, scene) {
  // Determine initial position: a point slightly in front of the cockpit origin
  const origin = new THREE.Vector3();
  cockpitGroup.getWorldPosition(origin);
  // Direction: negative Z in cockpit local space transformed to world
  const dir = new THREE.Vector3(0, 0, -1);
  dir.applyQuaternion(cockpitGroup.getWorldQuaternion(new THREE.Quaternion()));
  // Initial velocity magnitude: map speed fraction exponentially between
  // 0.001c and 0.1c.  You can tune these values to taste.
  const minC = 0.001;
  const maxC = 0.1;
  const c = minC * Math.pow(maxC / minC, speedFraction);
  const speedKmps = c * 299792.458;
  // Convert to world units per second
  const speedWorld = speedKmps / 1e6; // because KM_PER_WORLD_UNIT = 1e6
  const velocity = dir.clone().multiplyScalar(speedWorld);
  // Create visual representation
  const geometry = new THREE.SphereGeometry(0.005, 8, 8);
  const material = new THREE.MeshBasicMaterial({ color: 0xff5555 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(origin);
  scene.add(mesh);
  // Trail – store a buffer of positions and update each frame
  const trailLength = 100;
  const trailPositions = new Float32Array(trailLength * 3);
  const trailGeom = new THREE.BufferGeometry();
  trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  const trailMat = new THREE.LineBasicMaterial({ color: 0xff8888, linewidth: 1, transparent: true, opacity: 0.6 });
  const trail = new THREE.Line(trailGeom, trailMat);
  scene.add(trail);
  const probe = { mesh, trail, trailPositions, trailIndex: 0, velocity, mass, alive: true };
  probes.push(probe);
}

/**
 * Update all active probes.  Should be called every frame.  The
 * gravitational acceleration from all solar bodies is computed via
 * computeGravity() defined in utils.js.  A simple Euler step is
 * performed: v += a*dt, p += v*dt.  Trail positions are shifted and
 * updated to leave a streak behind each probe.
 *
 * @param {number} dt time step in seconds
 * @param {Array} bodies array of solar system bodies (top-level) to compute gravity from
 */
export function updateProbes(dt, bodies) {
  const removeIndices = [];
  for (let i = 0; i < probes.length; i++) {
    const probe = probes[i];
    if (!probe.alive) continue;
    // Compute gravity acceleration in world units/s²
    const pos = probe.mesh.position;
    const acc = computeGravity(pos, bodies);
    // Update velocity and position (Euler integration)
    probe.velocity.addScaledVector(acc, dt);
    probe.mesh.position.addScaledVector(probe.velocity, dt);
    // Update trail: shift existing positions back and insert current
    // position at the end
    for (let j = 0; j < probe.trailPositions.length - 3; j += 3) {
      probe.trailPositions[j] = probe.trailPositions[j + 3];
      probe.trailPositions[j + 1] = probe.trailPositions[j + 4];
      probe.trailPositions[j + 2] = probe.trailPositions[j + 5];
    }
    const len = probe.trailPositions.length;
    probe.trailPositions[len - 3] = probe.mesh.position.x;
    probe.trailPositions[len - 2] = probe.mesh.position.y;
    probe.trailPositions[len - 1] = probe.mesh.position.z;
    probe.trail.geometry.attributes.position.needsUpdate = true;
    // Remove probes that travel very far from the origin to avoid
    // unnecessary updates.  If they exceed 1000 world units (~1e9 km) we
    // consider them gone.
    if (probe.mesh.position.length() > 1e3) {
      probe.alive = false;
      probe.mesh.visible = false;
      probe.trail.visible = false;
      removeIndices.push(i);
    }
  }
  // Clean up dead probes
  if (removeIndices.length > 0) {
    for (let i = removeIndices.length - 1; i >= 0; i--) {
      probes.splice(removeIndices[i], 1);
    }
  }
}