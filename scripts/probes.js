// scripts/probes.js

import * as THREE from 'three';
import { G, KM_TO_WORLD_UNITS } from './constants.js';

const PROBE_INITIAL_SPEED = 15000; // MODIFIED: Increased initial speed for the new scale
const COLLISION_RADIUS_FACTOR = 1.0; // MODIFIED: More precise collision
const TRAIL_LENGTH = 400;

// MODIFIED: Because our distances are now astronomically large, the 1/r^2 falloff
// of gravity is immense. We need a massive multiplier to make gravitational
// effects visible within the simulation's timeframe. This is purely for
// visual effect, not physical accuracy of the force magnitude.
const GRAVITY_MULTIPLIER = 1e16; 

export function createProbes() {
  const group = new THREE.Group();
  group.name = 'Probes';
  const list = [];
  return { group, list };
}

export function launchProbe(probes, origin, direction, massValue = 0.5, velocityValue = 0.5) {
  // MODIFIED: Probe radius is now in meters.
  const radius = 50 + 200 * massValue; 
  const geometry = new THREE.SphereGeometry(radius, 8, 8);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffaa, toneMapped: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(origin);
  probes.group.add(mesh);

  const speed = PROBE_INITIAL_SPEED * (0.2 + 1.8 * velocityValue);
  const velocity = direction.clone().normalize().multiplyScalar(speed);
  
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

export function updateProbes(probes, deltaTime, solarGroup, solarBodies, launcherMesh) {
  const toRemove = [];
  const launcherBox = launcherMesh ? new THREE.Box3().setFromObject(launcherMesh) : null;

  probes.list.forEach((probe, index) => {
    probe.age += deltaTime;

    const totalForce = new THREE.Vector3();
    const probe_mass_kg = 100 + probe.mass * 10000;
    const probeWorldPos = probe.mesh.getWorldPosition(new THREE.Vector3());

    solarBodies.forEach(body => {
        if (!body.data.massKg) return;
        const bodyWorldPos = body.group.getWorldPosition(new THREE.Vector3());
        const deltaVecWorld = new THREE.Vector3().subVectors(bodyWorldPos, probeWorldPos);
        const distanceWorldSq = deltaVecWorld.lengthSq();

        const singularity_threshold_sq = Math.pow(body.group.userData.radius, 2);
        if (distanceWorldSq < singularity_threshold_sq) return;

        // MODIFIED: Gravity calculation now uses world units (meters) directly.
        // We use the standard G constant and apply our artistic multiplier.
        const forceMagnitude = (G * body.data.massKg * probe_mass_kg) / distanceWorldSq * GRAVITY_MULTIPLIER;
        
        const forceVec = deltaVecWorld.normalize().multiplyScalar(forceMagnitude);
        totalForce.add(forceVec);
    });

    // MODIFIED: This is now acceleration in m/s^2 (world units/s^2)
    const accelerationWorld = totalForce.divideScalar(probe_mass_kg);

    const invProbeParentRotation = probe.mesh.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    const localAcceleration = accelerationWorld.clone().applyQuaternion(invProbeParentRotation);
    probe.velocity.addScaledVector(localAcceleration, deltaTime);
    
    probe.mesh.position.addScaledVector(probe.velocity, deltaTime);

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
        // MODIFIED: Collision threshold uses the body's true radius.
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
    probes.group.remove(probe.trail);
    probe.mesh.geometry.dispose(); 
    probe.mesh.material.dispose();
    probe.trail.geometry.dispose();
    probe.trail.material.dispose();
    probes.list.splice(idx, 1);
  });
}
