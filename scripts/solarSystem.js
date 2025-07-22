/*
 * solarSystem.js
 *
 * This module is responsible for instantiating and updating the
 * planetary system.  It reads the descriptive data from data.js,
 * builds Three.js meshes for the Sun, planets, moons and dwarf
 * planets, and positions them according to Keplerian orbits.  An
 * update function recomputes the positions at each animation frame.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';
import { solarBodies } from './data.js';
import { KM_PER_WORLD_UNIT, SIZE_MULTIPLIER } from './constants.js';
import { getOrbitalPosition } from './utils.js';

// Map of body names to texture image URLs.  If a texture exists
// for a given body the corresponding sphere will be textured with
// realistic imagery.  Otherwise a solid colour is used.  The images
// are pulled directly from the original GitHub repository via
// RawGitHub URLs.  Feel free to replace these with your own high
// resolution maps.  To conserve bandwidth we only provide maps for
// the most prominent bodies.
const TEXTURE_MAP = {
  'Earth': 'https://raw.githubusercontent.com/Robertmonkey/Solar-system/main/textures/earth_daymap.jpg',
  'Moon': 'https://raw.githubusercontent.com/Robertmonkey/Solar-system/main/textures/moon_map.jpg',
  'Mars': 'https://raw.githubusercontent.com/Robertmonkey/Solar-system/main/textures/mars.jpg',
  'Jupiter': 'https://raw.githubusercontent.com/Robertmonkey/Solar-system/main/textures/jupiter.jpg',
  'Saturn': 'https://raw.githubusercontent.com/Robertmonkey/Solar-system/main/textures/saturn.jpg',
  'Uranus': 'https://raw.githubusercontent.com/Robertmonkey/Solar-system/main/textures/uranus.jpg',
  'Neptune': 'https://raw.githubusercontent.com/Robertmonkey/Solar-system/main/textures/neptune.jpg',
  'Pluto': 'https://raw.githubusercontent.com/Robertmonkey/Solar-system/main/textures/pluto.jpg'
};

/**
 * Recursively build a mesh for a solar body (planet or moon) and its
 * descendants.  The returned object contains a Three.js Group with
 * the spherical mesh and any nested moons attached.  Each object
 * stores a reference to its descriptive data and its children.  The
 * group’s position is updated each frame during the animation.
 *
 * @param {Object} bodyData entry from solarBodies array
 * @param {THREE.TextureLoader} loader texture loader for asynchronous
 *        image loading
 * @param {boolean} showOrbit whether to draw an orbital line
 * @returns {Promise<Object>} resolved with an object containing the
 *          Three.js group, mesh and data
 */
async function buildBody(bodyData, loader, showOrbit = true) {
  const group = new THREE.Group();
  group.name = bodyData.name;
  // Determine sphere radius in world units.  Multiply by size
  // multiplier to enhance visibility.
  const radiusWorld = (bodyData.radius / KM_PER_WORLD_UNIT) * SIZE_MULTIPLIER;
  let material;
  // Try to load a texture if one is specified in TEXTURE_MAP.
  const texURL = TEXTURE_MAP[bodyData.name];
  if (texURL) {
    try {
      const texture = await loader.loadAsync(texURL);
      texture.anisotropy = 4;
      material = new THREE.MeshPhongMaterial({ map: texture });
    } catch (err) {
      // Fallback to plain colour if the texture fails to load.
      material = new THREE.MeshPhongMaterial({ color: bodyData.color, flatShading: false });
    }
  } else {
    material = new THREE.MeshPhongMaterial({ color: bodyData.color, flatShading: false });
  }
  const sphereGeo = new THREE.SphereGeometry(radiusWorld, 64, 64);
  const sphereMesh = new THREE.Mesh(sphereGeo, material);
  sphereMesh.castShadow = false;
  sphereMesh.receiveShadow = false;
  group.add(sphereMesh);

  // Build orbit line if this body orbits another body (i.e. it has
  // semi‑major axis defined).  The Sun has no orbit line.  We use
  // 256 segments for smooth ellipses.
  let orbitLine = null;
  if (showOrbit && bodyData.a && bodyData.e !== undefined) {
    const segments = 256;
    const points = [];
    // Construct points along the orbit by sampling mean anomaly.
    for (let j = 0; j <= segments; j++) {
      const tFrac = j / segments;
      const M = 2 * Math.PI * tFrac;
      // Build a fake elements object to reuse getOrbitalPosition.  Use
      // period of 1 day so t parameter is interpreted as mean anomaly.
      const elements = {
        a: bodyData.a,
        e: bodyData.e,
        i: bodyData.inclination || 0,
        omega: bodyData.lonAscNode || 0,
        w: bodyData.argPeri || 0,
        M0: 0,
        period: 1
      };
      // We pass M in place of t by converting M to t fraction of the
      // fictitious period.  getOrbitalPosition multiplies t by n to
      // obtain mean anomaly, so to get M directly we need t = M/(2π).
      const pos = getOrbitalPosition(elements, M / (2 * Math.PI));
      points.push(pos);
    }
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x404040 });
    orbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial);
    orbitLine.position.set(0, 0, 0);
    group.add(orbitLine);
  }

  const children = [];
  if (Array.isArray(bodyData.moons)) {
    for (const moon of bodyData.moons) {
      const child = await buildBody(moon, loader, false);
      group.add(child.group);
      children.push(child);
    }
  }
  return { group, mesh: sphereMesh, data: bodyData, children, orbitLine };
}

/**
 * Build the entire solar system hierarchy.
 *
 * This asynchronous function loads textures and constructs all bodies
 * recursively.  The returned object contains the root Group that can
 * be added to the Three.js scene and a flat array of body objects for
 * updating.  Passing showOrbits = true draws faint lines along the
 * orbital paths of planets and moons for visual reference.
 *
 * @param {boolean} showOrbits whether to draw orbital guides
 * @returns {Promise<{ group: THREE.Group, bodies: Array }>} solar system representation
 */
export async function createSolarSystem(showOrbits = true) {
  const rootGroup = new THREE.Group();
  const loader = new THREE.TextureLoader();
  const bodies = [];
  for (const bodyData of solarBodies) {
    const bodyObj = await buildBody(bodyData, loader, showOrbits);
    rootGroup.add(bodyObj.group);
    bodies.push(bodyObj);
  }
  return { group: rootGroup, bodies };
}

/**
 * Update the positions of all bodies in the system.
 *
 * At each animation frame we compute the new position of each body
 * according to its Keplerian elements and the current simulation
 * time.  Planets and dwarf planets orbit the Sun; moons orbit their
 * parent planet’s local coordinate frame.  Time is measured in Earth
 * days and may be advanced faster or slower depending on the user’s
 * speed setting.  The returned positions are expressed relative to
 * the rootGroup (origin at the Sun).
 *
 * @param {Array} bodies array of objects returned from buildBody()
 * @param {number} t simulation time in Earth days
 */
export function updateSolarSystem(bodies, t) {
  for (const bodyObj of bodies) {
    // Skip the Sun – it is stationary at the origin.
    if (!bodyObj.data.a) {
      bodyObj.group.position.set(0, 0, 0);
    } else {
      const elements = {
        a: bodyObj.data.a,
        e: bodyObj.data.e,
        i: bodyObj.data.inclination || 0,
        omega: bodyObj.data.lonAscNode || 0,
        w: bodyObj.data.argPeri || 0,
        M0: bodyObj.data.meanAnomalyEpoch || 0,
        period: bodyObj.data.period
      };
      const pos = getOrbitalPosition(elements, t);
      bodyObj.group.position.copy(pos);
    }
    // Update the moons recursively.  Each moon’s orbital parameters
    // are relative to its parent planet, so we treat the parent group
    // as the local coordinate frame.
    function updateMoons(children, parentT) {
      for (const child of children) {
        if (!child.data.a) {
          child.group.position.set(0, 0, 0);
        } else {
          const elements = {
            a: child.data.a,
            e: child.data.e,
            i: child.data.inclination || 0,
            omega: child.data.lonAscNode || 0,
            w: child.data.argPeri || 0,
            M0: child.data.meanAnomalyEpoch || 0,
            period: child.data.period
          };
          const posRel = getOrbitalPosition(elements, t);
          child.group.position.copy(posRel);
        }
        updateMoons(child.children, t);
      }
    }
    updateMoons(bodyObj.children, t);
  }
}