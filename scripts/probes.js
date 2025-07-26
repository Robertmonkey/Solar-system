// Manages probes launched by the user. This version uses a basic material
// to ensure probes are always visible regardless of scene lighting.

import * as THREE from 'three';

const PROBE_BASE_SPEED = 200;
const COLLISION_RADIUS_FACTOR = 1.1;

export function createProbes() {
  // Create a container for all launched probes.  In addition to the
  // group and list of probe objects, we keep track of the most recent
  // position of the solar system root.  This allows us to compensate
  // for player movement (which is simulated by shifting the entire
  // solar system group) so that probes remain fixed relative to the
  // planets and stars.  Without tracking the solar system position,
  // probes appear to drift away when the user moves through space.
  const group = new THREE.Group();
  group.name = 'Probes';
  const list = [];
  // prevSolarPos records the last known world position of the solar
  // system root.  It will be initialised during the first update.
  const prevSolarPos = new THREE.Vector3(0, 0, 0);
  return { group, list, prevSolarPos };
}

export function launchProbe(probes, origin, direction, massValue = 0.5, velocityValue = 0.5) {
  const radius = 0.01 + 0.05 * massValue;
  const geometry = new THREE.SphereGeometry(radius, 8, 8);
  // --- FIX: Use MeshBasicMaterial to make probes glow and always be visible ---
  const material = new THREE.MeshBasicMaterial({ color: 0xffffaa, toneMapped: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(origin);
  probes.group.add(mesh);
  const speed = PROBE_BASE_SPEED * (0.2 + 1.8 * velocityValue);
  const velocity = direction.clone().normalize().multiplyScalar(speed);
  probes.list.push({ mesh, velocity, mass: massValue, age: 0 });
}

export function updateProbes(probes, deltaTime, solarBodies, launcherMesh) {
  const toRemove = [];
  const launcherBox = launcherMesh ? new THREE.Box3().setFromObject(launcherMesh) : null;

  // --- FIX: Shift probes when the solar system moves ---
  // The solar system (solarGroup) is moved relative to the user to create
  // the sensation of flight.  Because probes are parented directly to
  // the scene rather than the solar system, they would otherwise stay
  // behind when the player flies forward.  To maintain the correct
  // relative position between probes and the solar system, compute the
  // motion of the solar system root since the last frame and subtract
  // that offset from each probe.
  if (solarBodies && solarBodies.length > 0) {
    // Walk up the parent hierarchy from an arbitrary body to find the
    // solar system root.  The root has a 'bodies' array stored in its
    // userData (see solarSystem.js).  If no such parent is found the
    // probe positions will not be adjusted.
    let solarRoot = solarBodies[0].group;
    while (solarRoot && !(solarRoot.userData && solarRoot.userData.bodies)) {
      solarRoot = solarRoot.parent;
    }
    if (solarRoot) {
      const currentSolarPos = new THREE.Vector3();
      solarRoot.getWorldPosition(currentSolarPos);
      // Compute the delta since the last recorded position.
      const offset = new THREE.Vector3().subVectors(currentSolarPos, probes.prevSolarPos);
      // If the solar system moved this frame, subtract that motion from
      // all probes so they stay in step with the planets.
      if (offset.lengthSq() > 1e-12) {
        probes.list.forEach(probe => {
          probe.mesh.position.sub(offset);
        });
        // Update the stored solar position.
        probes.prevSolarPos.copy(currentSolarPos);
      } else if (probes.prevSolarPos.lengthSq() === 0 && currentSolarPos.lengthSq() > 0) {
        // Initialise the stored solar position on the first update.
        probes.prevSolarPos.copy(currentSolarPos);
      }
    }
  }

  probes.list.forEach((probe, index) => {
    probe.age += deltaTime;
    probe.mesh.position.addScaledVector(probe.velocity, deltaTime);

    if (probe.age > 0.1) {
      if (launcherBox) {
        const probeBox = new THREE.Box3().setFromObject(probe.mesh);
        if (probeBox.intersectsBox(launcherBox)) {
          return;
        }
      }
      
      for (const obj of solarBodies) {
        const bodyWorldPos = obj.group.getWorldPosition(new THREE.Vector3());
        const probeWorldPos = probe.mesh.getWorldPosition(new THREE.Vector3());
        const distance = probeWorldPos.distanceTo(bodyWorldPos);
        
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
    probe.mesh.geometry.dispose(); probe.mesh.material.dispose();
    probes.group.remove(probe.mesh);
    probes.list.splice(idx, 1);
  });
}
