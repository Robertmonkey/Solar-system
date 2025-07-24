// Entry point for the Solar System simulator with lectern cockpit redesign.
// This file assembles all of the subsystems: solar system, cockpit, UI,
// controls, probes and orrery.  Compared to the previous implementation,
// it uses the new lectern cockpit with a standing platform, radial warp
// menu and probe sliders.  The orrery is mounted on a dedicated stand.

import * as THREE from 'three';
import { createSolarSystem, updateSolarSystem } from './solarSystem.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { createCockpit } from './lecternCockpit.js';
import { createUI } from './ui.js';
import { createControls } from './controls.js';
import { createOrrery, updateOrrery } from './orrery.js';
import { launchProbe, updateProbes } from './probes.js';
import { initAudio } from './audio.js';

// Utility to convert seconds into Earth days.
const SEC_TO_DAYS = 1 / 86400;
// Speed multiplier for orbital motion.
const TIME_SCALE = 50;

async function main() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000010);
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  const sessionInit = { optionalFeatures: ['hand-tracking'] };
  document.body.appendChild(VRButton.createButton(renderer, sessionInit));

  // XR status overlay handling (copied from original).
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

  // Lighting
  const ambient = new THREE.AmbientLight(0x888888);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  // Solar system
  const { solarGroup, bodies } = createSolarSystem();
  scene.add(solarGroup);

  // Cockpit
  const cockpit = createCockpit();
  // Position the lectern cockpit so the desk sits at waist height and at
  // comfortable reach in front of the player.  Adjust these values to suit
  // your own VR environment.
  cockpit.group.position.set(0, -0.8, -1.5);
  scene.add(cockpit.group);

  // Audio
  const audio = await initAudio(camera, cockpit.group);

  // Orrery: mount on the dedicated stand within the lectern cockpit.
  const orrery = createOrrery(bodies);
  // Scale down the orrery slightly so it fits nicely on the stand.
  orrery.group.scale.setScalar(0.8);
  // Attach to the mount provided by the lectern cockpit.
  cockpit.orreryMount.add(orrery.group);
  orrery.group.position.set(0, 0.05, 0);

  // UI panels: radial warp menu, probe sliders and fun‑facts display.
  let probeSettings = { mass: 0.5, velocity: 0.5 };
  const ui = createUI(bodies, {
    onWarp: index => warpToBody(index),
    onProbeChange: settings => {
      probeSettings = settings;
    },
    onNarrate: fact => audio.speak(fact)
  });
  // Position the panels around the desk.  Warp on the left, probe on the right,
  // facts in the centre front.  Rotate them slightly to face the user.
  ui.warpMesh.position.set(-0.9, 0.9, 1.2);
  ui.warpMesh.rotation.y = 0.3;
  ui.probeMesh.position.set(0.9, 0.9, 1.2);
  ui.probeMesh.rotation.y = -0.3;
  ui.factsMesh.position.set(0, 0.75, 1.4);
  // Add the UI panels to the cockpit.
  cockpit.group.add(ui.warpMesh);
  cockpit.group.add(ui.probeMesh);
  cockpit.group.add(ui.factsMesh);

  // Controls: connect hand tracking, grabbing and UI interaction.  When the
  // fire button is pressed we launch a probe using the current probe settings.
  const controls = createControls(renderer, scene, camera, cockpit, ui, () => {
    // Compute muzzle position relative to cockpit to launch from.
    const muzzle = new THREE.Vector3(0, 0.82, 1.05);
    cockpit.group.localToWorld(muzzle);
    const solarOrigin = solarGroup.getWorldPosition(new THREE.Vector3());
    const launchPos = muzzle.clone().sub(solarOrigin);
    // Direction based on camera orientation (shoot straight ahead).
    const forward = new THREE.Vector3(0, 0, -1);
    const dir = forward.applyQuaternion(camera.quaternion);
    // Launch the probe with customised mass/velocity.
    launchProbe(launchPos, dir, scene, probeSettings);
    audio.playBeep();
  });

  let showLabels = true;
  let autopilotEnabled = false;

  // Warp to the selected body.
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

  // Render loop.
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
    // Update grabbing for each hand
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
      // Autopilot logic can be added here.
    }
    renderer.render(scene, camera);
  });
}

main();
