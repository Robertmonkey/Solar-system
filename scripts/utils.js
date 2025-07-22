/*
 * Utility functions for the VR solar system simulation.
 *
 * This module groups together a handful of mathematical helpers used
 * throughout the rest of the codebase.  These routines handle simple
 * unit conversions (degrees ↦ radians), numerically solve Kepler’s
 * equation for elliptical orbits and compute positions in three
 * dimensions from the classical orbital elements.  There’s also a
 * function for computing gravitational acceleration on an object
 * within the system, expressed in “world units” used by the scene
 * (see constants.js for definitions of the unit system).
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';
import { G, KM_PER_WORLD_UNIT } from './constants.js';

/**
 * Convert degrees to radians.
 *
 * Many of the orbital elements supplied with the data are in degrees.
 * Three.js, like most math libraries, expects angles in radians, so
 * this helper exists to make the conversions explicit and easy to read.
 *
 * @param {number} deg angle in degrees
 * @returns {number} angle in radians
 */
export function degToRad(deg) {
  return deg * Math.PI / 180;
}

/**
 * Convert radians to degrees.
 *
 * Not used extensively in this project but provided for completeness.
 *
 * @param {number} rad angle in radians
 * @returns {number} angle in degrees
 */
export function radToDeg(rad) {
  return rad * 180 / Math.PI;
}

/**
 * Solve Kepler’s equation for the eccentric anomaly.
 *
 * Kepler’s equation relates mean anomaly M to eccentric anomaly E for
 * elliptic orbits: M = E − e·sin(E).  There’s no closed-form
 * solution for E, so a numerical method must be used.  Here we use a
 * simple Newton–Raphson iteration, which converges rapidly for
 * eccentricities found in the Solar System.  The tolerance value
 * ensures the solution is accurate to within ~1×10⁻⁸ radians.
 *
 * @param {number} M mean anomaly in radians
 * @param {number} e orbit eccentricity (dimensionless, 0 ≤ e < 1)
 * @returns {number} eccentric anomaly E in radians
 */
export function solveKeplerEquation(M, e) {
  // Normalize M to the range [0, 2π) to improve convergence.
  M = M % (2 * Math.PI);
  if (M < 0) M += 2 * Math.PI;
  // Initial guess: for small e, start with M; for high e, pi.
  let E = e < 0.8 ? M : Math.PI;
  let delta;
  do {
    const f = E - e * Math.sin(E) - M;
    const fPrime = 1 - e * Math.cos(E);
    delta = f / fPrime;
    E -= delta;
  } while (Math.abs(delta) > 1e-8);
  return E;
}

/**
 * Compute the Cartesian position of a body in its orbit.
 *
 * Given the standard set of orbital elements (semi-major axis a,
 * eccentricity e, inclination i, longitude of ascending node Ω,
 * argument of periapsis ω and mean anomaly at epoch M₀) along with
 * elapsed time since the epoch and orbital period P, this function
 * returns a Vector3 describing the current position of the object in
 * “world units”.  The orbit is assumed to be Keplerian and not
 * perturbed by other bodies.  Inclination, node and periapsis angles
 * are supplied in degrees and converted internally.
 *
 * @param {Object} elements orbital elements
 * @param {number} elements.a semi‑major axis in millions of kilometres
 * @param {number} elements.e eccentricity
 * @param {number} elements.i inclination in degrees
 * @param {number} elements.omega longitude of ascending node (Ω) in degrees
 * @param {number} elements.w argument of periapsis (ω) in degrees
 * @param {number} elements.M0 mean anomaly at epoch (degrees)
 * @param {number} elements.period orbital period in Earth days
 * @param {number} t current simulation time in Earth days
 * @returns {THREE.Vector3} position vector in world units
 */
export function getOrbitalPosition(elements, t) {
  const { a, e, i, omega, w, M0, period } = elements;
  // Convert angles to radians.
  const inc = degToRad(i);
  const Ω = degToRad(omega);
  const ω = degToRad(w);
  const M0Rad = degToRad(M0);
  // Mean motion n = 2π / P (where P is period in days).  Time t is in days.
  const n = 2 * Math.PI / period;
  const M = M0Rad + n * t;
  // Solve for eccentric anomaly E.
  const E = solveKeplerEquation(M, e);
  // True anomaly ν from eccentric anomaly.
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const sqrtOneMinusE2 = Math.sqrt(1 - e * e);
  const sinν = sqrtOneMinusE2 * sinE / (1 - e * cosE);
  const cosν = (cosE - e) / (1 - e * cosE);
  const ν = Math.atan2(sinν, cosν);
  // Distance from focus (the Sun) at this true anomaly.
  const rAU = (a * 1e6) * (1 - e * e) / (1 + e * cosν); // distance in km
  // Convert to world units.
  const rWorld = rAU / KM_PER_WORLD_UNIT;
  // Position in orbital plane (x = r cosν, y = r sinν).  We'll build
  // the position in the orbital plane then rotate via node and
  // inclination.
  const xOrb = rWorld * Math.cos(ν);
  const yOrb = rWorld * Math.sin(ν);
  // Rotate to 3D space.  We apply rotations in the order: argument of
  // periapsis around z, inclination around x, longitude of ascending
  // node around z.  See “orbital elements to position vector” for the
  // derivation.
  const cosΩ = Math.cos(Ω);
  const sinΩ = Math.sin(Ω);
  const cosInc = Math.cos(inc);
  const sinInc = Math.sin(inc);
  const cosω = Math.cos(ω);
  const sinω = Math.sin(ω);
  // Components after rotation
  const X = (cosΩ * cosω - sinΩ * sinω * cosInc) * xOrb + (-cosΩ * sinω - sinΩ * cosω * cosInc) * yOrb;
  const Y = (sinΩ * cosω + cosΩ * sinω * cosInc) * xOrb + (-sinΩ * sinω + cosΩ * cosω * cosInc) * yOrb;
  const Z = (sinω * sinInc) * xOrb + (cosω * sinInc) * yOrb;
  return new THREE.Vector3(X, Y, Z);
}

/**
 * Compute gravitational acceleration on a test particle due to all
 * bodies in the solar system.
 *
 * The returned vector gives the acceleration in “world units per
 * second squared”.  Distances are measured in world units and masses
 * in SI kilograms.  The gravitational constant G is defined in
 * constants.js.  To convert acceleration from km/s² to world
 * units/s² we divide by KM_PER_WORLD_UNIT.
 *
 * @param {THREE.Vector3} posWorld position of the test particle in world units
 * @param {Array<Object>} bodies array of objects with `mass` (kg) and
 *        `mesh` or `group` property exposing `.position` in world units
 * @returns {THREE.Vector3} acceleration vector in world units/s²
 */
export function computeGravity(posWorld, bodies) {
  const acc = new THREE.Vector3(0, 0, 0);
  for (const body of bodies) {
    // Determine the position of the body.  For planets we attach
    // meshes directly to groups, so the object representing the body
    // should provide a `.getWorldPosition()` method.  To be safe we
    // check for both `.mesh` and `.group`.
    const bodyPos = new THREE.Vector3();
    if (body.mesh && body.mesh.getWorldPosition) {
      body.mesh.getWorldPosition(bodyPos);
    } else if (body.group && body.group.getWorldPosition) {
      body.group.getWorldPosition(bodyPos);
    } else if (body.position) {
      bodyPos.copy(body.position);
    } else {
      continue;
    }
    const rVec = new THREE.Vector3().subVectors(bodyPos, posWorld);
    const distanceWorld = rVec.length();
    // Avoid singularities – skip if extremely close.
    if (distanceWorld < 1e-6) continue;
    const distanceKm = distanceWorld * KM_PER_WORLD_UNIT;
    const accMagKm = G * body.mass / (distanceKm * distanceKm); // km/s²
    const accWorld = accMagKm / KM_PER_WORLD_UNIT; // world units/s²
    rVec.normalize().multiplyScalar(accWorld);
    acc.add(rVec);
  }
  return acc;
}