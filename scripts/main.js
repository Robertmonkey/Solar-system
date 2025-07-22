/*
 * main.js (Refactored & Corrected)
 *
 * Entry point for the VR solar system experience. This version introduces:
 * - A call to the new createDashboardCockpit for an ergonomic layout.
 * - Integration with the single-panel UI system.
 * - Slightly boosted lighting to complement the glowing dashboard.
 * - A critical fix in the animation loop to prevent an endless loading screen.
 */

import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { createSolarSystem, updateSolarSystem } from './solarSystem.js';
import { createDashboardCockpit } from './cockpit.js';
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
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // === WebXR Session Initialization ===
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
  scene.background = new THREE.Color(0x000005);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 10000);
  camera.position.set(0, 1.6, 0);

  const ambientLight = new THREE.AmbientLight(0x404060, 0.7);
  scene.add(ambientLight);

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
  const cockpit = createDashboardCockpit();
  scene.add(cockpit.group);

  // Add a point light to illuminate the controls.
  const controlLight = new THREE.PointLight(0xaabbee, 0.8, 5);
  controlLight.position.set(0, 2.0, -0.5);
  cockpit.group.add(controlLight);

  // === Audio System ===
  const audio = await initAudio(camera);

  // === UI System ===
  const ui = createUI(
    cockpit.dashboard,
    (bodyIndex) => { // onWarpSelect
      warpToBody(bodyIndex);
      if (audio) audio.playWarp();
    },
    (newSpeedFraction) => { /* onSpeedChange is handled by the control system */ },
    () => { // onLaunchProbe from UI button
        const aimDirection = new THREE.Vector3();
        cockpit.cannon.getWorldDirection(aimDirection);
        const launchPosition = new THREE.Vector3();
        cockpit.cannon.getWorldPosition(launchPosition);
        launchProbe(launchPosition, aimDirection, ui.probeLaunchSpeed, ui.probeMass, scene);
        if (audio) audio.playBeep();
    }
  );
  
  // === Control System ===
  const fireProbe = () => {
    const aimDirection = new THREE.Vector3();
    cockpit.cannon.getWorldDirection(aimDirection);
    const launchPosition = new THREE.Vector3();
    cockpit.cannon.getWorldPosition(launchPosition);
    launchProbe(launchPosition, aimDirection, ui.probeLaunchSpeed, ui.probeMass, scene);
    if (audio) audio.playBeep();
  };
  const controls = setupControls(renderer, scene, cockpit, ui, fireProbe);

  // === Simulation State ===
  let lastFrameTime = performance.now();
  let simulationTimeDays = 0;

  function warpToBody(bodyIndex) {
      const targetBody = bodies[bodyIndex];
      updateSolarSystem(bodies, simulationTimeDays);
      const bodyWorldPos = new THREE.Vector3();
      targetBody.group.getWorldPosition(bodyWorldPos);
      const offset = new THREE.Vector3(0, 0, -50);
      const warpTargetPos = cockpit.group.localToWorld(offset);
      const delta = new THREE.Vector3().subVectors(warpTargetPos, bodyWorldPos);
      solarGroup.position.add(delta);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // === Animation Loop ===
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    simulationTimeDays += dt * DAYS_PER_SECOND * ui.timeScale;
    updateSolarSystem(bodies, simulationTimeDays);

    const travelSpeed = speedFractionToWorldUnitsPerSec(ui.speedFraction);
    if (travelSpeed > 0) {
      // Get the cockpit's forward direction in world space
      const forward = new THREE.Vector3(0, 0, -1);
      const worldQuaternion = new THREE.Quaternion();
      // This is the corrected, standard way to get the world quaternion
      cockpit.group.getWorldQuaternion(worldQuaternion);
      forward.applyQuaternion(worldQuaternion);
      
      // Calculate the displacement for this frame
      const displacement = forward.multiplyScalar(travelSpeed * dt);
      
      // Move the solar system *opposite* to the ship's travel to simulate motion
      solarGroup.position.sub(displacement);
    }
    
    updateProbes(dt, bodies, solarGroup.position);
    controls.update(dt);

    const bodyPositions = bodies.map(b => {
      const pos = new THREE.Vector3();
      b.group.getWorldPosition(pos);
      return pos;
    });
    let closestBodyIndex = -1;
    let minDistanceSq = Infinity;
    const shipPos = new THREE.Vector3();
    bodyPositions.forEach((pos, i) => {
        const distSq = pos.distanceToSquared(shipPos);
        if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            closestBodyIndex = i;
        }
    });

    ui.update(bodyPositions, closestBodyIndex);
    renderer.render(scene, camera);
  });
}

init().catch(console.error);
