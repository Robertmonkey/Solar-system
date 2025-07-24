// Entry point for the Solar System simulator with lectern cockpit redesign.
// This version features an ergonomic layout, touch-based controls, and
// enhanced visuals for a more professional and immersive experience.

import * as THREE from 'three';
import { createSolarSystem, updateSolarSystem } from './solarSystem.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { createCockpit } from './lecternCockpit.js';
import { createUI } from './ui.js';
import { createControls as setupControls } from './controls.js';
import { createOrrery, updateOrrery, createPlayerMarker } from './orrery.js';
import { createProbes, launchProbe, updateProbes } from './probes.js';
import { initAudio } from './audio.js';
import { setTimeMultiplier, AU_KM, KM_TO_WORLD_UNITS } from './constants.js';


async function main() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005);
  scene.add(new THREE.AmbientLight(0x666666));
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 50000);
  camera.position.set(0, 1.6, 0.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // --- Solar System ---
  const { solarGroup, bodies } = await createSolarSystem();
  solarGroup.position.x = -AU_KM * KM_TO_WORLD_UNITS; // Start near Earth
  scene.add(solarGroup);

  // --- Cockpit ---
  const cockpit = createCockpit();
  scene.add(cockpit.group); // Positioned at origin, player stands inside

  // --- Audio ---
  const audio = await initAudio(camera, cockpit.group);

  // --- Orrery ---
  const orrery = createOrrery();
  orrery.group.scale.setScalar(0.25);
  cockpit.orreryMount.add(orrery.group);
  orrery.group.position.set(0, 0.1, 0);
  const playerMarker = createPlayerMarker();
  orrery.group.add(playerMarker);

  // --- UI and Probes ---
  const probes = createProbes();
  scene.add(probes.group);
  let probeSettings = { mass: 0.5, velocity: 0.5 };

  const ui = createUI(bodies, {
    onWarp: index => handleWarpSelect(bodies[index]),
    onProbeChange: (settings) => { probeSettings = settings; },
    onTimeChange: value => {
      const multiplier = Math.pow(10, 6 * value) - 1 + value * 10;
      setTimeMultiplier(multiplier);
    },
    onNarrate: text => audio.speak(text)
  });

  // --- Ergonomic UI Panel Layout ---
  // Center panel
  ui.factsMesh.position.set(0, 1.1, -0.75);
  cockpit.group.add(ui.factsMesh);
  // Left angled panel
  ui.warpMesh.position.set(-0.65, 1.1, -0.55);
  ui.warpMesh.rotation.y = Math.PI / 6;
  cockpit.group.add(ui.warpMesh);
  // Right angled panel
  ui.probeMesh.position.set(0.65, 1.1, -0.55);
  ui.probeMesh.rotation.y = -Math.PI / 6;
  cockpit.group.add(ui.probeMesh);

  // --- Controls ---
  const controls = setupControls(renderer, cockpit, ui, () => {
    const muzzle = new THREE.Vector3(0, 1.1, -0.7); // Front of the desk
    cockpit.group.localToWorld(muzzle);
    const solarOrigin = solarGroup.getWorldPosition(new THREE.Vector3());
    const launchPos = muzzle.clone().sub(solarOrigin);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    launchProbe(probes, launchPos, dir, probeSettings.mass, probeSettings.velocity);
    audio.playBeep();
  });

  function handleWarpSelect(body) {
    if (!body) return;
    const bodyWorldPos = new THREE.Vector3();
    body.group.getWorldPosition(bodyWorldPos);
    const scaledRadius = body.group.userData.radius || 1;
    const safeDistance = scaledRadius * 4;
    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const desiredPlayerPos = bodyWorldPos.clone().addScaledVector(camForward, -safeDistance);
    const shift = desiredPlayerPos.negate();
    solarGroup.position.copy(shift);
    audio.playWarp();
    ui.setSelectedIndex(bodies.findIndex(b => b.data.name === body.data.name));
    const fact = (body.data.facts || [])[0];
    if (fact) audio.speak(fact);
  }

  // --- Render Loop ---
  renderer.setAnimationLoop(() => {
    const delta = renderer.clock.getDelta();
    const movement = controls.update(delta);
    if (movement) {
      solarGroup.position.sub(movement);
    }
    updateSolarSystem(solarGroup, delta);
    updateProbes(probes, delta, bodies);
    updateOrrery(orrery, delta);
    const playerPosInOrrery = solarGroup.position.clone().negate();
    playerMarker.position.copy(playerPosInOrrery).multiplyScalar(orrery.group.scale.x);
    ui.update();
    renderer.render(scene, camera);
  });
}

main();
