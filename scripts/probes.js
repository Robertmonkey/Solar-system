/*
 * probes.js (Refactored)
 *
 * Handles the creation and physics of probes. Key changes:
 * - Probes are launched from a specific position and direction (the cannon).
 * - `launchProbe` now accepts initial velocity and mass from the UI.
 * - `updateProbes` now accounts for the movement of the solar system itself,
 * keeping the probe's trajectory correct relative to the moving bodies.
 * - Probes now collide with celestial bodies.
 */

import * as THREE from 'three';
import { computeGravity } from './utils.js';
import { KM_PER_WORLD_UNIT, SIZE_MULTIPLIER } from './constants.js';

const activeProbes = [];
const MAX_PROBES = 50;

/**
 * Launch a new probe from the cannon.
 * @param {THREE.Vector3} position - The world position to launch from.
 * @param {THREE.Vector3} direction - The world direction vector for launch.
 * @param {number} launchSpeedKmps - The initial speed in km/s.
 * @param {number} mass - Mass of the probe in kg.
 * @param {THREE.Scene} scene - The main scene to add the probe to.
 */
export function launchProbe(position, direction, launchSpeedKmps, mass, scene) {
  if (activeProbes.length >= MAX_PROBES) {
    const oldestProbe = activeProbes.shift();
    scene.remove(oldestProbe.mesh);
    scene.remove(oldestProbe.trail);
  }

  const speedWorld = launchSpeedKmps / KM_PER_WORLD_UNIT;
  const velocity = direction.clone().multiplyScalar(speedWorld);

  const probeGeom = new THREE.SphereGeometry(0.1, 8, 8);
  const probeMat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
  const mesh = new THREE.Mesh(probeGeom, probeMat);
  mesh.position.copy(position);
  scene.add(mesh);

  const trailGeom = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([mesh.position]), 64, 0.02, 8, false);
  const trailMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.7 });
  const trail = new THREE.Mesh(trailGeom, trailMat);
  scene.add(trail);

  const probe = {
    mesh,
    velocity,
    mass,
    trail,
    trailPath: new THREE.CatmullRomCurve3([mesh.position.clone(), mesh.position.clone()]),
    alive: true,
  };
  activeProbes.push(probe);
}

/**
 * Update all active probes' physics and check for collisions.
 * @param {number} dt - Delta time in seconds.
 * @param {Array<object>} bodies - Array of celestial body objects for gravity and collision.
 * @param {THREE.Vector3} solarSystemOffset - The current position of the solar system group.
 */
export function updateProbes(dt, bodies, solarSystemOffset) {
  for (let i = activeProbes.length - 1; i >= 0; i--) {
    const probe = activeProbes[i];
    if (!probe.alive) continue;
    
    // Account for the ship's movement by adjusting the probe's position
    probe.mesh.position.add(solarSystemOffset);
    
    const probeWorldPos = probe.mesh.position.clone();
    const acceleration = computeGravity(probeWorldPos, bodies);

    probe.velocity.addScaledVector(acceleration, dt);
    probe.mesh.position.addScaledVector(probe.velocity, dt);
    
    // Subtract the ship's movement to keep the probe in the correct relative position
    probe.mesh.position.sub(solarSystemOffset);
    
    // Update trail
    probe.trailPath.points.push(probe.mesh.position.clone());
    if (probe.trailPath.points.length > 100) {
      probe.trailPath.points.shift();
    }
    probe.trail.geometry.dispose();
    probe.trail.geometry = new THREE.TubeGeometry(probe.trailPath, 64, 0.02, 8, false);

    // Collision detection
    for (const body of bodies) {
        const bodyWorldPos = new THREE.Vector3();
        body.group.getWorldPosition(bodyWorldPos);
        const bodyRadius = (body.data.radius / KM_PER_WORLD_UNIT) * SIZE_MULTIPLIER;
        
        if (probe.mesh.position.distanceTo(bodyWorldPos) < bodyRadius) {
            probe.alive = false;
            probe.mesh.visible = false;
            probe.trail.visible = false;
            // TODO: Add an explosion effect here.
            break;
        }
    }
    
    // Remove if it flies too far away
    if (probe.mesh.position.length() > 10000) {
      probe.alive = false;
    }

    if (!probe.alive) {
        probe.mesh.geometry.dispose();
        probe.mesh.material.dispose();
        probe.trail.geometry.dispose();
        probe.trail.material.dispose();
        probe.mesh.parent.remove(probe.mesh);
        probe.trail.parent.remove(probe.trail);
        activeProbes.splice(i, 1);
    }
  }
}
