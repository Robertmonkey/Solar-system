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
// Import controls with an alias matching the instructions
import { createControls as setupControls } from './controls.js';
import { createOrrery, updateOrrery, createPlayerMarker } from './orrery.js';
import { createProbes, launchProbe, updateProbes } from './probes.js';
import { initAudio } from './audio.js';
import { setTimeMultiplier, AU_KM, KM_TO_WORLD_UNITS } from './constants.js';


async function main() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000010);
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 50000);
  // Initial non-VR camera position is outside the cockpit
  camera.position.set(0, 1.6, 2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  // Attach the WebXR button using the default initialisation
  document.body.appendChild(VRButton.createButton(renderer));

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
  const ambient = new THREE.AmbientLight(0xaaaaaa, 0.5);
  scene.add(ambient);
  // The sun mesh itself will be emissive and provide primary light

  // Solar system
  const { solarGroup, bodies } = await createSolarSystem();
  // Start the player near Earth by default. 1 AU = ~150 world units.
  solarGroup.position.x = -AU_KM * KM_TO_WORLD_UNITS;
  scene.add(solarGroup);

  // Cockpit
  const cockpit = createCockpit();
  // Position the lectern cockpit directly in front of the player's origin.
  // The player's head in VR is at approx (0, 1.6, 0).
  cockpit.group.position.set(0, 0, -0.5);
  scene.add(cockpit.group);

  // Audio
  const audio = await initAudio(camera, cockpit.group);

  // Orrery: mount on the dedicated stand within the lectern cockpit.
  const orrery = createOrrery();
  // Scale down the orrery so it fits nicely on the stand.
  orrery.group.scale.setScalar(0.25);
  // Attach to the mount provided by the lectern cockpit.
  cockpit.orreryMount.add(orrery.group);
  orrery.group.position.set(0, 0.1, 0); // Position it on top of the stand

  // Orrery "You Are Here" marker
  const playerMarker = createPlayerMarker();
  orrery.group.add(playerMarker);


  // UI panels: radial warp menu, probe sliders and fun‑facts display.
  const probes = createProbes();
  scene.add(probes.group);
  let probeSettings = { mass: 0.5, velocity: 0.5 };
  // Set up UI with callbacks wired to the new behaviour
  const ui = createUI(bodies, {
    onWarp: index => handleWarpSelect(bodies[index]),
    onProbeChange: ({ mass, velocity }) => {
      probeSettings = { mass, velocity };
    },
    onTimeChange: value => {
      // Use an exponential scale for more control at lower speeds
      const multiplier = Math.pow(10, 5 * value) - 1 + value * 10;
      setTimeMultiplier(multiplier);
    },
    onNarrate: text => {
      audio.speak(text);
    }
  });
  // Position the panels around the desk.  Warp on the left, probe on the right,
  // facts in the centre front.  Rotate them slightly to face the user.
  ui.warpMesh.position.set(-0.6, 1.05, 0.4);
  ui.warpMesh.rotation.y = 0.45;
  ui.probeMesh.position.set(0.6, 1.05, 0.4);
  ui.probeMesh.rotation.y = -0.45;
  ui.factsMesh.position.set(0, 1.0, 0.6);
  // Add the UI panels to the cockpit.
  cockpit.group.add(ui.warpMesh);
  cockpit.group.add(ui.probeMesh);
  cockpit.group.add(ui.factsMesh);

  // Controls: connect hand tracking, grabbing and UI interaction.  When the
  // fire button is pressed we launch a probe using the current probe settings.
  const controls = setupControls(renderer, scene, camera, cockpit, ui, () => {
    // Compute muzzle position relative to cockpit to launch from.
    const muzzle = new THREE.Vector3(0, 1.0, 0.5); // Front of the desk
    cockpit.group.localToWorld(muzzle);
    const solarOrigin = solarGroup.getWorldPosition(new THREE.Vector3());
    const launchPos = muzzle.clone().sub(solarOrigin);
    // Direction based on camera orientation (shoot straight ahead).
    const forward = new THREE.Vector3(0, 0, -1);
    const dir = forward.applyQuaternion(camera.quaternion);
    // Launch the probe with customised mass/velocity.
    launchProbe(probes, launchPos, dir, probeSettings.mass, probeSettings.velocity);
    audio.playBeep();
  });

  // Warp so the selected body appears a short distance in front of the cockpit
  function handleWarpSelect(body) {
    if (!body) return;
    const bodyWorldPos = new THREE.Vector3();
    body.group.getWorldPosition(bodyWorldPos);

    // Calculate a safe arrival point just outside the body's radius
    const scaledRadius = body.group.userData.radius || 1;
    const safeDistance = scaledRadius * 4; // Arrive at 4x radius distance
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const desiredPlayerPos = bodyWorldPos.clone().addScaledVector(forward, -safeDistance);

    // The amount to shift the solar system is the difference between where
    // the player *should* be and where they currently are (which is 0,0,0).
    const shift = desiredPlayerPos.negate();
    solarGroup.position.copy(shift);

    audio.playWarp();
    // Also set the selected index in the UI so the facts panel updates
    ui.setSelectedIndex(bodies.findIndex(b => b.data.name === body.data.name));
    const fact = (body.data.facts || [])[0];
    if (fact) {
      audio.speak(fact);
    }
  }

  // Render loop.
  let lastTime = performance.now();
  renderer.setAnimationLoop(function () {
    const now = performance.now();
    const deltaSec = (now - lastTime) / 1000;
    lastTime = now;

    const movement = controls.update(deltaSec);
    if (movement) {
      solarGroup.position.sub(movement);
    }

    updateSolarSystem(solarGroup, deltaSec);
    updateProbes(probes, deltaSec, bodies);
    updateOrrery(orrery, deltaSec);

    // Update the "You Are Here" marker on the orrery
    // Its position is the inverse of the solar group's position, scaled down.
    const playerPosInOrrerySpace = solarGroup.position.clone().negate();
    playerMarker.position.copy(playerPosInOrrerySpace).multiplyScalar(orrery.group.scale.x);

    ui.update(camera);

    renderer.render(scene, camera);
  });
}

main();
