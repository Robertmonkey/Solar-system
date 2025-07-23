// Entry point for the Solar System simulator. This file assembles all of
// the subsystems: solar system, cockpit, UI, controls, probes and orrery.
// It configures the renderer for VR, handles warping and updates the
// simulation each frame.

import * as THREE from 'three';
import { createSolarSystem, updateSolarSystem, solarBodies } from './solarSystem.js';
import { createCockpit } from './cockpit.js';
import { createUI } from './ui.js';
import { createControls } from './controls.js';
import { createOrrery, updateOrrery } from './orrery.js';
import { launchProbe, updateProbes } from './probes.js';

// Utility to convert seconds into Earth days. One day is 86 400 seconds.
const SEC_TO_DAYS = 1 / 86400;

// Create basic Three.js scene and renderer. We set preserveDrawingBuffer so
// that the overlay can be displayed before entering VR. You may want to
// adjust antialias to suit your performance constraints.
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000010);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// Add some ambient and directional light to shade the bodies. Without
// lighting the lambert materials on the planets will appear black.
const ambient = new THREE.AmbientLight(0x888888);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// Build the solar system and attach it to the scene.
const { solarGroup, bodies } = createSolarSystem();
scene.add(solarGroup);

// Build cockpit and attach to scene. We position it relative to camera so
// that the UI and controls are within reach in VR.
const cockpit = createCockpit();
cockpit.root.position.set(0, -0.5, -1.0);
scene.add(cockpit.root);

// Create the orrery and attach it to the cockpit. The orrery group is
// positioned on the desk in front of the user. It does not interfere with
// the solar system but provides a miniature overview.
const orrery = createOrrery(bodies);
orrery.group.position.set(0, -0.2, 0.5);
cockpit.root.add(orrery.group);

// Create the UI panels and attach them to the cockpit. Position them on
// either side and below the main view. These positions may require
// adjustment depending on your cockpit geometry.
const ui = createUI(bodies, {
  onWarp: warpToBody,
  onToggleLabels: enabled => { showLabels = enabled; },
  onToggleAutopilot: enabled => { autopilotEnabled = enabled; },
  onNarrate: fact => narrateFact(fact)
});
ui.leftMesh.position.set(-0.9, 0.2, 0.4);
ui.rightMesh.position.set(0.9, 0.2, 0.4);
ui.bottomMesh.position.set(0, -0.5, 0.7);
cockpit.root.add(ui.leftMesh);
cockpit.root.add(ui.rightMesh);
cockpit.root.add(ui.bottomMesh);

// Create hand controls. These handle grabbing, UI interaction and firing.
const controls = createControls(renderer, scene, camera, cockpit, ui, () => {
  // Launch a probe from the cannon at the front of the cockpit. The
  // position is taken relative to the solar system so that the probe does
  // not inherit solarGroup offsets.
  const muzzle = new THREE.Vector3(0, -0.3, 0.6);
  cockpit.root.localToWorld(muzzle);
  // Subtract the solarGroup’s world position to convert to solar coords
  const solarOrigin = solarGroup.getWorldPosition(new THREE.Vector3());
  const launchPos = muzzle.clone().sub(solarOrigin);
  const forward = new THREE.Vector3(0, 0, -1);
  // Transform forward by camera orientation
  const dir = forward.applyQuaternion(camera.quaternion);
  launchProbe(launchPos, dir, scene);
});

// Flags controlling optional behaviours
let showLabels = true;
let autopilotEnabled = false;

// Hide the overlay when the XR session starts. Some browsers leave the
// overlay visible in VR until explicitly hidden. Conversely, show it when
// exiting VR so the user can click the Enter VR button again.
const overlay = document.getElementById('overlay');
renderer.xr.addEventListener('sessionstart', () => {
  if (overlay) overlay.style.display = 'none';
});
renderer.xr.addEventListener('sessionend', () => {
  if (overlay) overlay.style.display = '';
});

// Warp to the given body index. We move the entire solarGroup so that the
// selected body appears in front of the camera at a comfortable distance.
function warpToBody(index) {
  const target = bodies[index];
  if (!target) return;
  // Compute the world position of the target body
  const targetWorld = new THREE.Vector3();
  target.group.getWorldPosition(targetWorld);
  // Compute offset from the target to the origin of the solarGroup
  const origin = solarGroup.getWorldPosition(new THREE.Vector3());
  const offset = targetWorld.clone().sub(origin);
  // Move the solarGroup so that the target body moves to the origin
  solarGroup.position.sub(offset);
  // Optional: rotate the solarGroup so that the target is directly ahead
  // of the viewer. For simplicity we leave orientation unchanged.
}

// Narrate a fun fact using the Web Speech API. If unavailable, logs to
// console instead.
function narrateFact(fact) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(fact);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } else {
    console.log('Narrate:', fact);
  }
}

// Animation loop. Keeps track of elapsed time for orbital mechanics and
// updates all subsystems.
let lastTime = performance.now();
renderer.setAnimationLoop(function () {
  const now = performance.now();
  const deltaSec = (now - lastTime) / 1000;
  lastTime = now;
  const deltaDays = deltaSec * SEC_TO_DAYS;

  // Update solar system positions
  updateSolarSystem(deltaDays);
  // Update probes and remove any that collide with bodies
  updateProbes(deltaSec, solarGroup, bodies, scene);
  // Update the orrery to reflect current body positions and player location
  const cameraPos = new THREE.Vector3();
  camera.getWorldPosition(cameraPos);
  updateOrrery(orrery, solarGroup, cameraPos);
  // Update controls (hand tracking and UI interaction)
  controls.update(deltaSec);
  // Update cockpit control values based on current grabbing positions
  for (let i = 0; i < 2; i++) {
    const hand = renderer.xr.getHand(i);
    const indexTip = hand && hand.joints && hand.joints['index-finger-tip'];
    if (indexTip) {
      const tipPos = new THREE.Vector3();
      indexTip.getWorldPosition(tipPos);
      cockpit.updateGrab(i, tipPos);
    }
  }
  // If autopilot is enabled, automatically orient the spaceship toward the
  // selected body (not implemented here).
  if (autopilotEnabled) {
    // TODO: implement autopilot steering by reading cockpit.joystickValue
  }
  renderer.render(scene, camera);
});

// Allow the user to enter VR with a button on the page
document.getElementById('VRButton').addEventListener('click', () => {
  renderer.xr.requestSession('immersive-vr', { optionalFeatures: ['hand-tracking'] }).then(session => {
    renderer.xr.setSession(session);
  });
});