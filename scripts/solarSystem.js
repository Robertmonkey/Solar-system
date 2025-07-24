// Provides functions for constructing and updating a scaled solar system.
// Celestial bodies are enlarged for visibility in VR.

import * as THREE from 'three';
import { bodies } from './data.js';
import { KM_TO_WORLD_UNITS, SIZE_MULTIPLIER, SEC_TO_DAYS, getTimeMultiplier } from './constants.js';
import { degToRad, getOrbitalPosition } from './utils.js';

// Create the solar system hierarchy. Returns the root group and a flat list
// of bodies that can be used by the UI and other subsystems.
export async function createSolarSystem() {
  const solarGroup = new THREE.Group();
  solarGroup.name = 'SolarSystemRoot';
  const loader = new THREE.TextureLoader();
  const byName = {};
  const solarBodies = [];

  const promises = bodies.map(data => {
    return new Promise(async (resolve) => {
      // Use SIZE_MULTIPLIER to make planets visible and not just specks.
      const radius = data.radiusKm * KM_TO_WORLD_UNITS * (data.name === 'Sun' ? 1 : SIZE_MULTIPLIER);
      const geometry = new THREE.SphereGeometry(Math.max(radius, 0.01), 64, 64);

      let material;
      if (data.texture) {
        const texture = await loader.loadAsync(data.texture);
        if (data.name === 'Sun') {
          // The sun should glow and not be affected by other lights.
          material = new THREE.MeshBasicMaterial({ map: texture, color: 0xffffff });
        } else {
          material = new THREE.MeshStandardMaterial({ map: texture });
        }
      } else {
        material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
      }

      const mesh = new THREE.Mesh(geometry, material);
      const group = new THREE.Group();
      group.name = data.name;
      group.add(mesh);

      // Add a point light to the sun so it illuminates other planets
      if (data.name === 'Sun') {
        const sunLight = new THREE.PointLight(0xffffff, 350000, 0, 1);
        group.add(sunLight);
      }

      group.rotation.z = degToRad(data.axialTiltDeg || 0);

      // Copy useful data onto the group for easy access.
      group.userData = {
        ...data,
        radius, // Store the final scaled radius
        meanAnomaly0: Math.random() * Math.PI * 2,
        elapsedDays: 0
      };

      byName[data.name] = group;
      solarBodies.push({ data, group });
      resolve();
    });
  });

  await Promise.all(promises);

  // Second pass: parent the groups according to the data.
  solarBodies.sort((a,b) => (a.data.parent === b.data.name) ? -1 : (b.data.parent === a.data.name) ? 1 : 0);
  solarBodies.forEach(obj => {
    const parentName = obj.data.parent;
    if (!parentName) {
      solarGroup.add(obj.group);
    } else {
      const parent = byName[parentName];
      if (parent) {
        parent.add(obj.group);
      } else {
        solarGroup.add(obj.group);
      }
    }
  });
  solarGroup.userData.bodies = solarBodies;
  return { solarGroup, bodies: solarBodies };
}

// Update orbital positions and rotations based on elapsed time.
export function updateSolarSystem(solarGroup, elapsedSec) {
  const bodies = solarGroup.userData.bodies || [];
  const deltaDays = elapsedSec * SEC_TO_DAYS * getTimeMultiplier();
  bodies.forEach(obj => {
    const group = obj.group;
    const ud = group.userData;
    if (ud.orbitalPeriodDays > 0 && ud.semiMajorAxisAU > 0) {
      ud.elapsedDays += deltaDays;
      const pos = getOrbitalPosition({
        semiMajorAxisAU: ud.semiMajorAxisAU,
        eccentricity: ud.eccentricity,
        orbitalPeriodDays: ud.orbitalPeriodDays,
        meanAnomaly0: ud.meanAnomaly0
      }, ud.elapsedDays);
      group.position.copy(pos);
    }
    if (ud.rotationPeriodHours) {
      const rotSpeed = (2 * Math.PI) / (ud.rotationPeriodHours * 3600); // rad/sec
      group.children[0].rotation.y += rotSpeed * elapsedSec * getTimeMultiplier() * 24 * 3600 / 86400;
    }
  });
}
