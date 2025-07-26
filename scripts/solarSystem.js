import * as THREE from 'three';
import { bodies } from './data.js';
import { KM_TO_WORLD_UNITS, SIZE_MULTIPLIER, SEC_TO_DAYS, getTimeMultiplier } from './constants.js';
import { degToRad, getOrbitalPosition, createLabel } from './utils.js';

// --- SHADER DEFINITIONS ---

// A simple shader for standard planets. It calculates a "lit" and "dark" side
// based on a direction vector to the sun, without needing any Scene lights.
const planetVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const planetFragmentShader = `
  uniform sampler2D map;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vec4 texColor = texture2D(map, vUv);
    float light = dot(vNormal, sunDirection);
    // Use smoothstep for a softer terminator line
    float lighting = smoothstep(-0.1, 0.1, light);
    // Add an ambient term to ensure the dark side is not pure black
    lighting = max(lighting, 0.1); 
    gl_FragColor = vec4(texColor.rgb * lighting, texColor.a);
  }
`;

// An advanced shader for Earth, blending day, night, and cloud textures.
const earthFragmentShader = `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform sampler2D cloudTexture;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  
  void main() {
    // Sample textures
    vec3 dayColor = texture2D(dayTexture, vUv).rgb;
    vec3 nightColor = texture2D(nightTexture, vUv).rgb;
    vec4 cloudColor = texture2D(cloudTexture, vUv);
    
    // Calculate lighting
    float light = dot(vNormal, sunDirection);
    float dayNightMix = smoothstep(-0.05, 0.05, light);
    
    // Mix day and night textures
    vec3 surfaceColor = mix(nightColor, dayColor, dayNightMix);
    
    // Add clouds, lit by the sun
    surfaceColor += cloudColor.rgb * dayNightMix * 0.7;

    // Atmospheric Haze (Fresnel effect)
    float hazeFactor = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
    hazeFactor = pow(hazeFactor, 2.0);
    vec3 hazeColor = vec3(0.3, 0.6, 1.0) * hazeFactor * dayNightMix;
    
    gl_FragColor = vec4(surfaceColor + hazeColor, 1.0);
  }
`;

function createDotTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.beginPath(); ctx.arc(32, 32, 28, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.fill();
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
      Earth: textures.earthDay, Mars: textures.mars, Jupiter: textures.jupiter,
      Saturn: textures.saturn, Uranus: textures.uranus, Neptune: textures.neptune,
      Moon: textures.moon
  };
  
  const sunPosition = new THREE.Vector3(0, 0, 0);

  bodies.forEach(data => {
    const isSun = data.name === 'Sun';
    const radius = data.radiusKm * KM_TO_WORLD_UNITS * SIZE_MULTIPLIER;
    const group = new THREE.Group();
    group.name = data.name;
    
    const geometry = new THREE.SphereGeometry(Math.max(radius, 0.01), 64, 64);
    let material;
    
    if (isSun) {
        material = new THREE.MeshBasicMaterial({ map: textures.sun });
    } else if (data.name === 'Earth') {
        material = new THREE.ShaderMaterial({
            uniforms: {
                dayTexture: { value: textures.earthDay },
                nightTexture: { value: textures.earthNight },
                cloudTexture: { value: textures.earthClouds },
                sunDirection: { value: new THREE.Vector3(1, 0, 0) }
            },
            vertexShader: planetVertexShader,
            fragmentShader: earthFragmentShader,
        });
    } else {
        const texture = textureMap[data.name];
        material = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: texture },
                sunDirection: { value: new THREE.Vector3(1, 0, 0) }
            },
            vertexShader: planetVertexShader,
            fragmentShader: planetFragmentShader,
        });
    }
    
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    const label = createLabel(data.name);
    label.position.y = radius * 1.2;
    group.add(label);
    
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.setScalar(isSun ? radius * 50 : radius * 500);
    group.add(sprite);

    const bodyMesh = mesh;
    group.userData = { ...data, radius, meanAnomaly0: 0, elapsedDays: 0, label, bodyMesh, sprite };
    
    if (data.name === 'Earth') {
      // The clouds are now part of the main Earth shader, so we don't need a separate mesh.
    }

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
    
    if (data.name === 'Saturn') {
        const ringMat = new THREE.MeshBasicMaterial({ map: textures.saturnRing, side: THREE.DoubleSide, transparent: true, opacity: 0.9});
        const ringMesh = new THREE.Mesh(new THREE.RingGeometry(obj.group.userData.radius * 1.2, obj.group.userData.radius * 2.2, 64), ringMat);
        ringMesh.rotation.x = Math.PI / 2 - degToRad(data.axialTiltDeg);
        group.add(ringMesh);
    }
    
    group.rotation.z = degToRad(data.axialTiltDeg || 0);
  });
  
  updateSolarSystem(solarGroup, 0, null);

  solarGroup.userData.bodies = solarBodies;
  return { solarGroup, bodies: solarBodies };
}

export function updateSolarSystem(solarGroup, elapsedSec, camera) {
  const bodies = solarGroup.userData.bodies || [];
  const timeMult = getTimeMultiplier();
  const deltaDays = elapsedSec * SEC_TO_DAYS * timeMult;

  if (isNaN(deltaDays)) return;

  const cameraWorldPos = camera ? camera.getWorldPosition(new THREE.Vector3()) : null;
  const sunWorldPos = new THREE.Vector3(); // Sun is at the origin of the solarGroup

  bodies.forEach(obj => {
    const group = obj.group;
    const ud = group.userData;
    
    if (ud.orbitalPeriodDays > 0) {
      ud.elapsedDays += deltaDays;
      const pos = getOrbitalPosition(ud, ud.elapsedDays);
      group.position.copy(pos);
    }

    // Update the sunDirection uniform for each planet's shader material
    if (group.children[0].material.uniforms && group.children[0].material.uniforms.sunDirection) {
        const planetWorldPos = group.getWorldPosition(new THREE.Vector3());
        const sunDir = sunWorldPos.clone().sub(planetWorldPos).normalize();
        group.children[0].material.uniforms.sunDirection.value.copy(sunDir);
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
      
      const labelScale = distance * 0.005; 
      ud.label.scale.set(labelScale, labelScale, 1);
      
      const visibilityThreshold = ud.radius * 1500;
      const isVisible = distance < visibilityThreshold;
      
      ud.bodyMesh.visible = isVisible;
      ud.sprite.visible = !isVisible;
      ud.label.visible = isVisible;
    }
  });
}
