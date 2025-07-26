import * as THREE from 'three';
import { bodies } from './data.js';
import { KM_TO_WORLD_UNITS, SIZE_MULTIPLIER, SEC_TO_DAYS, getTimeMultiplier, PALETTE, AU_KM } from './constants.js';
import { getOrbitalPosition, createLabel } from './utils.js';

const ORRERY_RADIUS = 0.8;
const NEPTUNE_ORBIT_METERS = 30 * AU_KM * KM_TO_WORLD_UNITS;

// Use natural log (Math.log) for more aggressive distance compression.
// The scale factor is recalculated based on this to fit Neptune's orbit.
export const LOG_POSITION_SCALE = ORRERY_RADIUS / Math.log(NEPTUNE_ORBIT_METERS + 1);

// Planet size on the orrery is increased 20x for much better visibility.
const SIZE_SCALE = 0.02;


export function createOrrery() {
  const group = new THREE.Group();
  group.name = 'MiniOrrery';

  const baseGeom = new THREE.CylinderGeometry(0.8, 1, 0.1, 32);
  const baseMat = new THREE.MeshStandardMaterial({color: 0x333333, metalness: 0.8, roughness: 0.5});
  const base = new THREE.Mesh(baseGeom, baseMat);
  group.add(base);

  const byName = {};
  const objects = [];

  bodies.forEach(data => {
    const isSun = data.name === 'Sun';
    // Radius calculation uses the new, larger SIZE_SCALE.
    const radius = data.radiusKm * KM_TO_WORLD_UNITS * SIZE_MULTIPLIER * (isSun ? SIZE_SCALE * 10 : SIZE_SCALE);
    const geometry = new THREE.SphereGeometry(Math.max(radius, 0.005), 16, 16);
    const color = PALETTE[data.name] || 0xffffff;
    const material = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    if(isSun) mesh.scale.setScalar(1.5);

    const objGroup = new THREE.Group();
    objGroup.name = data.name;
    objGroup.add(mesh);

    if (data.orbitalPeriodDays > 0) {
      const points = [];
      for (let i = 0; i <= 360; i += 5) {
        const pos = getOrbitalPosition({ ...data, meanAnomaly0: (i * Math.PI / 180) }, 0);
        
        // Apply the logarithmic mapping to the orbit lines.
        const dist = pos.length();
        if (dist > 0) {
            // Use natural log for more compression. Add 1 to distance to avoid log(0).
            const logDist = Math.log(dist + 1);
            const displayPos = pos.normalize().multiplyScalar(logDist * LOG_POSITION_SCALE);
            points.push(displayPos);
        }
      }
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color: PALETTE[data.name], transparent: true, opacity: 0.5 });
      const line = new THREE.Line(lineGeom, lineMat);
      objGroup.userData.orbitLine = line;
    }

    byName[data.name] = objGroup;
    objects.push({ data, group: objGroup, elapsedDays: Math.random() * 1000 });
  });

  objects.forEach(obj => {
    const parent = byName[obj.data.parent] || base;
    parent.add(obj.group);
    if (obj.group.userData.orbitLine) {
        parent.add(obj.group.userData.orbitLine);
    }
  });

  return { group, objects };
}

export function updateOrrery(orrery, elapsedSec) {
  const deltaDays = elapsedSec * SEC_TO_DAYS * getTimeMultiplier();
  orrery.objects.forEach(obj => {
    if (obj.data.orbitalPeriodDays > 0) {
      obj.elapsedDays += deltaDays;
      const pos = getOrbitalPosition(obj.data, obj.elapsedDays);

      // Apply the logarithmic mapping to planet positions.
      const dist = pos.length();
      if (dist > 0) {
        // Use natural log for more compression.
        const logDist = Math.log(dist + 1);
        const displayPos = pos.normalize().multiplyScalar(logDist * LOG_POSITION_SCALE);
        obj.group.position.copy(displayPos);
      }
    }
  });
}

export function createPlayerMarker() {
  const markerGroup = new THREE.Group();
  const geometry = new THREE.SphereGeometry(0.02, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000, toneMapped: false });
  const marker = new THREE.Mesh(geometry, material);
  
  const label = createLabel("YOU ARE HERE");
  label.position.y = 0.15;
  label.scale.setScalar(0.5);

  markerGroup.add(marker);
  markerGroup.add(label);

  markerGroup.onBeforeRender = (renderer) => {
    const camera = renderer.xr.getCamera();
    label.quaternion.copy(camera.quaternion);
  };
  
  return markerGroup;
}
