/*
 * main.js
 *
 * Entry point for the VR solar system experience.  This script
 * constructs the Three.js scene, loads the solar system bodies,
 * builds the cockpit, UI and controllers, and starts the animation
 * loop.  The user can warp to different planets, view a simplified
 * solar system map, adjust travel speed and launch probes.  The
 * scene is rendered using WebXR for VR devices, but it also works
 * as a flat WebGL application when viewed on a desktop.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/webxr/VRButton.js';
import { createSolarSystem, updateSolarSystem } from './solarSystem.js';
import { createCockpit } from './cockpit.js';
import { createUI } from './ui.js';
import { setupControls } from './controls.js';
import { launchProbe, updateProbes } from './probes.js';
import { initAudio } from './audio.js';

// Constants for simulation timing
const DAYS_PER_SECOND = 0.5; // how many Earth days elapse per real second

// Convert speed fraction (0–1) to world units per second.  We map
// exponentially between 0.1 km/s and c (299792 km/s) and then
// convert to world units (1 world unit = 1e6 km).
function speedFractionToWorldUnitsPerSec(f) {
  const minKmps = 0.1;
  const maxKmps = 299792.458; // c
  const kmps = minKmps * Math.pow(maxKmps / minKmps, f);
  return kmps / 1e6; // convert km/s to world units/s
}

async function init() {
  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000010);
  // Camera
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 5000);
  camera.position.set(0, 1.6, 0);
  scene.add(camera);

  // Lighting – ambient plus a directional light to highlight the cockpit
  const ambient = new THREE.AmbientLight(0x404040);
  scene.add(ambient);
  const sunLight = new THREE.DirectionalLight(0xffffff, 1);
  sunLight.position.set(10, 10, 10);
  scene.add(sunLight);

  // Starfield – fill the scene with small point lights for stars.
  function addStarfield() {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      // Uniformly distributed on a sphere radius 1000
      const r = 1000;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: false });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
  }
  addStarfield();

  // Load solar system bodies
  const { group: solarGroup, bodies } = await createSolarSystem(true);
  scene.add(solarGroup);

  // Build cockpit
  const cockpit = createCockpit();
  scene.add(cockpit.group);

  // UI
  // Set up callbacks for warp selection, speed changes and probe launches
  const ui = createUI(
    cockpit.panels,
    (newIndex) => {
      // Warp callback: reposition solarGroup so selected body is directly in front
      warpToBody(newIndex);
    },
    (newSpeedFraction) => {
      // speed changed: we simply update; world motion is handled in animation loop
    },
    () => {
      // Launch probe callback: use cockpit.group orientation to launch a probe
      launchProbe(cockpit.group, ui.speedFraction, 1e4, scene);
    }
  );

  // Audio
  const audio = await initAudio(camera);

  // Controls
  const controls = setupControls(renderer, scene, camera, cockpit, ui, audio);

  // Simulation state
  let startTime = performance.now();
  let lastFrame = performance.now();
  let simTimeDays = 0; // simulation time measured in Earth days
  let solarOffset = new THREE.Vector3(); // tracks translation of solar system for travel

  // Warp function: move the solarGroup so that the chosen body is
  // positioned a fixed distance in front of the cockpit.  We compute
  // the body’s current world position and subtract it from the
  // group’s position so that the body ends up at targetOffset.
  function warpToBody(bodyIndex) {
    const bodyObj = bodies[bodyIndex];
    // compute body world position at current simTime
    const elements = {
      a: bodyObj.data.a,
      e: bodyObj.data.e,
      i: bodyObj.data.inclination || 0,
      omega: bodyObj.data.lonAscNode || 0,
      w: bodyObj.data.argPeri || 0,
      M0: bodyObj.data.meanAnomalyEpoch || 0,
      period: bodyObj.data.period
    };
    // update to ensure group has correct planetary positions
    updateSolarSystem([bodyObj], simTimeDays);
    // world position relative to solarGroup
    const bodyPos = new THREE.Vector3();
    bodyObj.group.getWorldPosition(bodyPos);
    // The desired position in front of cockpit: 20 world units along -Z
    const target = new THREE.Vector3(0, 0, -20);
    // Transform target into world coordinates relative to cockpit
    target.applyMatrix4(cockpit.group.matrixWorld);
    // Determine translation needed
    const delta = new THREE.Vector3().subVectors(target, bodyPos);
    solarGroup.position.add(delta);
    // Reset probes (remove active) maybe; not implemented
    audio.playWarp && audio.playWarp();
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Animation loop
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dtMs = now - lastFrame;
    const dt = dtMs / 1000;
    lastFrame = now;
    // Advance simulation time for orbital motion
    simTimeDays += dt * DAYS_PER_SECOND;
    updateSolarSystem(bodies, simTimeDays);
    // Advance travel: move solarGroup opposite the cockpit forward vector
    const travelSpeed = speedFractionToWorldUnitsPerSec(ui.speedFraction);
    // Compute forward direction of cockpit in world coordinates
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(cockpit.group.getWorldQuaternion(new THREE.Quaternion()));
    const displacement = forward.multiplyScalar(travelSpeed * dt);
    // Move the solar system in the opposite direction of travel to simulate motion
    solarGroup.position.sub(displacement);
    // Update probes
    updateProbes(dt, bodies);
    // Update UI
    // Provide top-level body positions relative to origin for map
    const bodyPositions = bodies.map(obj => {
      const pos = new THREE.Vector3();
      obj.group.getWorldPosition(pos);
      return pos.clone();
    });
    ui.update(bodyPositions);
    // Update controllers visuals
    controls.update();
    // Render
    renderer.render(scene, camera);
  });
}

init().catch(err => {
  console.error(err);
});