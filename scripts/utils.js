import * as THREE from 'three';
import { AU_KM, KM_TO_WORLD_UNITS } from './constants.js';

export function degToRad(deg) {
  return deg * Math.PI / 180;
}

export function solveKepler(M, e) {
  let E = M;
  for (let i = 0; i < 10; i++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    const d = f / fp;
    E -= d;
    if (Math.abs(d) < 1e-6) break;
  }
  return E;
}

export function getOrbitalPosition(body, elapsedDays) {
  if (!body.orbitalPeriodDays || body.orbitalPeriodDays === 0) {
    return new THREE.Vector3();
  }
  const a = body.semiMajorAxisAU * AU_KM;
  const e = body.eccentricity;
  const n = 2 * Math.PI / body.orbitalPeriodDays;
  const M = body.meanAnomaly0 + n * elapsedDays;
  const E = solveKepler(M, e);
  const x = a * (Math.cos(E) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  return new THREE.Vector3(x * KM_TO_WORLD_UNITS, 0, y * KM_TO_WORLD_UNITS);
}
