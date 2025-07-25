import * as THREE from 'three';
import { AU_KM, KM_TO_WORLD_UNITS, FONT_FAMILY, COLORS } from './constants.js';

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
  if (!body.orbitalPeriodDays) return new THREE.Vector3();
  const a = body.semiMajorAxisAU * AU_KM;
  const e = body.eccentricity;
  const n = 2 * Math.PI / body.orbitalPeriodDays;
  const M = (body.meanAnomaly0 || 0) + n * elapsedDays;
  const E = solveKepler(M, e);
  const x = a * (Math.cos(E) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  return new THREE.Vector3(x * KM_TO_WORLD_UNITS, 0, y * KM_TO_WORLD_UNITS);
}

// --- FIX: Added the missing createLabel export ---
export function createLabel(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 64;
  ctx.fillStyle = 'rgba(10, 20, 30, 0.8)'; // Background color
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = COLORS.uiHighlight;
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 256, 64);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold 28px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  return new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.1), material);
}
