// Provides functions for constructing and updating a scaled solar system.
// Includes special visual enhancements for Earth and Saturn.

import * as THREE from 'three';
import { bodies } from './data.js';
import { KM_TO_WORLD_UNITS, SIZE_MULTIPLIER, SEC_TO_DAYS, getTimeMultiplier } from './constants.js';
import { degToRad, getOrbitalPosition } from './utils.js';

// Atmospheric Glow Shader for Earth
const atmosphereVertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const atmosphereFragmentShader = `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
  }
`;

export async function createSolarSystem() {
  const solarGroup = new THREE.Group();
  solarGroup.name = 'SolarSystemRoot';
  const loader = new THREE.TextureLoader();
  const byName = {};
  const solarBodies = [];

  // Create all body objects first
  for (const data of bodies) {
    const isSun = data.name === 'Sun';
    const radius = data.radiusKm * KM_TO_WORLD_UNITS * (isSun ? 1 : SIZE_MULTIPLIER);
    const geometry = new THREE.SphereGeometry(Math.max(radius, 0.01), 64, 64);

    let material;
    if (data.texture) {
      const texture = await loader.loadAsync(data.texture);
      if (isSun) {
        material = new THREE.MeshBasicMaterial({ map: texture });
      } else {
        material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
      }
    } else {
      material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8 });
    }

    const mesh = new THREE.Mesh(geometry, material);
    const group = new THREE.Group();
    group.name = data.name;
    group.add(mesh);

    // Special Enhancements
    if (isSun) {
      const sunLight = new THREE.PointLight(0xffffff, 2.5, 0, 1.5);
      group.add(sunLight);
    } else if (data.name === 'Earth') {
      const atmosphereMat = new THREE.ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
      });
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.05, 64, 64),
        atmosphereMat
      );
      group.add(atmosphere);
    } else if (data.name === 'Saturn') {
      const ringTexture = await loader.loadAsync('textures/saturn_ring_alpha.png');
      const ringGeom = new THREE.RingGeometry(radius * 1.5, radius * 2.5, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        map: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      // Orient the ring correctly on the XY plane before tilting
      ringMesh.rotation.x = Math.PI / 2;
      group.add(ringMesh);
    }

    group.rotation.z = degToRad(data.axialTiltDeg || 0);

    group.userData = { ...data, radius, meanAnomaly0: Math.random() * Math.PI * 2, elapsedDays: 0 };
    byName[data.name] = group;
    solarBodies.push({ data, group });
  }

  // Second pass: parent the groups. This is more robust than sorting.
  solarBodies.forEach(obj => {
    const parent = byName[obj.data.parent];
    if (parent) {
      parent.add(obj.group);
    } else {
      solarGroup.add(obj.group);
    }
  });

  solarGroup.userData.bodies = solarBodies;
  return { solarGroup, bodies: solarBodies };
}

// Update orbital positions and rotations based on elapsed time.
export function updateSolarSystem(solarGroup, elapsedSec) {
  const bodies = solarGroup.userData.bodies || [];
  // Ensure we get a valid time multiplier
  const timeMult = getTimeMultiplier() || 0;
  const deltaDays = elapsedSec * SEC_TO_DAYS * timeMult;

  if (deltaDays === 0) return; // Don't do calculations if time is paused

  bodies.forEach(obj => {
    const group = obj.group;
    const ud = group.userData;
    
    // --- FIX: Restored and simplified orbital motion logic ---
    if (ud.orbitalPeriodDays > 0 && ud.semiMajorAxisAU > 0) {
      ud.elapsedDays = (ud.elapsedDays || 0) + deltaDays;
      const pos = getOrbitalPosition(ud, ud.elapsedDays);
      group.position.copy(pos);
    }

    // Update axial rotation
    if (ud.rotationPeriodHours) {
      const rotationAmount = (2 * Math.PI / ud.rotationPeriodHours) * (deltaDays * 24);
      // Rotate the planet mesh itself, which is the first child.
      if(group.children[0]) {
        group.children[0].rotation.y += rotationAmount;
      }
    }
  });
}
