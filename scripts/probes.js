/*
 * probes.js (Enhanced Robustness)
 *
 * This module manages launched probes and their visual trails.  It is based on
 * the corrected version that ensures CatmullRomCurve3 is initialised with
 * two identical points.  In addition, this variant introduces sanity checks
 * in the physics update loop to ensure probe velocities never become NaN or
 * infinite.  Should numerical instability occur for any reason, the probe
 * is marked dead and removed cleanly instead of propagating NaN values into
 * the scene graph which can cause a black screen.
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
 * @param {THREE.Vector3} position The world position to launch from.
 * @param {THREE.Vector3} direction The world direction vector for launch.
 * @param {number} launchSpeedKmps The initial speed in km/s.
 * @param {number} mass Mass of the probe in kg.
 * @param {THREE.Scene} scene The main scene to add the probe to.
 */
export function launchProbe(position, direction, launchSpeedKmps, mass, scene) {
  if (activeProbes.length >= MAX_PROBES) {
    const oldest = activeProbes.shift();
    if (oldest.mesh.parent) oldest.mesh.parent.remove(oldest.mesh);
    if (oldest.trail.parent) oldest.trail.parent.remove(oldest.trail);
    oldest.mesh.geometry.dispose();
    oldest.mesh.material.dispose();
    oldest.trail.geometry.dispose();
    oldest.trail.material.dispose();
  }

  const speedWorld = launchSpeedKmps / KM_PER_WORLD_UNIT;
  const velocity = direction.clone().multiplyScalar(speedWorld);

  const probeGeom = new THREE.SphereGeometry(0.1, 8, 8);
  const probeMat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
  const mesh = new THREE.Mesh(probeGeom, probeMat);
  mesh.position.copy(position);
  scene.add(mesh);

  // Initialise the trail with two points to avoid NaNs when constructing a
  // CatmullRomCurve3.  Without at least two points the TubeGeometry will
  // produce undefined positions and break rendering.
  const initialTrailPoints = [position.clone(), position.clone()];
  const trailPath = new THREE.CatmullRomCurve3(initialTrailPoints);
  const trailGeom = new THREE.TubeGeometry(trailPath, 2, 0.02, 8, false);
  const trailMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.7 });
  const trail = new THREE.Mesh(trailGeom, trailMat);
  scene.add(trail);

  const probe = {
    mesh,
    velocity,
    mass,
    trail,
    trailPath,
    alive: true,
    scene
  };
  activeProbes.push(probe);
}

/**
 * Update all active probes' physics and check for collisions.
 * Sanity checks are performed on velocities to avoid NaN propagation.  If
 * invalid numbers are detected the probe is removed gracefully.
 *
 * @param {number} dt Delta time in seconds.
 * @param {Array} bodies Array of celestial body objects for gravity and collision.
 * @param {THREE.Vector3} solarSystemOffset The current position of the solar system group.
 */
export function updateProbes(dt, bodies, solarSystemOffset) {
  for (let i = activeProbes.length - 1; i >= 0; i--) {
    const probe = activeProbes[i];
    if (!probe.alive) continue;

    // Compute absolute world position for physics.  The mesh's position is
    // relative to the ship, so offset it by the solar system's translation.
    const probeWorld = new THREE.Vector3().copy(probe.mesh.position).add(solarSystemOffset);
    const acceleration = computeGravity(probeWorld, bodies);
    probe.velocity.addScaledVector(acceleration, dt);
    // Check velocity for finiteness; remove probe if physics has exploded.
    if (!Number.isFinite(probe.velocity.x) || !Number.isFinite(probe.velocity.y) || !Number.isFinite(probe.velocity.z)) {
      probe.alive = false;
      continue;
    }
    probe.mesh.position.addScaledVector(probe.velocity, dt);
    // Update trail
    probe.trailPath.points.push(probe.mesh.position.clone());
    if (probe.trailPath.points.length > 100) probe.trailPath.points.shift();
    if (probe.trailPath.points.length > 1) {
      probe.trail.geometry.dispose();
      probe.trail.geometry = new THREE.TubeGeometry(probe.trailPath, 64, 0.02, 8, false);
    }
    // Collision detection
    for (const body of bodies) {
      const bodyWorldPos = new THREE.Vector3().copy(body.group.position).add(solarSystemOffset);
      const bodyRadius = (body.data.radius / KM_PER_WORLD_UNIT) * SIZE_MULTIPLIER;
      if (probeWorld.distanceTo(bodyWorldPos) < bodyRadius) {
        createExplosion(probe.mesh.position.clone(), probe.scene);
        probe.alive = false;
        break;
      }
    }
    // Remove if it flies too far
    if (probe.mesh.position.length() > 20000) probe.alive = false;
    // Clean up dead probes
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
