// Miniature orrery used inside the cockpit.  This module maintains a tiny
// solar system that orbits using the same orbital mechanics as the main one
// but at a drastically reduced scale, with orbit lines and a player marker.

import * as THREE from 'three';
import { bodies } from './data.js';
import { KM_TO_WORLD_UNITS, SIZE_MULTIPLIER, SEC_TO_DAYS, getTimeMultiplier, PALETTE, AU_KM } from './constants.js';
import { getOrbitalPosition } from './utils.js';

const POSITION_SCALE = 0.001;  // Shrink orbital radii
const SIZE_SCALE = 0.0005;     // Shrink body sizes

export function createOrrery() {
  const group = new THREE.Group();
  group.name = 'MiniOrrery';

  const byName = {};
  const objects = [];

  bodies.forEach(data => {
    const radius = Math.max(data.radiusKm * KM_TO_WORLD_UNITS * SIZE_MULTIPLIER * SIZE_SCALE, 0.002);
    const geometry = new THREE.SphereGeometry(radius, 8, 8);
    const color = PALETTE[data.name] || 0xffffff;
    const material = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);

    const objGroup = new THREE.Group();
    objGroup.name = data.name;
    objGroup.add(mesh);

    // Add orbit line
    if (data.orbitalPeriodDays > 0) {
      const points = [];
      for (let i = 0; i <= 360; i++) {
        const angle = (i / 360) * Math.PI * 2;
        const M = angle;
        const pos = getOrbitalPosition({ ...data, meanAnomaly0: M }, 0);
        points.push(pos.multiplyScalar(POSITION_SCALE));
      }
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x444444 });
      const line = new THREE.Line(lineGeom, lineMat);
      objGroup.userData.orbitLine = line; // Will be parented later
    }


    byName[data.name] = objGroup;
    objects.push({ data, group: objGroup, elapsedDays: 0 });
  });

  // Parent the miniature bodies and their orbits
  objects.forEach(obj => {
    const parentName = obj.data.parent;
    const parentObj = parentName ? byName[parentName] : group;
    parentObj.add(obj.group);
    if (obj.group.userData.orbitLine) {
        parentObj.add(obj.group.userData.orbitLine);
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

export function createPlayerMarker() {
    const geometry = new THREE.ConeGeometry(0.005, 0.015, 4);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, toneMapped: false });
    const marker = new THREE.Mesh(geometry, material);
    marker.rotation.x = Math.PI / 2; // Point forward
    return marker;
}
