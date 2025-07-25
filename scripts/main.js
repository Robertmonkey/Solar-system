// Main entry point for the Solar System VR experience.
// This file has been updated to request additional WebXR features (layers and
// dom-overlay) and to add a resize handler.  It also defers control setup
// until a VR session begins, as before.

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
  const overlay = document.getElementById('overlay');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005);
  scene.add(new THREE.AmbientLight(0x888888));
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 50000);
  camera.position.set(0, 1.6, 0.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  // Ensure correct colour space on modern browsers
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Request hand-tracking support and the dom-overlay feature so our
  // HTML overlay can appear in VR. The "layers" feature caused session
  // creation to fail on some browsers, so it has been removed to improve
  // compatibility with the Quest 3.
  renderer.xr.setSessionInit({
    requiredFeatures: ['local-floor'],
    optionalFeatures: ['bounded-floor', 'hand-tracking', 'dom-overlay'],
    domOverlay: { root: document.body }
  });
  document.body.appendChild(renderer.domElement);
  document.body.style.backgroundImage = 'none';

  // Update camera and renderer on window resize to avoid stretched views.
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Create a clock for frame timing.  We do not attach it to the renderer
  // because WebGLRenderer does not define a `clock` property.  Instead,
  // we manage our own clock here.  Using THREE.Clock ensures consistent
  // delta values independent of display refresh rate.
  const clock = new THREE.Clock();

  const { solarGroup, bodies } = await createSolarSystem();
  solarGroup.position.x = -AU_KM * KM_TO_WORLD_UNITS;
  scene.add(solarGroup);

  const cockpit = createCockpit();
  scene.add(cockpit.group);

  const audio = await initAudio(camera, cockpit.group);

  const orrery = createOrrery();
  orrery.group.scale.setScalar(0.1);
  orrery.group.position.set(0, 1.3, -2);
  scene.add(orrery.group);
  const playerMarker = createPlayerMarker();
  orrery.group.add(playerMarker);

  const probes = createProbes();
  // Attach probes to the solar system so they travel with it when warping
  solarGroup.add(probes.group);
  let probeSettings = { mass: 0.5, velocity: 0.5 };

  const ui = createUI(bodies, {
    onWarp: index => handleWarpSelect(bodies[index]),
    onProbeChange: (settings) => { probeSettings = settings; },
    onTimeChange: value => { const m = Math.pow(10, 6 * value) - 1 + value * 10; setTimeMultiplier(m); },
    onNarrate: text => audio.speak(text)
  });

  const deskSurfaceY = 1.04;
  const panelScale = { warp: 0.35, facts: 0.6, probe: 0.5 };

  ui.warpMesh.scale.setScalar(panelScale.warp);
  ui.factsMesh.scale.setScalar(panelScale.facts);
  ui.probeMesh.scale.setScalar(panelScale.probe);

  const warpHeight = 1.6 * panelScale.warp;
  ui.warpMesh.position.set(-0.9, deskSurfaceY + warpHeight / 2, -0.6);
  ui.warpMesh.rotation.y = Math.PI / 6;
  cockpit.group.add(ui.warpMesh);

  const factsHeight = 0.6 * panelScale.facts;
  ui.factsMesh.position.set(0, deskSurfaceY + factsHeight / 2, -0.95);
  cockpit.group.add(ui.factsMesh);

  const probeHeight = 0.8 * panelScale.probe;
  ui.probeMesh.position.set(0.9, deskSurfaceY + probeHeight / 2, -0.6);
  ui.probeMesh.rotation.y = -Math.PI / 6;
  cockpit.group.add(ui.probeMesh);

  // Start with dummy controls that do nothing.
  let controls = { update: () => null };

  // --- Defer the real control setup until the VR session starts ---
  renderer.xr.addEventListener('sessionstart', () => {
    controls = setupControls(renderer, scene, camera, cockpit, ui, () => {
      const muzzlePos = cockpit.launcherMuzzle.getWorldPosition(new THREE.Vector3());
      // Convert to solar system local coordinates so probes spawn at the muzzle
      const launchPos = solarGroup.worldToLocal(muzzlePos.clone());
      const launchDir = new THREE.Vector3();
      cockpit.launcherMuzzle.getWorldDirection(launchDir);
      launchProbe(probes, launchPos, launchDir, probeSettings.mass, probeSettings.velocity);
      audio.playBeep();
    });
  });

  // When the session ends, revert to the dummy controls.
  renderer.xr.addEventListener('sessionend', () => {
    controls = { update: () => null };
  });

  function handleWarpSelect(body) {
    if (!body) return;
    const bodyWorldPos = new THREE.Vector3();
    body.group.getWorldPosition(bodyWorldPos);
    const scaledRadius = body.group.userData.radius || 1;
    const safeDistance = scaledRadius * 4;
    
    // --- FIX: Get the camera's forward direction from the main 'camera' object. ---
    // The renderer updates this camera's pose to match the HMD in an XR session.
    // `renderer.xr.getCamera()` returns an ArrayCamera which does not have a single quaternion.
    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    
    const desiredPlayerPos = bodyWorldPos.clone().addScaledVector(camForward, -safeDistance);
    const shift = desiredPlayerPos.negate();
    solarGroup.position.copy(shift);
    audio.playWarp();
    ui.setSelectedIndex(bodies.findIndex(b => b.data.name === body.data.name));
    const fact = (body.data.facts || [])[0];
    if (fact) audio.speak(fact);
  }

  renderer.setAnimationLoop(() => {
    // Advance our local clock to compute the time since the last frame.
    const delta = clock.getDelta();
    // The `controls` object will be the real one inside a VR session,
    // and the dummy one outside of it.
    const movement = controls.update(delta, renderer.xr.getCamera());
    if (movement) solarGroup.position.sub(movement);

    updateSolarSystem(solarGroup, delta);
    updateProbes(probes, delta, bodies, cockpit.launcherBarrel);
    updateOrrery(orrery, delta);

    const playerPosInOrrery = solarGroup.position.clone().negate();
    playerMarker.position.copy(playerPosInOrrery).multiplyScalar(orrery.group.scale.x);

    ui.update();
    renderer.render(scene, camera);
  });

  // Create the VR button and hide the overlay now that the scene is ready.
  document.body.appendChild(VRButton.createButton(renderer));
  overlay.classList.add('hidden');
}

main();
