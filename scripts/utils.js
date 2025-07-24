/*
 * utils.js (Improved Safe Orbital Calculations)
 *
 * This version extends the previous corrections by providing default values
 * for all orbital elements and sanity‑checking the inputs.  In addition to
 * defaulting the angular elements (i, omega, w, M0) to zero when they are
 * undefined, it now also defaults the semi‑major axis `a` and eccentricity
 * `e` to safe values.  Eccentricity is clamped into the range [0, 0.999999]
 * to prevent division by zero or negative discriminants in the orbital
 * equations.  If a or period are missing or non‑positive, the function
 * returns a zero vector so downstream code never encounters NaN values.
 */

import * as THREE from 'three';
import { G, KM_PER_WORLD_UNIT } from './constants.js';
export const KM_TO_WORLD_UNITS = 1 / KM_PER_WORLD_UNIT;

// Internal time multiplier used by update functions. Exposed via getter/setter
// so other modules (e.g. UI sliders) can modify the simulation speed.
let _timeMultiplier = 1;

export function setTimeMultiplier(mult) {
  _timeMultiplier = mult;
}

export function getTimeMultiplier() {
  return _timeMultiplier;
}

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
 * Solve Kepler’s equation for the eccentric anomaly using Newton’s method.
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
 *
 * To avoid NaN propagation that can blank the renderer, this implementation
 * defaults and clamps all orbital elements.  If the semi‑major axis `a` or
 * orbital period is missing or non‑positive the function returns a zero
 * vector.  Eccentricity is clamped into the range [0, 0.999999] and the
 * angular elements default to zero.
 *
 * @param {object} elements orbital elements
 * @param {number} t simulation time in days (or scaled units)
 * @returns {THREE.Vector3} position vector in world units
 */
export function getOrbitalPosition(elements, t) {
  // Destructure with defaults.  Provide safe defaults for all fields to
  // prevent undefined values from propagating into calculations.
  let {
    a = 0,
    e = 0,
    period,
    i = 0,
    omega = 0,
    w = 0,
    M0 = 0
  } = elements || {};

  // If the semi‑major axis or period are invalid, return origin.  This
  // prevents division by zero and undefined operations.
  if (!a || a <= 0 || !period || period === 0) {
    return new THREE.Vector3(0, 0, 0);
  }

  // Clamp eccentricity into the open interval [0, 1).  Values outside
  // this range would represent parabolic or hyperbolic trajectories which
  // are not supported by this simple Kepler solver.
  e = Math.max(0, Math.min(e, 0.999999));

  // Convert angles to radians.
  const inc = degToRad(i);
  const Ω = degToRad(omega);
  const ω = degToRad(w);
  const M0Rad = degToRad(M0);

  // Mean motion n (radians per time unit) and mean anomaly at time t
  const n = (2 * Math.PI) / period;
  const M = M0Rad + n * t;

  // Solve Kepler’s equation for the eccentric anomaly E
  const E = solveKeplerEquation(M, e);

  const cosE = Math.cos(E);
  const sinE = Math.sin(E);

  // True anomaly ν via half‑angle formula
  const tanHalfV = Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2);
  const ν = 2 * Math.atan(tanHalfV);

  // Distance from focus r in kilometres
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(ν));
  const rWorld = (r * 1e6) / KM_PER_WORLD_UNIT;

  // Position in orbital plane
  const xOrb = rWorld * Math.cos(ν);
  const yOrb = rWorld * Math.sin(ν);

  // Precompute cosines and sines of rotation angles for efficiency
  const cosΩ = Math.cos(Ω);
  const sinΩ = Math.sin(Ω);
  const cosInc = Math.cos(inc);
  const sinInc = Math.sin(inc);
  const cosω = Math.cos(ω);
  const sinω = Math.sin(ω);

  // Rotate from orbital plane to 3D ecliptic coordinates
  const X = xOrb * (cosΩ * cosω - sinΩ * sinω * cosInc) - yOrb * (cosΩ * sinω + sinΩ * cosω * cosInc);
  const Y = xOrb * (sinΩ * cosω + cosΩ * sinω * cosInc) - yOrb * (sinΩ * sinω - cosΩ * cosω * cosInc);
  const Z = xOrb * (sinω * sinInc) + yOrb * (cosω * sinInc);

  // Return as a THREE.Vector3 in world units
  return new THREE.Vector3(X, Y, Z);
}

/**
 * Compute gravitational acceleration on a test particle.
 *
 * @param {THREE.Vector3} posWorld position of the test particle in world units
 * @param {Array} bodies array of objects with mass and position
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
