import * as THREE from 'three';
import { bodies } from './data.js';
import { degToRad, getOrbitalPosition, getTimeMultiplier, KM_TO_WORLD_UNITS } from './utils.js';

/**
 * Build the hierarchy of solar-system objects.
 * Returns an object containing the root group and a flat array of body objects
 * with their associated groups for convenience.
 */
export function createSolarSystem() {
  const root = new THREE.Group();
  root.name = 'SolarSystem';

  const loader = new THREE.TextureLoader();
  const materialCache = new Map();
  const bodiesList = [];
  const groupMap = new Map();
  const MIN_SIZE = 0.05;

  bodies.forEach(data => {
    let radius = data.radius * KM_TO_WORLD_UNITS;
    if (radius < MIN_SIZE) radius = MIN_SIZE;
    const geometry = new THREE.SphereGeometry(radius, 32, 32);

    let material;
    if (data.texture) {
      if (!materialCache.has(data.texture)) {
        const tex = loader.load(data.texture);
        materialCache.set(data.texture, new THREE.MeshLambertMaterial({ map: tex }));
      }
      material = materialCache.get(data.texture);
    } else {
      if (!materialCache.has('default')) {
        materialCache.set('default', new THREE.MeshLambertMaterial({ color: 0xffffff }));
      }
      material = materialCache.get('default');
    }

    const mesh = new THREE.Mesh(geometry, material);
    const group = new THREE.Group();
    group.name = data.name;
    group.add(mesh);
    group.rotation.z = degToRad(data.tilt || 0);

    group.userData = {
      data,
      mesh,
      elements: data.orbitalElements || {
        a: (data.orbitRadius || 0) * KM_TO_WORLD_UNITS,
        e: 0,
        period: data.orbitPeriod || 0,
        i: 0,
        omega: 0,
        w: 0,
        M0: 0
      },
      rotationPeriodHours: (data.rotationPeriodHours !== undefined)
        ? data.rotationPeriodHours
        : ((data.rotationPeriod || 0) * 24),
      time: Math.random() * (data.orbitPeriod || 1)
    };

    groupMap.set(data.name, group);
    bodiesList.push({ data, group });
  });

  bodies.forEach(data => {
    const group = groupMap.get(data.name);
    const parentName = data.parent;
    if (parentName) {
      const parentGroup = groupMap.get(parentName);
      if (parentGroup) {
        parentGroup.add(group);
      } else {
        root.add(group);
      }
    } else {
      root.add(group);
    }
  });

  root.userData.bodies = bodiesList;
  return { solarGroup: root, bodies: bodiesList };
}

/**
 * Update the solar system for the given elapsed seconds.
 * @param {THREE.Group} root root group returned from createSolarSystem
 * @param {number} elapsedSec real time in seconds since last update
 */
export function updateSolarSystem(root, elapsedSec) {
  const scaledSec = elapsedSec * getTimeMultiplier();
  const deltaDays = scaledSec / 86400;
  const bodiesList = root.userData.bodies || [];

  bodiesList.forEach(obj => {
    const group = obj.group;
    const ud = group.userData;

    if (ud.elements.period > 0 && ud.elements.a > 0) {
      ud.time += deltaDays;
      const pos = getOrbitalPosition(ud.elements, ud.time);
      group.position.copy(pos);
    }

    const rotHours = ud.rotationPeriodHours;
    if (rotHours && rotHours !== 0) {
      const rotDelta = (scaledSec / Math.abs(rotHours * 3600)) * Math.PI * 2;
      group.rotation.y += rotDelta * Math.sign(rotHours);
    }
  });
}
