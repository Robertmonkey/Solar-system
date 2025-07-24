// Entry point for the Solar System simulator. This file assembles all of
// the subsystems: solar system, cockpit, UI, controls, probes and orrery.
// It configures the renderer for VR, handles warping and updates the
// simulation each frame.

import * as THREE from 'three';
import { createSolarSystem, updateSolarSystem } from './solarSystem.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { createCockpit } from './cockpit.js';
import { createUI } from './ui.js';
import { createControls } from './controls.js';
import { createOrrery, updateOrrery } from './orrery.js';
import { launchProbe, updateProbes } from './probes.js';
import { initAudio } from './audio.js';
import { createShip } from './ship.js';

// Utility to convert seconds into Earth days. One day is 86 400 seconds.
const SEC_TO_DAYS = 1 / 86400;
const TIME_SCALE = 86400; // simulate one day per real second

// Main async function to set up the scene
async function main() {
  // Create basic Three.js scene and renderer.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000010);
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  // Add the standard VRButton for entering immersive mode
  const sessionInit = { optionalFeatures: ['hand-tracking'] };
  document.body.appendChild(VRButton.createButton(renderer, sessionInit));

  // --- Corrected WebXR Availability Logic ---
  const overlay = document.getElementById('overlay');
  const xrMessage = document.getElementById('xr-message');

  function showOverlayMessage(message) {
    xrMessage.textContent = message;
    overlay.classList.remove('hidden');
  }

  if ('xr' in navigator) {
    if (window.isSecureContext) {
      navigator.xr.isSessionSupported('immersive-vr').then(supported => {
        if (!supported) {
          showOverlayMessage('VR NOT SUPPORTED');
        } else {
          overlay.classList.add('hidden');
        }
      }).catch(() => {
        showOverlayMessage('VR NOT ALLOWED');
      });
    } else {
      showOverlayMessage('WEBXR NEEDS HTTPS');
    }
  } else {
    showOverlayMessage('WEBXR NOT AVAILABLE');
  }

  // Add some ambient and directional light to shade the bodies.
  const ambient = new THREE.AmbientLight(0x888888);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  // Build the solar system and attach it to the scene.
  const { solarGroup, bodies } = createSolarSystem();
  scene.add(solarGroup);

  // Build cockpit and attach to scene.
  const cockpit = createCockpit();
  cockpit.root.position.set(0, -0.2, -1.0);
  scene.add(cockpit.root);

  // Visual spaceship model attached to cockpit
  const shipMesh = createShip();
  shipMesh.position.set(0, 0, -1.5);
  cockpit.root.add(shipMesh);
  
  // Initialize audio system
  const audio = await initAudio(camera, cockpit.root);

  // Create the orrery and attach it to the cockpit.
  const orrery = createOrrery(bodies);
  orrery.group.position.set(0, -0.2, 0.5);
  cockpit.root.add(orrery.group);

  // Create the UI panels and attach them to the cockpit.
  const ui = createUI(bodies, {
    onWarp: warpToBody,
    onToggleLabels: enabled => { showLabels = enabled; },
    onToggleAutopilot: enabled => { autopilotEnabled = enabled; },
    onNarrate: fact => audio.speak(fact) // Use audio module for narration
  });
  ui.leftMesh.position.set(-0.9, 0.2, 0.4);
  ui.rightMesh.position.set(0.9, 0.2, 0.4);
  ui.bottomMesh.position.set(0, -0.5, 0.7);
  cockpit.root.add(ui.leftMesh);
  cockpit.root.add(ui.rightMesh);
  cockpit.root.add(ui.bottomMesh);

  // Create hand controls.
  const controls = createControls(renderer, scene, camera, cockpit, ui, () => {
    const muzzle = new THREE.Vector3(0, -0.3, 0.6);
    cockpit.root.localToWorld(muzzle);
    const solarOrigin = solarGroup.getWorldPosition(new THREE.Vector3());
    const launchPos = muzzle.clone().sub(solarOrigin);
    const forward = new THREE.Vector3(0, 0, -1);
    const dir = forward.applyQuaternion(camera.quaternion);
    launchProbe(launchPos, dir, scene);
    audio.playBeep();
  });

  // Flags controlling optional behaviours
  let showLabels = true;
  let autopilotEnabled = false;

  const shipVelocity = new THREE.Vector3();
  const MAX_SPEED = 0.5; // world units per second
  const ROT_SPEED = Math.PI / 4; // radians per second

  // Hide/show the overlay on session start/end.
  renderer.xr.addEventListener('sessionstart', () => {
    if (overlay) overlay.style.display = 'none';
    audio.playWarp();
  });
  renderer.xr.addEventListener('sessionend', () => {
    if (overlay) overlay.style.display = '';
  });

  // Warp to the given body index.
  function warpToBody(index) {
    const target = bodies[index];
    if (!target) return;
    const targetWorld = new THREE.Vector3();
    target.group.getWorldPosition(targetWorld);
    const origin = solarGroup.getWorldPosition(new THREE.Vector3());
    const offset = targetWorld.clone().sub(origin);
    solarGroup.position.sub(offset);
    audio.playWarp();
  }

  // Animation loop.
  let lastTime = performance.now();
  renderer.setAnimationLoop(function () {
    const now = performance.now();
    const deltaSec = (now - lastTime) / 1000;
    lastTime = now;
    const deltaDays = deltaSec * SEC_TO_DAYS * TIME_SCALE;

    updateSolarSystem(deltaDays);
    updateProbes(deltaSec, solarGroup, bodies, scene);
    const cameraPos = new THREE.Vector3();
    camera.getWorldPosition(cameraPos);
    updateOrrery(orrery, solarGroup, cameraPos);
    controls.update(deltaSec);

    // Ship movement based on cockpit controls
    const speed = cockpit.throttleValue * MAX_SPEED;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    solarGroup.position.addScaledVector(forward, speed * deltaSec);
    const joy = cockpit.joystickValue;
    solarGroup.rotation.y -= joy.x * ROT_SPEED * deltaSec;
    solarGroup.rotation.x -= joy.y * ROT_SPEED * deltaSec;
    for (let i = 0; i < 2; i++) {
      const hand = renderer.xr.getHand(i);
      const indexTip = hand && hand.joints && hand.joints['index-finger-tip'];
      if (indexTip) {
        const tipPos = new THREE.Vector3();
        indexTip.getWorldPosition(tipPos);
        cockpit.updateGrab(i, tipPos);
      }
    }
    if (autopilotEnabled) {
      // TODO: implement autopilot steering
    }
    renderer.render(scene, camera);
  });
}

// Start the application
main();
