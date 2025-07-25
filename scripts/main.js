// This file integrates the standalone orrery and correctly positions
// the smaller UI panels on the redesigned cockpit desk.

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
  
  if (navigator.xr) {
    const overlay = document.getElementById('overlay');
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
      if(supported) overlay.classList.add('hidden');
      else overlay.querySelector('#xr-message').textContent = 'VR NOT SUPPORTED';
    });
  }

  const { solarGroup, bodies } = await createSolarSystem();
  solarGroup.position.x = -AU_KM * KM_TO_WORLD_UNITS;
  scene.add(solarGroup);

  const cockpit = createCockpit();
  scene.add(cockpit.group);

  const audio = await initAudio(camera, cockpit.group);

  // --- FIX: Standalone Orrery on a pillar behind the player ---
  const orreryPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 1.2, 32),
    new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9, roughness: 0.5 })
  );
  orreryPillar.position.set(0, 0.6, -2); // Approx 6ft behind player
  scene.add(orreryPillar);
  const orrery = createOrrery();
  orrery.group.scale.setScalar(0.4); // Beach ball size
  orrery.group.position.set(0, 1.3, -2);
  scene.add(orrery.group);
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

  // --- FIX: Corrected UI Panel Layout, Scale, and Y-Position ---
  const deskSurfaceY = 1.04;
  const panelScale = { warp: 0.35, facts: 0.6, probe: 0.5 };
  
  ui.warpMesh.scale.setScalar(panelScale.warp);
  ui.factsMesh.scale.setScalar(panelScale.facts);
  ui.probeMesh.scale.setScalar(panelScale.probe);

  // Position panels so their bottom edge rests on the desk
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

  function handleWarpSelect(body) {
    if (!body) return;
    const bodyWorldPos = new THREE.Vector3();
    body.group.getWorldPosition(bodyWorldPos);
    const scaledRadius = body.group.userData.radius || 1;
    const safeDistance = scaledRadius * 4;
    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(renderer.xr.getCamera().quaternion);
    const desiredPlayerPos = bodyWorldPos.clone().addScaledVector(camForward, -safeDistance);
    const shift = desiredPlayerPos.negate();
    solarGroup.position.copy(shift);
    audio.playWarp();
    ui.setSelectedIndex(bodies.findIndex(b => b.data.name === body.data.name));
    const fact = (body.data.facts || [])[0];
    if (fact) audio.speak(fact);
  }

  renderer.setAnimationLoop(() => {
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
  });
}

main();
