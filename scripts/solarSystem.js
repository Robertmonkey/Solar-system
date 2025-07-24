// Provides functions for constructing and updating a miniature solar system.
// The solar system consists of nested groups for the Sun, planets, moons and probes.

import * as THREE from 'three';
import { bodies as bodyData } from './data.js';

// Global list of body instances. Each entry holds the original data and the
// corresponding THREE.Group used to update its orbit and rotation.
export const solarBodies = [];

// Create the solar system hierarchy. Returns the root group and a flat list
// of bodies that can be used by the UI and other subsystems.
export function createSolarSystem() {
  const solarGroup = new THREE.Group();
  solarGroup.name = 'SolarSystemRoot';
  const loader = new THREE.TextureLoader();

  // First pass: create groups for every body. We defer parenting until after
  // all groups exist so that lookups are simple.
  bodyData.forEach(data => {
    // Create a mesh for the body: simple sphere with a basic material. Use
    // lambert material so the lighting (if any) can shade the sphere.
    const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
    let material;
    if (data.texture) {
      const texture = loader.load(data.texture);
      material = new THREE.MeshLambertMaterial({ map: texture });
    } else {
      // Default colour for probes or placeholder objects
      material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    }
    const mesh = new THREE.Mesh(geometry, material);

    // Place the mesh at the origin of its group; rotations will occur around
    // the centre by default.
    const group = new THREE.Group();
    group.name = data.name;
    group.add(mesh);

    // --- Corrected Tilt Logic ---
    // Apply the axial tilt to the group's rotation once during creation.
    group.rotation.z = THREE.MathUtils.degToRad(data.tilt || 0);

    // Copy useful data onto the group for easy access during update.
    group.userData = {
      orbitRadius: data.orbitRadius,
      orbitPeriod: data.orbitPeriod,
      rotationPeriod: data.rotationPeriod,
      tilt: data.tilt || 0,
      orbitAngle: Math.random() * Math.PI * 2 // randomise starting positions
    };

    solarBodies.push({ data, group });
  });

  // Second pass: parent the groups according to the data.
  solarBodies.forEach(obj => {
    const parentName = obj.data.parent;
    if (!parentName) {
      solarGroup.add(obj.group);
    } else {
      const parent = solarBodies.find(b => b.data.name === parentName);
      if (parent) {
        parent.group.add(obj.group);
      } else {
        solarGroup.add(obj.group);
      }
    }
  });
  return { solarGroup, bodies: solarBodies };
}

// Update orbital positions and rotations based on elapsed time.
export function updateSolarSystem(deltaTime) {
  solarBodies.forEach(obj => {
    const group = obj.group;
    const ud = group.userData;
    // Update orbital angle for objects with non-zero orbit periods.
    if (ud.orbitPeriod > 0 && ud.orbitRadius > 0) {
      const angleIncrement = (deltaTime / ud.orbitPeriod) * Math.PI * 2;
      ud.orbitAngle = (ud.orbitAngle + angleIncrement) % (Math.PI * 2);
      const r = ud.orbitRadius;
      const angle = ud.orbitAngle;
      group.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    }
    // Apply axial rotation if rotationPeriod is non-zero.
    if (ud.rotationPeriod !== 0) {
      const rotSpeed = (deltaTime / Math.abs(ud.rotationPeriod)) * Math.PI * 2;
      // Only update the spin around the Y-axis. The tilt is already set.
      group.rotation.y += rotSpeed * Math.sign(ud.rotationPeriod);
    }
    // The incorrect tilt logic has been removed from the update loop.
  });
}
