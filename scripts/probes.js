/*
 * probes.js (Corrected)
 *
 * This version fixes a critical bug that caused the renderer to fail.
 * - The probe trail's curve (CatmullRomCurve3) is now correctly initialized
 * with two points, preventing the creation of invalid geometry (NaN values)
 * that was causing the black screen and console errors.
 */

import * as THREE from 'three';
import { computeGravity } from './utils.js';
import { KM_PER_WORLD_UNIT, SIZE_MULTIPLIER } from './constants.js';

const activeProbes = [];
const activeExplosions = [];
const MAX_PROBES = 50;

function createExplosion(position, scene) {
  const geom = new THREE.SphereGeometry(0.3, 8, 8);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.copy(position);
  scene.add(mesh);
  activeExplosions.push({ mesh, life: 1, scene });
}

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
    if (oldestProbe.mesh.parent) oldestProbe.mesh.parent.remove(oldestProbe.mesh);
    if (oldestProbe.trail.parent) oldestProbe.trail.parent.remove(oldestProbe.trail);
    oldestProbe.mesh.geometry.dispose();
    oldestProbe.mesh.material.dispose();
    oldestProbe.trail.geometry.dispose();
    oldestProbe.trail.material.dispose();
  }

  const speedWorld = launchSpeedKmps / KM_PER_WORLD_UNIT;
  const velocity = direction.clone().multiplyScalar(speedWorld);

  const probeGeom = new THREE.SphereGeometry(0.1, 8, 8);
  const probeMat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
  const mesh = new THREE.Mesh(probeGeom, probeMat);
  mesh.position.copy(position);
  scene.add(mesh);

  // --- START OF CORRECTION ---
  // A CatmullRomCurve3 needs at least two points to be valid.
  // Initialize the trail with two identical points at the start position.
  const initialTrailPoints = [position.clone(), position.clone()];
  const trailPath = new THREE.CatmullRomCurve3(initialTrailPoints);
  const trailGeom = new THREE.TubeGeometry(trailPath, 2, 0.02, 8, false); // Start with minimal segments
  // --- END OF CORRECTION ---

  const trailMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.7 });
  const trail = new THREE.Mesh(trailGeom, trailMat);
  scene.add(trail);

  const probe = {
    mesh,
    velocity,
    mass,
    trail,
    trailPath, // Use the valid, corrected path
    alive: true,
    scene,
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
    
    // To calculate physics correctly, we need the probe's absolute world position.
    // The mesh's position is relative to the scene origin, but the planets have moved.
    // So, we get the probe's true world position by adding the solar system's offset.
    const probeWorldPos = new THREE.Vector3().copy(probe.mesh.position).add(solarSystemOffset);
    
    // Now calculate gravity based on the true world position.
    const acceleration = computeGravity(probeWorldPos, bodies);

    // Apply physics
    probe.velocity.addScaledVector(acceleration, dt);
    // Update the mesh's position (which is relative to the ship)
    probe.mesh.position.addScaledVector(probe.velocity, dt);
    
    // Update trail
    probe.trailPath.points.push(probe.mesh.position.clone());
    if (probe.trailPath.points.length > 100) {
      probe.trailPath.points.shift();
    }
    // In-place update is more efficient, but recreating is simpler for now.
    if (probe.trailPath.points.length > 1) {
        probe.trail.geometry.dispose();
        probe.trail.geometry = new THREE.TubeGeometry(probe.trailPath, 64, 0.02, 8, false);
    }

    // Collision detection
    for (const body of bodies) {
        // The body's world position is simply its group's position within the solar system,
        // plus the solar system's overall offset.
        const bodyWorldPos = new THREE.Vector3().copy(body.group.position).add(solarSystemOffset);
        const bodyRadius = (body.data.radius / KM_PER_WORLD_UNIT) * SIZE_MULTIPLIER;
        
        if (probeWorldPos.distanceTo(bodyWorldPos) < bodyRadius) {
            createExplosion(probe.mesh.position.clone(), probe.scene);
            probe.alive = false;
            break;
        }
    }
    
    // Remove if it flies too far away
    if (probe.mesh.position.length() > 20000) {
      probe.alive = false;
    }

    if (!probe.alive) {
        if (probe.mesh.parent) probe.mesh.parent.remove(probe.mesh);
        if (probe.trail.parent) probe.trail.parent.remove(probe.trail);
        probe.mesh.geometry.dispose();
        probe.mesh.material.dispose();
        probe.trail.geometry.dispose();
        probe.trail.material.dispose();
        activeProbes.splice(i, 1);
    }
  }

  // Update and fade out explosions
  for (let i = activeExplosions.length - 1; i >= 0; i--) {
    const exp = activeExplosions[i];
    exp.life -= dt;
    exp.mesh.scale.multiplyScalar(1 + dt * 2);
    exp.mesh.material.opacity = Math.max(exp.life, 0);
    if (exp.life <= 0) {
      if (exp.mesh.parent) exp.mesh.parent.remove(exp.mesh);
      exp.mesh.geometry.dispose();
      exp.mesh.material.dispose();
      activeExplosions.splice(i, 1);
    }
  }
}
