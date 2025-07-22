/*
 * utils.js (Corrected)
 *
 * This version fixes a critical bug in the orbital calculation that caused
 * NaN values when processing moons with incomplete orbital data.
 */

import * as THREE from 'three';
import { G, KM_PER_WORLD_UNIT } from './constants.js';

/**
 * Convert degrees to radians.
 * @param {number} deg angle in degrees
 * @returns {number} angle in radians
 */
export function degToRad(deg) {
  return deg * Math.PI / 180;
}

/**
 * Convert radians to degrees.
 * @param {number} rad angle in radians
 * @returns {number} angle in degrees
 */
export function radToDeg(rad) {
  return rad * 180 / Math.PI;
}

/**
 * Solve Kepler’s equation for the eccentric anomaly.
 * @param {number} M mean anomaly in radians
 * @param {number} e orbit eccentricity (dimensionless, 0 ≤ e < 1)
 * @returns {number} eccentric anomaly E in radians
 */
export function solveKeplerEquation(M, e) {
  M = M % (2 * Math.PI);
  if (M < 0) M += 2 * Math.PI;
  let E = e < 0.8 ? M : Math.PI;
  let delta;
  let counter = 0;
  do {
    const f = E - e * Math.sin(E) - M;
    const fPrime = 1 - e * Math.cos(E);
    if (Math.abs(fPrime) < 1e-12) break; // Avoid division by zero
    delta = f / fPrime;
    E -= delta;
    if (counter++ > 100) break; // Prevent infinite loops
  } while (Math.abs(delta) > 1e-8);
  return E;
}

/**
 * Compute the Cartesian position of a body in its orbit.
 * @param {object} elements - orbital elements
 * @returns {THREE.Vector3} position vector in world units
 */
export function getOrbitalPosition(elements, t) {
  // --- START OF CORRECTION ---
  // Provide default values of 0 for any optional orbital elements that may be
  // missing from the data (especially for smaller moons). This prevents
  // calculations on 'undefined' which would result in NaN.
  const {
    a,
    e,
    period,
    i = 0,
    omega = 0,
    w = 0,
    M0 = 0
  } = elements;
  // --- END OF CORRECTION ---

  // Ensure period is not zero to prevent division by zero
  if (!period) return new THREE.Vector3(0, 0, 0);

  // Convert angles to radians.
  const inc = degToRad(i);
  const Ω = degToRad(omega);
  const ω = degToRad(w);
  const M0Rad = degToRad(M0);

  const n = (2 * Math.PI) / period;
  const M = M0Rad + n * t;

  const E = solveKeplerEquation(M, e);

  const cosE = Math.cos(E);
  const sinE = Math.sin(E);

  // True anomaly ν
  const tanHalfV = Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2);
  const ν = 2 * Math.atan(tanHalfV);

  // Distance from focus r
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(ν));
  const rWorld = (r * 1e6) / KM_PER_WORLD_UNIT;

  // Position in orbital plane
  const xOrb = rWorld * Math.cos(ν);
  const yOrb = rWorld * Math.sin(ν);

  // Rotate to 3D ecliptic coordinates
  const cosΩ = Math.cos(Ω);
  const sinΩ = Math.sin(Ω);
  const cosInc = Math.cos(inc);
  const sinInc = Math.sin(inc);
  const cosω = Math.cos(ω);
  const sinω = Math.sin(ω);

  const X = xOrb * (cosΩ * cosω - sinΩ * sinω * cosInc) - yOrb * (cosΩ * sinω + sinΩ * cosω * cosInc);
  const Y = xOrb * (sinΩ * cosω + cosΩ * sinω * cosInc) - yOrb * (sinΩ * sinω - cosΩ * cosω * cosInc);
  const Z = xOrb * (sinω * sinInc) + yOrb * (cosω * sinInc);

  return new THREE.Vector3(X, Y, Z);
}

/**
 * Compute gravitational acceleration on a test particle.
 * @param {THREE.Vector3} posWorld position of the test particle in world units
 * @param {Array<Object>} bodies array of objects with mass and position
 * @returns {THREE.Vector3} acceleration vector in world units/s²
 */
export function computeGravity(posWorld, bodies) {
  const acc = new THREE.Vector3(0, 0, 0);
  for (const body of bodies) {
    const bodyPos = new THREE.Vector3();
    // Use the body's group, which holds its final calculated position.
    if (body.group) {
        body.group.getWorldPosition(bodyPos);
    } else {
        continue;
    }
    
    const mass = body.data?.mass;
    if (!mass) continue;

    const rVec = new THREE.Vector3().subVectors(bodyPos, posWorld);
    const distanceWorld = rVec.length();

    if (distanceWorld < 1e-6) continue;

    const distanceKm = distanceWorld * KM_PER_WORLD_UNIT;
    const accMagKm = (G * mass) / (distanceKm * distanceKm);
    const accWorld = accMagKm / KM_PER_WORLD_UNIT;
    
    rVec.normalize().multiplyScalar(accWorld);
    acc.add(rVec);
  }
  return acc;
}
