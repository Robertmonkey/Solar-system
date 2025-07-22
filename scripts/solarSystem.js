/*
 * solarSystem.js (Refactored)
 *
 * This module creates and updates the celestial bodies. Key enhancements:
 * - Creates a high-fidelity Earth with multiple layers: surface, night lights,
 * clouds with transparency, and a procedural atmospheric glow (Fresnel shader).
 * - Adds rings for Saturn using a transparent texture.
 * - Loads textures asynchronously for all major bodies.
 * - Calculates orbital positions using Keplerian elements from data.js.
 */

import * as THREE from 'three';
import { solarBodies } from './data.js';
import { KM_PER_WORLD_UNIT, SIZE_MULTIPLIER } from './constants.js';
import { getOrbitalPosition } from './utils.js';

const textureLoader = new THREE.TextureLoader();

// Asynchronously load all necessary textures at once.
const textures = {
  sun: textureLoader.loadAsync('./textures/sun.jpg'),
  mercury: textureLoader.loadAsync('./textures/mercury.jpg'),
  venus: textureLoader.loadAsync('./textures/venus_surface.jpg'),
  earthDay: textureLoader.loadAsync('./textures/earth_daymap.jpg'),
  earthNight: textureLoader.loadAsync('./textures/earth_lights.png'),
  earthClouds: textureLoader.loadAsync('./textures/earth_clouds.jpg'),
  moon: textureLoader.loadAsync('./textures/moon.jpg'),
  mars: textureLoader.loadAsync('./textures/mars.jpg'),
  jupiter: textureLoader.loadAsync('./textures/jupiter.jpg'),
  saturn: textureLoader.loadAsync('./textures/saturn.jpg'),
  saturnRing: textureLoader.loadAsync('./textures/saturn_ring_alpha.png'),
  uranus: textureLoader.loadAsync('./textures/uranus.jpg'),
  neptune: textureLoader.loadAsync('./textures/neptune.jpg'),
};

/**
 * Creates a mesh for a celestial body, applying appropriate textures.
 * Special cases for Earth and Saturn are handled.
 * @param {object} bodyData - The data object for the celestial body.
 * @returns {Promise<THREE.Group>} A promise that resolves to a Three.js Group for the body.
 */
async function buildBody(bodyData) {
  const group = new THREE.Group();
  group.name = bodyData.name;

  const radiusWorld = (bodyData.radius / KM_PER_WORLD_UNIT) * SIZE_MULTIPLIER;
  const sphereGeom = new THREE.SphereGeometry(radiusWorld, 64, 64);
  let bodyMesh;

  // --- Special Case: Earth ---
  if (bodyData.name === 'Earth') {
    const earthGroup = new THREE.Group();
    
    // 1. Earth Surface (Day/Night)
    const earthMat = new THREE.MeshPhongMaterial({
      map: await textures.earthDay,
      emissiveMap: await textures.earthNight,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.0,
      specular: new THREE.Color('grey'),
    });
    const earthSurface = new THREE.Mesh(sphereGeom, earthMat);
    earthGroup.add(earthSurface);

    // 2. Clouds
    const cloudGeom = new THREE.SphereGeometry(radiusWorld * 1.01, 64, 64);
    const cloudMat = new THREE.MeshPhongMaterial({
      map: await textures.earthClouds,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const clouds = new THREE.Mesh(cloudGeom, cloudMat);
    earthGroup.add(clouds);
    // Animate clouds separately in the main loop if desired for more realism
    group.userData.clouds = clouds;

    // 3. Atmospheric Glow (Fresnel Shader)
    const atmosGeom = new THREE.SphereGeometry(radiusWorld * 1.04, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      uniforms: {
        'c': { value: 0.5 },
        'p': { value: 4.0 },
        glowColor: { value: new THREE.Color(0x87ceeb) },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize( normalMatrix * normal );
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,
      fragmentShader: `
        uniform float c;
        uniform float p;
        uniform vec3 glowColor;
        varying vec3 vNormal;
        void main() {
          float intensity = pow( c - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) ), p );
          gl_FragColor = vec4( glowColor, 1.0 ) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    const atmosphere = new THREE.Mesh(atmosGeom, atmosMat);
    earthGroup.add(atmosphere);
    
    bodyMesh = earthGroup;
  } 
  // --- Special Case: Saturn ---
  else if (bodyData.name === 'Saturn') {
    const saturnMat = new THREE.MeshPhongMaterial({ map: await textures.saturn });
    const saturnMesh = new THREE.Mesh(sphereGeom, saturnMat);

    const ringGeom = new THREE.RingGeometry(radiusWorld * 1.2, radiusWorld * 2.1, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      map: await textures.saturnRing,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const pos = ringGeom.attributes.position;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++){
        v3.fromBufferAttribute(pos, i);
        ringGeom.attributes.uv.setXY(i, v3.length() < radiusWorld * 1.6 ? 0 : 1, 1);
    }

    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    
    const saturnGroup = new THREE.Group();
    saturnGroup.add(saturnMesh, ringMesh);
    bodyMesh = saturnGroup;
  }
  // --- Special Case: Sun ---
  else if (bodyData.name === 'Sun') {
    const sunMat = new THREE.MeshBasicMaterial({ map: await textures.sun });
    bodyMesh = new THREE.Mesh(sphereGeom, sunMat);
    // Add a lens flare or glow effect for the sun
    const pointLight = new THREE.PointLight(0xffffff, 1.5, 2000);
    bodyMesh.add(pointLight);
  }
  // --- Default Case: All other bodies ---
  else {
    const textureKey = bodyData.name.toLowerCase();
    const material = new THREE.MeshPhongMaterial({
      color: textures[textureKey] ? 0xffffff : bodyData.color,
      map: textures[textureKey] ? await textures[textureKey] : null,
    });
    bodyMesh = new THREE.Mesh(sphereGeom, material);
  }

  group.add(bodyMesh);

  // Add orbit line
  if (bodyData.a) { // If it has an orbit
    const points = [];
    for (let i = 0; i <= 360; i++) {
      const M = (i / 360) * 2 * Math.PI;
      const elements = { ...bodyData, M0: M, period: 1, i: bodyData.inclination, omega: bodyData.lonAscNode, w: bodyData.argPeri };
      const pos = getOrbitalPosition(elements, 0);
      points.push(pos);
    }
    const orbitGeom = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.5 });
    const orbitLine = new THREE.Line(orbitGeom, orbitMat);
    group.add(orbitLine);
  }

  // Recursively build moons
  if (bodyData.moons) {
    for (const moonData of bodyData.moons) {
      const moonObj = await buildBody(moonData);
      group.add(moonObj);
      bodyData.moonObjects = bodyData.moonObjects || [];
      bodyData.moonObjects.push({ group: moonObj, data: moonData });
    }
  }

  return group;
}


/**
 * Build the entire solar system hierarchy.
 * @param {THREE.Scene} scene - The main scene.
 * @returns {Promise<object>} An object with the root group and a flat list of body objects.
 */
export async function createSolarSystem(scene) {
  const rootGroup = new THREE.Group();
  const bodies = [];

  for (const bodyData of solarBodies) {
    const bodyGroup = await buildBody(bodyData);
    rootGroup.add(bodyGroup);
    bodies.push({ group: bodyGroup, data: bodyData });
  }

  return { group: rootGroup, bodies };
}

/**
 * Update the positions of all bodies in the system based on time.
 * @param {Array<object>} bodies - The array of body objects.
 * @param {number} t - The current simulation time in Earth days.
 */
export function updateSolarSystem(bodies, t) {
  bodies.forEach(bodyObj => {
    // Animate cloud rotation on Earth
    if (bodyObj.data.name === 'Earth' && bodyObj.group.userData.clouds) {
      bodyObj.group.userData.clouds.rotation.y += 0.0001;
    }

    // Update position of planets relative to the Sun (rootGroup)
    if (bodyObj.data.a) { // If it has orbital parameters
      // Map the data fields to the parameter names expected by getOrbitalPosition
      const elements = {
        ...bodyObj.data,
        i: bodyObj.data.inclination,
        omega: bodyObj.data.lonAscNode,
        w: bodyObj.data.argPeri,
        M0: bodyObj.data.meanAnomalyEpoch
      };
      const pos = getOrbitalPosition(elements, t);
      bodyObj.group.position.copy(pos);
    }

    // Update moons relative to their parent planet
    if (bodyObj.data.moonObjects) {
      bodyObj.data.moonObjects.forEach(moonObj => {
        const moonElements = {
          ...moonObj.data,
          i: moonObj.data.inclination,
          omega: moonObj.data.lonAscNode,
          w: moonObj.data.argPeri,
          M0: moonObj.data.meanAnomalyEpoch
        };
        const pos = getOrbitalPosition(moonElements, t);
        moonObj.group.position.copy(pos);
      });
    }
  });
}
