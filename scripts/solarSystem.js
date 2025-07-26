import * as THREE from 'three';
import { bodies } from './data.js';
import { KM_TO_WORLD_UNITS, SIZE_MULTIPLIER, SEC_TO_DAYS, getTimeMultiplier } from './constants.js';
import { degToRad, getOrbitalPosition, createLabel } from './utils.js';

// --- SHADER DEFINITIONS ---

// A simple and robust shader for standard planets. It calculates a "lit" and "dark" side
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
    // Calculate the lighting based on the angle to the sun
    float light = dot(normalize(vNormal), sunDirection);
    // Use smoothstep for a softer terminator line (day/night transition)
    float lighting = smoothstep(-0.1, 0.1, light);
    // Add an ambient light term to ensure the dark side is not pure black, so we can see the texture
    lighting = max(lighting, 0.15); 
    gl_FragColor = vec4(texColor.rgb * lighting, texColor.a);
  }
`;

// A simplified, stable shader for Earth that blends day and night textures.
const earthFragmentShader = `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  
  void main() {
    // Sample day and night textures
    vec3 dayColor = texture2D(dayTexture, vUv).rgb;
    vec3 nightColor = texture2D(nightTexture, vUv).rgb;
    
    // Calculate how much light this part of the planet receives
    float light = dot(normalize(vNormal), sunDirection);
    float dayNightMix = smoothstep(-0.05, 0.05, light); // Create a soft transition
    
    // Mix day and night textures based on the light
    vec3 surfaceColor = mix(nightColor, dayColor, dayNightMix);
    
    // Atmospheric Haze (Fresnel effect) to give the planet a glowing edge
    float hazeFactor = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
    hazeFactor = pow(hazeFactor, 2.0);
    vec3 hazeColor = vec3(0.3, 0.6, 1.0) * hazeFactor * dayNightMix;
    
    gl_FragColor = vec4(surfaceColor + hazeColor, 1.0);
  }
`;

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
    
    // REMOVED: The problematic helper sprites are gone for good.
    const bodyMesh = mesh;
    group.userData = { ...data, radius, meanAnomaly0: 0, elapsedDays: 0, label, bodyMesh };
    
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
  // Get the Sun's absolute world position for accurate lighting calculations
  const sunWorldPos = solarGroup.getWorldPosition(new THREE.Vector3());

  bodies.forEach(obj => {
    const group = obj.group;
    const ud = group.userData;
    
    if (ud.orbitalPeriodDays > 0) {
      ud.elapsedDays += deltaDays;
      const pos = getOrbitalPosition(ud, ud.elapsedDays);
      group.position.copy(pos);
    }

    // Update the sunDirection uniform for each planet's custom shader material
    if (group.children[0].material.uniforms && group.children[0].material.uniforms.sunDirection) {
        const planetWorldPos = group.getWorldPosition(new THREE.Vector3());
        // The direction to the sun is the vector from the planet to the sun
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
      
      // We no longer need to toggle visibility with sprites, but we can still hide
      // the labels when they are too far away to be useful.
      const labelVisible = distance < (ud.radius * 2500);
      ud.label.visible = labelVisible;
    }
  });
}
