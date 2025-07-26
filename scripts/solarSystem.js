// This version restores planet labels and orbit lines, and fixes the
// initial state of the simulation to ensure planets are always in motion.

import * as THREE from 'three';
import { bodies } from './data.js';
import { KM_TO_WORLD_UNITS, SIZE_MULTIPLIER, SEC_TO_DAYS, getTimeMultiplier } from './constants.js';
import { degToRad, getOrbitalPosition, createLabel } from './utils.js';

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

export function createSolarSystem(textures) {
  const solarGroup = new THREE.Group();
  solarGroup.name = 'SolarSystemRoot';
  const byName = {};
  const solarBodies = [];

  const textureMap = {
      Sun: textures.sun, Mercury: textures.mercury, Venus: textures.venus,
      Earth: textures.earth, Mars: textures.mars, Jupiter: textures.jupiter,
      Saturn: textures.saturn, Uranus: textures.uranus, Neptune: textures.neptune,
      Moon: textures.moon
  };
  
  const sunMultiplier = 150;

  bodies.forEach(data => {
    const isSun = data.name === 'Sun';
    const radius = data.radiusKm * KM_TO_WORLD_UNITS * (isSun ? sunMultiplier : SIZE_MULTIPLIER);
    const group = new THREE.Group();
    group.name = data.name;
    
    const geometry = new THREE.SphereGeometry(Math.max(radius, 0.01), 64, 64);
    let material;
    const texture = textureMap[data.name];
    if (texture) {
      if (isSun) material = new THREE.MeshBasicMaterial({ map: texture });
      else material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
    } else {
      material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8 });
    }
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    const label = createLabel(data.name);
    label.position.y = radius * 1.5 + 0.1;
    label.scale.setScalar(5);
    group.add(label);
    group.userData.label = label;
    
    // User data is set before orbit line creation
    group.userData = { ...data, radius, meanAnomaly0: 0, elapsedDays: 0 };
    byName[data.name] = group;
    solarBodies.push({ data, group });
  });

  solarBodies.forEach(obj => {
    const { data, group } = obj;
    const parent = byName[data.parent];
    const parentGroup = parent || solarGroup;
    parentGroup.add(group);

    // --- FIX: Create orbit lines within the correct parent's coordinate system ---
    if (data.orbitalPeriodDays > 0) {
      const points = [];
      for (let i = 0; i <= 360; i += 2) {
        // Use the same starting data as the planet itself for path calculation
        const pos = getOrbitalPosition({ ...data, meanAnomaly0: (i * Math.PI / 180) }, 0);
        points.push(pos);
      }
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.4 });
      const line = new THREE.Line(lineGeom, lineMat);
      parentGroup.add(line); // Add line to the same parent as the body
    }
    
    // Special features like lights and rings are added after parenting
    if (data.name === 'Sun') {
        group.add(new THREE.PointLight(0xffffff, 2.5, 0, 1.5));
    } else if (data.name === 'Earth') {
        const atmMat = new THREE.ShaderMaterial({ vertexShader: atmosphereVertexShader, fragmentShader: atmosphereFragmentShader, blending: THREE.AdditiveBlending, side: THREE.BackSide });
        group.add(new THREE.Mesh(new THREE.SphereGeometry(obj.group.userData.radius * 1.05, 64, 64), atmMat));
    } else if (data.name === 'Saturn') {
        const ringMat = new THREE.MeshBasicMaterial({ map: textures.saturnRing, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
        const ringMesh = new THREE.Mesh(new THREE.RingGeometry(obj.group.userData.radius * 1.5, obj.group.userData.radius * 2.5, 64), ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        group.add(ringMesh);
    }
    
    group.rotation.z = degToRad(data.axialTiltDeg || 0);
  });
  
  updateSolarSystem(solarGroup, 0, null); // Calculate initial positions

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
    if (ud.rotationPeriodHours !== 0) {
      // --- FIX: Removed dampener for scientifically accurate rotation speed. ---
      // Note: This will be very fast at high time warp values.
      const rotationAmount = (2 * Math.PI / ud.rotationPeriodHours) * (deltaDays * 24);
      if(group.children[0]) {
        group.children[0].rotation.y += rotationAmount;
      }
    }
    if (ud.label && camera) {
      ud.label.quaternion.copy(camera.quaternion);
    }
  });
}
