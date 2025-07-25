// This version of the orrery has larger, more visible planets and orbits,
// and features a new "YOU ARE HERE" marker.

import * as THREE from 'three';
import { bodies } from './data.js';
import { KM_TO_WORLD_UNITS, SIZE_MULTIPLIER, SEC_TO_DAYS, getTimeMultiplier, PALETTE } from './constants.js';
import { getOrbitalPosition, createLabel } from './utils.js';

// --- FIX: Increased scale to make planets and orbits visible ---
const POSITION_SCALE = 0.1; // Larger orbits
const SIZE_SCALE = 0.005;     // Larger planets

export function createOrrery() {
  const group = new THREE.Group();
  group.name = 'MiniOrrery';

  // Add a base to the orrery model
  const baseGeom = new THREE.CylinderGeometry(0.8, 1, 0.1, 32);
  const baseMat = new THREE.MeshStandardMaterial({color: 0x333333, metalness: 0.8, roughness: 0.5});
  const base = new THREE.Mesh(baseGeom, baseMat);
  group.add(base);

  const byName = {};
  const objects = [];

  bodies.forEach(data => {
    // Sun is a special case, make it larger and emissive
    const isSun = data.name === 'Sun';
    const radius = data.radiusKm * KM_TO_WORLD_UNITS * SIZE_MULTIPLIER * (isSun ? 0.001 : SIZE_SCALE);
    const geometry = new THREE.SphereGeometry(Math.max(radius, 0.005), 16, 16);
    const color = PALETTE[data.name] || 0xffffff;
    const material = new THREE.MeshBasicMaterial({
      color,
      emissive: isSun ? color : 0x000000,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    if(isSun) mesh.scale.setScalar(2.0); // Make sun extra visible

    const objGroup = new THREE.Group();
    objGroup.name = data.name;
    objGroup.add(mesh);

    if (data.orbitalPeriodDays > 0) {
      const points = [];
      for (let i = 0; i <= 360; i += 5) {
        const pos = getOrbitalPosition({ ...data, meanAnomaly0: (i * Math.PI / 180) }, 0);
        points.push(pos.multiplyScalar(POSITION_SCALE));
      }
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color: PALETTE[data.name], transparent: true, opacity: 0.5 });
      const line = new THREE.Line(lineGeom, lineMat);
      objGroup.userData.orbitLine = line;
    }

    byName[data.name] = objGroup;
    objects.push({ data, group: objGroup, elapsedDays: Math.random() * 1000 });
  });

  objects.forEach(obj => {
    const parent = byName[obj.data.parent] || base;
    parent.add(obj.group);
    if (obj.group.userData.orbitLine) {
        parent.add(obj.group.userData.orbitLine);
    }
  });

  return { group, objects };
}

export function updateOrrery(orrery, elapsedSec) {
  const deltaDays = elapsedSec * SEC_TO_DAYS * getTimeMultiplier();
  orrery.objects.forEach(obj => {
    if (obj.data.orbitalPeriodDays > 0) {
      obj.elapsedDays += deltaDays;
      const pos = getOrbitalPosition(obj.data, obj.elapsedDays);
      obj.group.position.copy(pos).multiplyScalar(POSITION_SCALE);
    }
  });
}

// --- FIX: New marker is a labeled red dot ---
export function createPlayerMarker() {
  const markerGroup = new THREE.Group();
  const geometry = new THREE.SphereGeometry(0.02, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000, toneMapped: false });
  const marker = new THREE.Mesh(geometry, material);
  
  const label = createLabel("YOU ARE HERE");
  label.position.y = 0.15;
  label.scale.setScalar(0.5);

  markerGroup.add(marker);
  markerGroup.add(label);

  // Make label always face the camera/player
  markerGroup.onBeforeRender = (renderer) => {
    const camera = renderer.xr.getCamera();
    label.quaternion.copy(camera.quaternion);
  };
  
  return markerGroup;
}
