// scripts/orrery.js

import * as THREE from 'three';
import { bodies } from './data.js';
import { KM_TO_WORLD_UNITS, SIZE_MULTIPLIER, SEC_TO_DAYS, getTimeMultiplier, PALETTE, AU_KM } from './constants.js';
import { getOrbitalPosition, createLabel } from './utils.js';

// MODIFIED: The scaling factors for the orrery must be drastically reduced to handle
// the new 1:1 world scale where positions are in the trillions of meters.
// These new values are calculated to fit Neptune's orbit (~30 AU) within the orrery's base.
const NEPTUNE_ORBIT_METERS = 30 * AU_KM * KM_TO_WORLD_UNITS;
const ORRERY_RADIUS = 0.8; // The visual radius of the orrery display table.
const POSITION_SCALE = ORRERY_RADIUS / NEPTUNE_ORBIT_METERS; // e.g., ~1.7e-13

// MODIFIED: This size scale makes Jupiter appear about 1cm in diameter on the orrery.
const JUPITER_RADIUS_METERS = 69911 * KM_TO_WORLD_UNITS;
const DESIRED_JUPITER_DISPLAY_RADIUS = 0.005; // 0.5cm
const SIZE_SCALE = DESIRED_JUPITER_DISPLAY_RADIUS / JUPITER_RADIUS_METERS; // e.g., ~7e-11


export function createOrrery() {
  const group = new THREE.Group();
  group.name = 'MiniOrrery';

  const baseGeom = new THREE.CylinderGeometry(0.8, 1, 0.1, 32);
  const baseMat = new THREE.MeshStandardMaterial({color: 0x333333, metalness: 0.8, roughness: 0.5});
  const base = new THREE.Mesh(baseGeom, baseMat);
  group.add(base);

  const byName = {};
  const objects = [];

  bodies.forEach(data => {
    const isSun = data.name === 'Sun';
    // MODIFIED: The orrery radius calculation now uses the new SIZE_SCALE.
    // We use the raw planet radius in meters for the calculation.
    const radius = data.radiusKm * KM_TO_WORLD_UNITS * SIZE_MULTIPLIER * (isSun ? SIZE_SCALE * 20 : SIZE_SCALE);
    const geometry = new THREE.SphereGeometry(Math.max(radius, 0.002), 16, 16);
    const color = PALETTE[data.name] || 0xffffff;
    const material = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    if(isSun) mesh.scale.setScalar(2.0);

    const objGroup = new THREE.Group();
    objGroup.name = data.name;
    objGroup.add(mesh);

    if (data.orbitalPeriodDays > 0) {
      const points = [];
      for (let i = 0; i <= 360; i += 5) {
        const pos = getOrbitalPosition({ ...data, meanAnomaly0: (i * Math.PI / 180) }, 0);
        // MODIFIED: The orbit line is scaled using the new POSITION_SCALE.
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
      // MODIFIED: The planet's position is scaled using the new POSITION_SCALE.
      obj.group.position.copy(pos).multiplyScalar(POSITION_SCALE);
    }
  });
}

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

  markerGroup.onBeforeRender = (renderer) => {
    const camera = renderer.xr.getCamera();
    label.quaternion.copy(camera.quaternion);
  };
  
  return markerGroup;
}
