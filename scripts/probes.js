// Manages probes launched by the user. This version uses a basic material
// to ensure probes are always visible regardless of scene lighting.

import * as THREE from 'three';
import { G, KM_PER_WORLD_UNIT, KM_TO_WORLD_UNITS } from './constants.js';

// --- FIX: Adjusted probe speed to be more reasonable and visible ---
const PROBE_INITIAL_SPEED = 15; // World units/sec, similar to half-throttle ship speed
const COLLISION_RADIUS_FACTOR = 1.1;
const TRAIL_LENGTH = 200;

export function createProbes() {
  const group = new THREE.Group();
  group.name = 'Probes';
  const list = [];
  // This is no longer needed as probes are now children of the solar system
  // const prevSolarPos = new THREE.Vector3(0, 0, 0);
  return { group, list };
}

export function launchProbe(probes, origin, direction, massValue = 0.5, velocityValue = 0.5) {
  // --- FIX: Increased probe size for better visibility ---
  const radius = 0.05 + 0.1 * massValue;
  const geometry = new THREE.SphereGeometry(radius, 8, 8);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffaa, toneMapped: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(origin);
  probes.group.add(mesh);

  const speed = PROBE_INITIAL_SPEED * (0.2 + 1.8 * velocityValue);
  const velocity = direction.clone().normalize().multiplyScalar(speed);
  
  // --- FIX: Add a trail to each probe ---
  const trail_material = new THREE.LineBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0.6 });
  const trail_geometry = new THREE.BufferGeometry();
  const trail = new THREE.Line(trail_geometry, trail_material);
  probes.group.add(trail);

  probes.list.push({ 
      mesh, 
      velocity, 
      mass: massValue, 
      age: 0, 
      trail, 
      trail_points: []
    });
}

export function updateProbes(probes, deltaTime, solarBodies, launcherMesh) {
  const toRemove = [];
  const launcherBox = launcherMesh ? new THREE.Box3().setFromObject(launcherMesh) : null;

  // --- FIX: Removed redundant position compensation logic. ---
  // Probes are now children of the solarGroup, so their position is
  // automatically handled relative to the solar system.

  probes.list.forEach((probe, index) => {
    probe.age += deltaTime;

    // --- FIX: Apply gravitational forces to the probe's velocity ---
    const totalForce = new THREE.Vector3();
    const probe_mass_kg = 100 + probe.mass * 10000; // Map slider 0-1 to a mass in kg
    const probeWorldPos = probe.mesh.getWorldPosition(new THREE.Vector3());

    solarBodies.forEach(body => {
        if (!body.data.massKg) return;
        const bodyWorldPos = body.group.getWorldPosition(new THREE.Vector3());
        const deltaVecWorld = new THREE.Vector3().subVectors(bodyWorldPos, probeWorldPos);
        const distanceWorldSq = deltaVecWorld.lengthSq();

        // Use the body's scaled radius for the singularity check
        const bodyRadius = body.group.userData.radius || 0.1;
        if (distanceWorldSq < bodyRadius * bodyRadius) return;

        const distanceKm = Math.sqrt(distanceWorldSq) * KM_PER_WORLD_UNIT;
        const forceMagnitude = (G * body.data.massKg * probe_mass_kg) / (distanceKm * distanceKm);
        
        const forceVecKm = deltaVecWorld.normalize().multiplyScalar(forceMagnitude);
        totalForce.add(forceVecKm);
    });

    const accelerationKm = totalForce.divideScalar(probe_mass_kg);
    const accelerationWorld = accelerationKm.multiplyScalar(KM_TO_WORLD_UNITS);
    probe.velocity.addScaledVector(accelerationWorld, deltaTime);
    
    probe.mesh.position.addScaledVector(probe.velocity, deltaTime);

    // --- FIX: Update probe trail ---
    probe.trail_points.push(probe.mesh.position.clone());
    if (probe.trail_points.length > TRAIL_LENGTH) {
        probe.trail_points.shift();
    }
    if (probe.trail_points.length > 1) {
        probe.trail.geometry.setFromPoints(probe.trail_points);
    }

    if (probe.age > 0.2) {
      if (launcherBox && new THREE.Box3().setFromObject(probe.mesh).intersectsBox(launcherBox)) {
          return;
      }
      
      for (const obj of solarBodies) {
        const bodyWorldPos = obj.group.getWorldPosition(new THREE.Vector3());
        const distance = probe.mesh.getWorldPosition(new THREE.Vector3()).distanceTo(bodyWorldPos);
        const threshold = (obj.group.userData.radius || 0) * COLLISION_RADIUS_FACTOR;
        if (distance < threshold) {
          toRemove.push(index);
          break;
        }
      }
    }
  });

  toRemove.reverse().forEach(idx => {
    const probe = probes.list[idx];
    probes.group.remove(probe.mesh);
    probes.group.remove(probe.trail); // Also remove the trail
    probe.mesh.geometry.dispose(); 
    probe.mesh.material.dispose();
    probe.trail.geometry.dispose();
    probe.trail.material.dispose();
    probes.list.splice(idx, 1);
  });
}
