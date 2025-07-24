// A simplified orrery for the cockpit. It displays a miniature version of the
// solar system on the desk with an indicator showing the player’s position.

import * as THREE from 'three';
import { bodies as bodyData } from './data.js';
import { KM_TO_WORLD_UNITS, AU_KM, SIZE_MULTIPLIER, PALETTE } from './constants.js';

// Determine the maximum orbital radius so the orrery can scale to fit
const maxOrbit = bodyData.reduce((max, b) => Math.max(max, (b.semiMajorAxisAU || 0)), 0) * AU_KM * KM_TO_WORLD_UNITS;

// How big the orrery should be in metres (game units). All distances will be
// scaled to this size. A smaller radius makes the model fit comfortably on
// the desk inside the cockpit.
const ORRERY_RADIUS = 0.6;

// Create the orrery. Accepts the array of solarBodies produced by
// createSolarSystem and returns an object with the THREE.Group representing
// the orrery, an array of objects for each body and a ship indicator mesh.
export function createOrrery(solarBodies) {
  const group = new THREE.Group();
  group.name = 'Orrery';
  const objects = [];
  solarBodies.forEach(obj => {
    // Make each body a tiny sphere. We give probes a small constant size so
    // that they are visible even though their radii are extremely small.
    const worldRadius = obj.data.radiusKm * KM_TO_WORLD_UNITS * SIZE_MULTIPLIER;
    const r = Math.max(worldRadius * 0.05, 0.15);
    const geometry = new THREE.SphereGeometry(r, 16, 16);
    const colour = getColourForBody(obj.data.name);
    const material = new THREE.MeshBasicMaterial({ color: colour });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    objects.push({ body: obj, mesh });
  });
  // A red sphere to indicate the player's current position within the
  // orrery. This will be updated each frame.
  const shipIndicator = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  group.add(shipIndicator);
  return { group, objects, shipIndicator };
}

// Map a body name to a consistent colour for the orrery. These colours are
// arbitrary but provide a visual distinction between bodies. Unknown names
// default to white.  We extend the original lookup to cover the expanded
// data set including moons, dwarf planets and probes.
function getColourForBody(name) {
  return PALETTE[name] || 0xffffff;
}

// Update the orrery positions. Provide the orrery object from createOrrery,
// the solarGroup from createSolarSystem, and the camera/world position of
// the player. All positions are scaled down to fit into the ORRERY_RADIUS.
export function updateOrrery(orrery, solarGroup, cameraPosition) {
  // Compute scaling factor from the maximum orbital radius so that the
  // farthest body fits within the orrery’s radius.
  const scale = ORRERY_RADIUS / (maxOrbit + 1e-6);
  const tempVec = new THREE.Vector3();
  // Update positions for each body representation.
  orrery.objects.forEach(obj => {
    obj.body.group.getWorldPosition(tempVec);
    // Convert into solar-system-centric coordinates by subtracting the
    // solarGroup’s world position. Without this subtraction the Sun would
    // drift as the player moves.
    tempVec.sub(solarGroup.getWorldPosition(new THREE.Vector3()));
    obj.mesh.position.copy(tempVec).multiplyScalar(scale);
  });
  // Update the ship indicator. We compute the player’s position relative to
  // the solarGroup (centre of the Sun) and scale it into the orrery.
  const shipPos = new THREE.Vector3().copy(cameraPosition);
  shipPos.sub(solarGroup.getWorldPosition(new THREE.Vector3()));
  orrery.shipIndicator.position.copy(shipPos).multiplyScalar(scale);
}
