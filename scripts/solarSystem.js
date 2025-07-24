// Provides functions for constructing and updating a miniature solar system.
// The solar system consists of nested groups for the Sun, planets, moons and probes.

import * as THREE from 'three';
import { bodies } from './data.js';
import { KM_TO_WORLD_UNITS, SEC_TO_DAYS, getTimeMultiplier } from './constants.js';
import { degToRad, getOrbitalPosition } from './utils.js';

// Global list of body instances. Each entry holds the original data and the
// corresponding THREE.Group used to update its orbit and rotation.
export const solarBodies = [];

// Create the solar system hierarchy. Returns the root group and a flat list
// of bodies that can be used by the UI and other subsystems.
export function createSolarSystem() {
  const solarGroup = new THREE.Group();
  solarGroup.name = 'SolarSystemRoot';
  const loader = new THREE.TextureLoader();
  const materialCache = {};
  const byName = {};

  bodies.forEach(data => {
    const radius = Math.max(data.radiusKm * KM_TO_WORLD_UNITS, 0.1);
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    let material;
    const key = data.texture || 'default';
    if (materialCache[key]) {
      material = materialCache[key];
    } else {
      if (data.texture) {
        material = new THREE.MeshLambertMaterial({ map: loader.load(data.texture) });
      } else {
        material = new THREE.MeshLambertMaterial({ color: 0xffffff });
      }
      materialCache[key] = material;
    }
    const mesh = new THREE.Mesh(geometry, material);

    const group = new THREE.Group();
    group.name = data.name;
    group.add(mesh);

    // --- Corrected Tilt Logic ---
    // Apply the axial tilt to the group's rotation once during creation.
    group.rotation.z = degToRad(data.axialTiltDeg || 0);

    // Copy useful data onto the group for easy access during update.
    group.userData = {
      name: data.name,
      parent: data.parent,
      massKg: data.massKg,
      semiMajorAxisAU: data.semiMajorAxisAU,
      eccentricity: data.eccentricity,
      orbitalPeriodDays: data.orbitalPeriodDays,
      rotationPeriodHours: data.rotationPeriodHours,
      axialTiltDeg: data.axialTiltDeg || 0,
      meanAnomaly0: Math.random() * Math.PI * 2,
      elapsedDays: 0
    };

    byName[data.name] = group;
    solarBodies.push({ data, group });
  });

  // Second pass: parent the groups according to the data.
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
      const rotSpeed = (deltaDays * 24 / Math.abs(ud.rotationPeriodHours)) * Math.PI * 2;
      group.rotation.y += rotSpeed * Math.sign(ud.rotationPeriodHours);
    }
  });
}
