// Miniature orrery used inside the cockpit.  This module maintains a tiny
// solar system that orbits using the same orbital mechanics as the main one
// but at a drastically reduced scale.

import * as THREE from 'three';
import { bodies } from './data.js';
import { KM_TO_WORLD_UNITS, SIZE_MULTIPLIER, SEC_TO_DAYS, getTimeMultiplier } from './constants.js';
import { getOrbitalPosition } from './utils.js';

const POSITION_SCALE = 0.002;  // Shrink orbital radii
const SIZE_SCALE = 0.0002;     // Shrink body sizes

export function createOrrery() {
  const group = new THREE.Group();
  group.name = 'MiniOrrery';

  const byName = {};
  const objects = [];

  bodies.forEach(data => {
    const radius = Math.max(data.radiusKm * KM_TO_WORLD_UNITS * SIZE_MULTIPLIER * SIZE_SCALE, 0.005);
    const geometry = new THREE.SphereGeometry(radius, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);

    const objGroup = new THREE.Group();
    objGroup.name = data.name;
    objGroup.add(mesh);

    byName[data.name] = objGroup;
    objects.push({ data, group: objGroup, elapsedDays: 0 });
  });

  // Parent the miniature bodies according to their real hierarchy
  objects.forEach(obj => {
    const parentName = obj.data.parent;
    if (parentName && byName[parentName]) {
      byName[parentName].add(obj.group);
    } else {
      group.add(obj.group);
    }
  });

  return { group, objects };
}

export function updateOrrery(orrery, elapsedSec) {
  const deltaDays = elapsedSec * SEC_TO_DAYS * getTimeMultiplier();
  orrery.objects.forEach(obj => {
    const d = obj.data;
    if (d.orbitalPeriodDays > 0 && d.semiMajorAxisAU > 0) {
      obj.elapsedDays += deltaDays;
      const pos = getOrbitalPosition(d, obj.elapsedDays);
      obj.group.position.copy(pos).multiplyScalar(POSITION_SCALE);
    }
  });
}
