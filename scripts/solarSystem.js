// scripts/solarSystem.js

import * as THREE from 'three';
import { bodies } from './data.js';
import { KM_TO_WORLD_UNITS, SIZE_MULTIPLIER, SEC_TO_DAYS, getTimeMultiplier } from './constants.js';
import { degToRad, getOrbitalPosition, createLabel } from './utils.js';

// ... (shader code remains the same)
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

// NEW: Create a simple white dot texture for our helper sprites.
function createDotTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
}
const dotTexture = createDotTexture();
const spriteMaterial = new THREE.SpriteMaterial({ map: dotTexture, blending: THREE.AdditiveBlending, depthTest: false, toneMapped: false });


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
  
  // MODIFIED: Removed sunMultiplier, the sun is now its true relative size.
  bodies.forEach(data => {
    const isSun = data.name === 'Sun';
    // MODIFIED: Radius is now the true radius in meters.
    const radius = data.radiusKm * KM_TO_WORLD_UNITS * SIZE_MULTIPLIER;
    const group = new THREE.Group();
    group.name = data.name;
    
    const geometry = new THREE.SphereGeometry(Math.max(radius, 0.01), 64, 64);
    let material;
    const texture = textureMap[data.name];
    if (texture) {
      if (isSun) material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
      else material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
    } else {
      material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8 });
    }
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    const label = createLabel(data.name);
    // MODIFIED: Initial label position is based on the new radius.
    label.position.y = radius * 1.2;
    group.add(label);
    
    // NEW: Add a helper sprite to ensure the body is visible from extreme distances.
    const sprite = new THREE.Sprite(spriteMaterial);
    // The sprite for the sun should be much larger and more prominent.
    sprite.scale.setScalar(isSun ? radius * 50 : radius * 500);
    group.add(sprite);

    group.userData = { ...data, radius, meanAnomaly0: 0, elapsedDays: 0, label, bodyMesh: mesh, sprite };
    byName[data.name] = group;
    solarBodies.push({ data, group });
  });

  solarBodies.forEach(obj => {
    const { data, group } = obj;
    const parent = byName[data.parent];
    const parentGroup = parent || solarGroup;
    parentGroup.add(group);

    if (data.orbitalPeriodDays > 0) {
      const points = [];
      for (let i = 0; i <= 360; i += 2) {
        const pos = getOrbitalPosition({ ...data, meanAnomaly0: (i * Math.PI / 180) }, 0);
        points.push(pos);
      }
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.2 });
      const line = new THREE.Line(lineGeom, lineMat);
      parentGroup.add(line);
    }
    
    if (data.name === 'Sun') {
        group.add(new THREE.PointLight(0xffffff, 2.5, 0, 1.5));
    } else if (data.name === 'Earth') {
        const atmMat = new THREE.ShaderMaterial({ vertexShader: atmosphereVertexShader, fragmentShader: atmosphereFragmentShader, blending: THREE.AdditiveBlending, side: THREE.BackSide });
        group.add(new THREE.Mesh(new THREE.SphereGeometry(obj.group.userData.radius * 1.02, 64, 64), atmMat));
    } else if (data.name === 'Saturn') {
        const ringMat = new THREE.MeshBasicMaterial({ map: textures.saturnRing, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
        const ringMesh = new THREE.Mesh(new THREE.RingGeometry(obj.group.userData.radius * 1.2, obj.group.userData.radius * 2.2, 64), ringMat);
        ringMesh.rotation.x = Math.PI / 2 - degToRad(data.axialTiltDeg);
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

  const cameraWorldPos = camera ? camera.getWorldPosition(new THREE.Vector3()) : null;

  bodies.forEach(obj => {
    const group = obj.group;
    const ud = group.userData;
    
    if (ud.orbitalPeriodDays > 0) {
      ud.elapsedDays += deltaDays;
      const pos = getOrbitalPosition(ud, ud.elapsedDays);
      group.position.copy(pos);
    }
    if (ud.rotationPeriodHours !== 0) {
      const rotationAmount = (2 * Math.PI / ud.rotationPeriodHours) * (deltaDays * 24);
      if(ud.bodyMesh) {
        ud.bodyMesh.rotation.y += rotationAmount;
      }
    }
    if (ud.label && camera) {
      ud.label.quaternion.copy(camera.quaternion);
      
      const bodyWorldPos = group.getWorldPosition(new THREE.Vector3());
      const distance = cameraWorldPos.distanceTo(bodyWorldPos);

      // NEW: Dynamic scaling and visibility logic.
      // Make label a constant screen size for readability.
      const labelScale = distance * 0.005; 
      ud.label.scale.set(labelScale, labelScale, 1);
      
      // Define a distance where the planet mesh becomes "visible".
      const visibilityThreshold = ud.radius * 1500;
      const isVisible = distance < visibilityThreshold;
      
      // Show the planet mesh when close, otherwise show the helper sprite.
      ud.bodyMesh.visible = isVisible;
      ud.sprite.visible = !isVisible;
      ud.label.visible = isVisible; // Also hide label when far away
    }
  });
}
