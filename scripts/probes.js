// Manages probes launched by the user. This version uses a basic material
// to ensure probes are always visible regardless of scene lighting.

import * as THREE from 'three';
import { G, KM_PER_WORLD_UNIT, KM_TO_WORLD_UNITS } from './constants.js';

const PROBE_INITIAL_SPEED = 15;
const COLLISION_RADIUS_FACTOR = 1.1;
const TRAIL_LENGTH = 200;
// --- FIX: Add a multiplier to make gravity effects visible and dramatic ---
const GRAVITY_MULTIPLIER = 1e8;

export function createProbes() {
  const group = new THREE.Group();
  group.name = 'Probes';
  const list = [];
  // --- FIX: Restore prevSolarPos to keep probes synced with ship movement ---
  const prevSolarPos = new THREE.Vector3(0, 0, 0);
  return { group, list, prevSolarPos };
}

export function launchProbe(probes, origin, direction, massValue = 0.5, velocityValue = 0.5) {
  const radius = 0.05 + 0.1 * massValue;
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

  // --- FIX: Restore logic to keep probes in sync with solar system movement ---
  if (solarGroup) {
      const currentSolarPos = new THREE.Vector3();
      solarGroup.getWorldPosition(currentSolarPos);
      const offset = new THREE.Vector3().subVectors(currentSolarPos, probes.prevSolarPos);
      if (offset.lengthSq() > 1e-12) {
        probes.list.forEach(probe => {
          probe.mesh.position.sub(offset);
          probe.trail_points.forEach(p => p.sub(offset));
        });
        probes.prevSolarPos.copy(currentSolarPos);
      } else if (probes.prevSolarPos.lengthSq() === 0 && currentSolarPos.lengthSq() > 0) {
        probes.prevSolarPos.copy(currentSolarPos);
      }
  }


  probes.list.forEach((probe, index) => {
    probe.age += deltaTime;

    const totalForce = new THREE.Vector3();
    const probe_mass_kg = 100 + probe.mass * 10000;
    
    // Position needs to be calculated in the solar system's frame of reference
    const solarOrigin = solarGroup.getWorldPosition(new THREE.Vector3());
    const probeWorldPos = probe.mesh.position.clone().add(solarOrigin);

    solarBodies.forEach(body => {
        if (!body.data.massKg) return;
        const bodyWorldPos = body.group.getWorldPosition(new THREE.Vector3());
        const deltaVecWorld = new THREE.Vector3().subVectors(bodyWorldPos, probeWorldPos);
        const distanceWorldSq = deltaVecWorld.lengthSq();

        const singularity_threshold_sq = 0.01;
        if (distanceWorldSq < singularity_threshold_sq) return;

        const distanceKm = Math.sqrt(distanceWorldSq) * KM_PER_WORLD_UNIT;
        const forceMagnitude = (G * body.data.massKg * probe_mass_kg) / (distanceKm * distanceKm) * GRAVITY_MULTIPLIER;
        
        const forceVecKm = deltaVecWorld.normalize().multiplyScalar(forceMagnitude);
        totalForce.add(forceVecKm);
    });

    const accelerationKm = totalForce.divideScalar(probe_mass_kg);
    const accelerationWorld = accelerationKm.multiplyScalar(KM_TO_WORLD_UNITS);
    probe.velocity.addScaledVector(accelerationWorld, deltaTime);
    
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
        const distance = probe.mesh.position.clone().add(solarOrigin).distanceTo(bodyWorldPos);
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
