/*
 * main.js (Refactored)
 *
 * Entry point for the VR solar system experience. This version introduces:
 * - Improved scene lighting with ambient and directional sources.
 * - XR session initialization that requests 'hand-tracking' and 'local-floor'.
 * - Point lights attached to the cockpit to illuminate the UI panels.
 * - A refined animation loop that updates all new systems.
 * - A more realistic starfield using THREE.Points.
 */

import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { createSolarSystem, updateSolarSystem } from './solarSystem.js';
import { createCockpit } from './cockpit.js';
import { createUI } from './ui.js';
import { setupControls } from './controls.js';
import { launchProbe, updateProbes } from './probes.js';
import { initAudio } from './audio.js';
import { KM_PER_WORLD_UNIT, C_KMPS, MPH_TO_KMPS } from './constants.js';

// Simulation timing: how many Earth days elapse per real second.
const DAYS_PER_SECOND = 10.0;

/**
 * Converts a speed fraction (0–1 from the throttle/slider) to world units per second.
 * The mapping is exponential, ranging from 1 mph to the speed of light.
 * @param {number} f - The speed fraction from 0.0 to 1.0.
 * @returns {number} The corresponding speed in world units per second.
 */
function speedFractionToWorldUnitsPerSec(f) {
  const minKmps = MPH_TO_KMPS; // ~1 mph
  const maxKmps = C_KMPS;     // Speed of light
  // Exponential mapping from f [0,1] to speed [minKmps, maxKmps]
  const kmps = minKmps * Math.pow(maxKmps / minKmps, f);
  // Convert km/s to world units/s
  return kmps / KM_PER_WORLD_UNIT;
}

async function init() {
  // === Renderer Setup ===
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = true;
  renderer.shadowMap.enabled = true; // Enable shadows for more depth
  document.body.appendChild(renderer.domElement);

  // === WebXR Session Initialization ===
  // Request optional features like hand-tracking for a richer experience.
  const sessionInit = {
    optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
  };
  document.body.appendChild(VRButton.createButton(renderer, sessionInit));

  // Handle XR availability messages
  const overlay = document.getElementById('overlay');
  const xrMessage = document.getElementById('xr-message');
  if ('xr' in navigator) {
    navigator.xr.isSessionSupported('immersive-vr').then(supported => {
      if (supported) {
        overlay.classList.add('hidden');
      } else {
        xrMessage.textContent = 'VR NOT SUPPORTED';
      }
    }).catch(() => {
      xrMessage.textContent = 'VR NOT ALLOWED';
    });
  } else {
    xrMessage.textContent = window.isSecureContext ? 'WEBXR NOT AVAILABLE' : 'WEBXR NEEDS HTTPS';
  }

  // === Scene, Camera, and Lighting ===
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005); // Deep space blue/black

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 10000);
  // The camera's base position. In VR, the headset's pose will override this.
  // We place it at average eye height.
  camera.position.set(0, 1.6, 0);

  // Add a base level of light to the entire scene
  const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
  scene.add(ambientLight);

  // A bright, distant light source to simulate the Sun's light
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
  sunLight.position.set(500, 500, 500);
  sunLight.castShadow = true;
  scene.add(sunLight);

  // === Starfield ===
  const starVertices = [];
  for (let i = 0; i < 10000; i++) {
    const x = THREE.MathUtils.randFloatSpread(4000);
    const y = THREE.MathUtils.randFloatSpread(4000);
    const z = THREE.MathUtils.randFloatSpread(4000);
    starVertices.push(x, y, z);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, sizeAttenuation: true });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);


  // === Solar System Creation ===
  const { group: solarGroup, bodies } = await createSolarSystem(scene);
  scene.add(solarGroup);

  // === Cockpit Creation ===
  const cockpit = createCockpit();
  // IMPORTANT: The camera is inside the cockpit, so add the cockpit to the camera's parent (the scene).
  // Do NOT add the cockpit as a child of the camera.
  scene.add(cockpit.group);

  // Add point lights above each UI panel for readability
  cockpit.panels.forEach(panel => {
    const light = new THREE.PointLight(0xffffff, 0.5, 2);
    // Position the light slightly above and in front of the panel
    panel.getWorldPosition(light.position);
    light.position.y += 0.3;
    cockpit.group.add(light);
  });

  // === Audio System ===
  const audio = await initAudio(camera);

  // === UI System ===
  const ui = createUI(
    cockpit.panels,
    (bodyIndex) => { // onWarpSelect
      warpToBody(bodyIndex);
      if (audio) audio.playWarp();
    },
    (newSpeedFraction) => { /* onSpeedChange is handled by the control system */ },
    () => { // onLaunchProbe
      const aimDirection = new THREE.Vector3();
      cockpit.cannon.getWorldDirection(aimDirection);
      const launchPosition = new THREE.Vector3();
      cockpit.cannon.getWorldPosition(launchPosition);
      
      launchProbe(launchPosition, aimDirection, ui.probeLaunchSpeed, ui.probeMass, scene);
      if (audio) audio.playBeep(); // Placeholder for a launch sound
    }
  );

  // === Control System ===
  const controls = setupControls(renderer, scene, cockpit, ui, audio);

  // === Simulation State ===
  let lastFrameTime = performance.now();
  let simulationTimeDays = 0;

  // Warp function repositions the solar system relative to the ship.
  function warpToBody(bodyIndex) {
      const targetBody = bodies[bodyIndex];
      // Ensure orbital positions are current before warping
      updateSolarSystem(bodies, simulationTimeDays);
      
      const bodyWorldPos = new THREE.Vector3();
      targetBody.group.getWorldPosition(bodyWorldPos);
      
      // Desired position: 50 world units in front of the cockpit
      const offset = new THREE.Vector3(0, 0, -50);
      const warpTargetPos = cockpit.group.localToWorld(offset);
      
      const delta = new THREE.Vector3().subVectors(warpTargetPos, bodyWorldPos);
      solarGroup.position.add(delta);
  }

  // Handle window resizing
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // === Animation Loop ===
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = (now - lastFrameTime) / 1000; // delta time in seconds
    lastFrameTime = now;

    // 1. Update Simulation Time
    simulationTimeDays += dt * DAYS_PER_SECOND * ui.timeScale;
    updateSolarSystem(bodies, simulationTimeDays);

    // 2. Update Ship Movement
    const travelSpeed = speedFractionToWorldUnitsPerSec(ui.speedFraction);
    if (travelSpeed > 0) {
      const forward = new THREE.Vector3(0, 0, -1);
      // Get the cockpit's world direction
      cockpit.group.getWorldQuaternion(forward.applyQuaternion.bind(forward));
      const displacement = forward.multiplyScalar(travelSpeed * dt);
      // Move the solar system *opposite* to the ship's travel
      solarGroup.position.sub(displacement);
    }
    
    // 3. Update Probes
    updateProbes(dt, bodies, solarGroup.position);

    // 4. Update Controls
    controls.update();

    // 5. Update UI
    const bodyPositions = bodies.map(b => {
      const pos = new THREE.Vector3();
      b.group.getWorldPosition(pos);
      return pos;
    });
    // Find the closest body to the ship for the info panel
    let closestBodyIndex = -1;
    let minDistanceSq = Infinity;
    const shipPos = new THREE.Vector3(); // Assumes ship is at world origin
    bodyPositions.forEach((pos, i) => {
        const distSq = pos.distanceToSquared(shipPos);
        if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            closestBodyIndex = i;
        }
    });

    ui.update(bodyPositions, closestBodyIndex);

    // 6. Render Scene
    renderer.render(scene, camera);
  });
}

init().catch(console.error);
