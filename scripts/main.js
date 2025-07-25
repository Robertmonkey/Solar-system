// Entry point for the Solar System simulator with lectern cockpit redesign.
// This version integrates the new cockpit layout, placing all interactive
// elements on top of the larger console and firing probes from the new barrel.

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

  const { solarGroup, bodies } = await createSolarSystem();
  solarGroup.position.x = -AU_KM * KM_TO_WORLD_UNITS;
  scene.add(solarGroup);

  const cockpit = createCockpit();
  scene.add(cockpit.group);

  const audio = await initAudio(camera, cockpit.group);

  const orrery = createOrrery();
  orrery.group.scale.setScalar(0.2); // Resized orrery
  cockpit.orreryMount.add(orrery.group);
  orrery.group.position.set(0, 0.02, 0); // On top of podium
  const playerMarker = createPlayerMarker();
  orrery.group.add(playerMarker);

  const probes = createProbes();
  scene.add(probes.group);
  let probeSettings = { mass: 0.5, velocity: 0.5 };

  const ui = createUI(bodies, {
    onWarp: index => handleWarpSelect(bodies[index]),
    onProbeChange: (settings) => { probeSettings = settings; },
    onTimeChange: value => { const m = Math.pow(10, 6 * value) - 1 + value * 10; setTimeMultiplier(m); },
    onNarrate: text => audio.speak(text)
  });

  // --- New UI Panel Layout & Scale ---
  const panelY = 1.08; // Y-position for panels to sit on the desk
  // Center panel
  ui.factsMesh.position.set(0, panelY, -0.9);
  ui.factsMesh.scale.setScalar(0.8); // Resized panel
  cockpit.group.add(ui.factsMesh);
  // Left angled panel
  ui.warpMesh.position.set(-0.8, panelY, -0.6);
  ui.warpMesh.scale.setScalar(0.5); // Resized panel
  ui.warpMesh.rotation.y = Math.PI / 5;
  cockpit.group.add(ui.warpMesh);
  // Right angled panel
  ui.probeMesh.position.set(0.8, panelY, -0.6);
  ui.probeMesh.scale.setScalar(0.7); // Resized panel
  ui.probeMesh.rotation.y = -Math.PI / 5;
  cockpit.group.add(ui.probeMesh);

  const controls = setupControls(renderer, scene, cockpit, ui, () => {
    // Get launch position from the new muzzle object
    const muzzlePos = cockpit.launcherMuzzle.getWorldPosition(new THREE.Vector3());
    const solarOrigin = solarGroup.getWorldPosition(new THREE.Vector3());
    const launchPos = muzzlePos.clone().sub(solarOrigin);
    // Launch direction is straight out from the muzzle
    const launchDir = new THREE.Vector3();
    cockpit.launcherMuzzle.getWorldDirection(launchDir);
    launchProbe(probes, launchPos, launchDir, probeSettings.mass, probeSettings.velocity);
    audio.playBeep();
  });

  function handleWarpSelect(body) { /* ... same as before ... */ }
  const renderLoop = () => {
    const delta = renderer.clock.getDelta();
    const movement = controls.update(delta);
    if (movement) solarGroup.position.sub(movement);
    updateSolarSystem(solarGroup, delta);
    updateProbes(probes, delta, bodies, cockpit.launcherBarrel);
    updateOrrery(orrery, delta);
    const playerPosInOrrery = solarGroup.position.clone().negate();
    playerMarker.position.copy(playerPosInOrrery).multiplyScalar(orrery.group.scale.x);
    ui.update();
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop(renderLoop);
}
main();
