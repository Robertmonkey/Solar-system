// This version restores planet labels and orbit lines, and fixes the
// initial state of the simulation to ensure planets are always in motion.

import * as THREE from 'three';
import { bodies } from './data.js';
import { KM_TO_WORLD_UNITS, SIZE_MULTIPLIER, SEC_TO_DAYS, getTimeMultiplier } from './constants.js';
import { degToRad, getOrbitalPosition, createLabel } from './utils.js';

const atmosphereVertexShader = `...`; // Unchanged
const atmosphereFragmentShader = `...`; // Unchanged

export function createSolarSystem(textures) {
  const solarGroup = new THREE.Group();
  solarGroup.name = 'SolarSystemRoot';
  const byName = {};
  const solarBodies = [];
  const textureMap = { /* ... */ };

  bodies.forEach(data => {
    const isSun = data.name === 'Sun';
    const radius = data.radiusKm * KM_TO_WORLD_UNITS * (isSun ? 1 : SIZE_MULTIPLIER);
    const group = new THREE.Group();
    group.name = data.name;
    
    const mesh = new THREE.Mesh(/* ... */);
    group.add(mesh);

    // --- FIX: Add planet labels ---
    const label = createLabel(data.name);
    label.position.y = radius * 1.5 + 0.1;
    label.scale.setScalar(5);
    group.add(label);
    group.userData.label = label;

    // --- FIX: Add orbit lines ---
    if (data.orbitalPeriodDays > 0) {
      const points = [];
      for (let i = 0; i <= 360; i += 2) {
        const pos = getOrbitalPosition({ ...data, meanAnomaly0: (i * Math.PI / 180) }, 0);
        points.push(pos);
      }
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x666666 });
      const line = new THREE.Line(lineGeom, lineMat);
      solarGroup.add(line); // Add orbits to the main group
    }
    
    // ... special enhancements for Sun, Earth, Saturn ...
    
    group.userData = { ...data, radius, meanAnomaly0: Math.random() * 360, elapsedDays: 0 };
    byName[data.name] = group;
    solarBodies.push({ data, group });
  });

  solarBodies.forEach(obj => {
    const parent = byName[obj.data.parent];
    if (parent) parent.add(obj.group);
    else solarGroup.add(obj.group);
  });
  
  // --- FIX: Calculate initial positions so planets are not in a line ---
  updateSolarSystem(solarGroup, 0);

  solarGroup.userData.bodies = solarBodies;
  return { solarGroup, bodies: solarBodies };
}

export function updateSolarSystem(solarGroup, elapsedSec, camera) {
  const bodies = solarGroup.userData.bodies || [];
  const timeMult = getTimeMultiplier();
  const deltaDays = elapsedSec * SEC_TO_DAYS * timeMult;

  if (isNaN(deltaDays)) return;

  bodies.forEach(obj => {
    const group = obj.group;
    const ud = group.userData;
    
    if (ud.orbitalPeriodDays > 0) {
      ud.elapsedDays += deltaDays;
      const pos = getOrbitalPosition(ud, ud.elapsedDays);
      group.position.copy(pos);
    }
    if (ud.rotationPeriodHours) {
      // ... axial rotation logic ...
    }
    // Make labels always face the camera
    if (ud.label && camera) {
      ud.label.quaternion.copy(camera.quaternion);
    }
  });
}
