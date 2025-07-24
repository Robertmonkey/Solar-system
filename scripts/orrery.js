// A simplified orrery for the cockpit. It displays a miniature version of the
// solar system on the desk with an indicator showing the player’s position.

import * as THREE from 'three';
import { bodies as bodyData } from './data.js';

// Determine the maximum orbital radius so the orrery can scale to fit
const maxOrbit = bodyData.reduce((max, b) => Math.max(max, b.orbitRadius || 0), 0);

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
    const r = Math.max(obj.data.radius * 0.05, 0.15);
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
  const lut = {
    Sun: 0xffcc00,
    Mercury: 0xb1b1b1,
    Venus: 0xeedd82,
    Earth: 0x3366cc,
    Moon: 0x999999,
    Mars: 0xcc5533,
    Phobos: 0x8f8f8f,
    Deimos: 0xafafaf,
    Jupiter: 0xddaa77,
    Amalthea: 0x9b593c,
    Io: 0xf3d649,
    Europa: 0xaaaaaa,
    Ganymede: 0x9e9990,
    Callisto: 0x5a5651,
    Himalia: 0x8b8081,
    Saturn: 0xffddaa,
    Mimas: 0xb0b0b0,
    Enceladus: 0xe0e0e0,
    Tethys: 0xd8d8d8,
    Dione: 0xc8c8c8,
    Rhea: 0xb8b8b8,
    Titan: 0xf5ad6f,
    Hyperion: 0xa08c78,
    Iapetus: 0x909090,
    Phoebe: 0x5a5a5a,
    Uranus: 0x66ccff,
    Puck: 0x707070,
    Miranda: 0xc0c0c0,
    Ariel: 0xd0d0d0,
    Umbriel: 0x888888,
    Titania: 0xb0a090,
    Oberon: 0x908080,
    Neptune: 0x3366aa,
    Proteus: 0x606060,
    Triton: 0xced4da,
    Nereid: 0xa0a0a0,
    Pluto: 0x9999cc,
    Charon: 0xb5a99d,
    Styx: 0x8f8f8f,
    Nix: 0x909090,
    Kerberos: 0x808080,
    Hydra: 0xa0a0a0,
    Ceres: 0xaaaaaa,
    Haumea: 0xd1c7b7,
    "Hi'iaka": 0xa0a0a0,
    Namaka: 0x8a8a8a,
    Makemake: 0xc18d66,
    MK2: 0xaaaaaa,
    Eris: 0xcec8c8,
    Dysnomia: 0x909090,
    "Halley's Comet": 0xffffff,
    'Voyager 1': 0xffffff,
    'Voyager 2': 0xffffff,
    'Pioneer 10': 0xffd700,
    'New Horizons': 0xffa500
  };
  return lut[name] || 0xffffff;
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
