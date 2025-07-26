import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { createSolarSystem, updateSolarSystem } from './solarSystem.js';
import { createCockpit } from './lecternCockpit.js';
import { createUI } from './ui.js';
import { createControls as setupControls } from './controls.js';
import { createOrrery, updateOrrery, createPlayerMarker } from './orrery.js';
import { createProbes, launchProbe, updateProbes } from './probes.js';
import { initAudio } from './audio.js';
import { setTimeMultiplier, AU_KM, KM_TO_WORLD_UNITS, MAX_FLIGHT_SPEED } from './constants.js';

function startExperience(assets) {
  const overlay = document.getElementById('overlay');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005);
  scene.add(new THREE.AmbientLight(0x888888));
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 50000);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.style.backgroundImage = 'none';
  renderer.clock = new THREE.Clock();
  
  const player = new THREE.Group();
  scene.add(player);
  player.add(camera);

  const { solarGroup, bodies } = createSolarSystem(assets.textures);
  solarGroup.position.x = -AU_KM * KM_TO_WORLD_UNITS;
  scene.add(solarGroup);

  // --- FIX: Decouple cockpit from player rotation to stabilize hand controls ---
  const cockpit = createCockpit();
  scene.add(cockpit.group);

  let audio = { playWarp: () => {}, playBeep: () => {}, speak: () => {} };
  try {
    audio = initAudio(camera, assets.sounds);
  } catch (error) {
    console.error("Failed to initialize audio:", error);
  }

  const orreryPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 1.2, 32),
    cockpit.deskMaterial
  );
  orreryPillar.position.set(0, 0.6, -2);
  cockpit.group.add(orreryPillar);

  const orrery = createOrrery();
  orrery.group.scale.setScalar(0.1);
  orrery.group.position.set(0, 1.3, -2);
  cockpit.group.add(orrery.group);
  const playerMarker = createPlayerMarker();
  orrery.group.add(playerMarker);
  
  const probes = createProbes();
  // --- FIX: Add probes to the scene root and manage position manually ---
  scene.add(probes.group);
  let probeSettings = { mass: 0.5, velocity: 0.5 };

  const ui = createUI(bodies, {
    onWarp: index => handleWarpSelect(bodies[index]),
    onProbeChange: (settings) => { probeSettings = settings; },
    onTimeChange: value => { const m = Math.pow(100, 5 * value); setTimeMultiplier(m); },
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

  let controls = { update: () => ({ rotationDelta: new THREE.Quaternion(), throttle: 0 }) };
  renderer.xr.addEventListener('sessionstart', () => { controls = setupControls(renderer, scene, camera, cockpit, ui, () => {
      // --- FIX: Restore original probe launch coordinate calculation ---
      const muzzlePos = cockpit.launcherMuzzle.getWorldPosition(new THREE.Vector3());
      const solarOrigin = solarGroup.getWorldPosition(new THREE.Vector3());
      const launchPos = muzzlePos.clone().sub(solarOrigin);

      const launchDir = new THREE.Vector3();
      cockpit.launcherMuzzle.getWorldDirection(launchDir);

      launchProbe(probes, launchPos, launchDir, probeSettings.mass, probeSettings.velocity);
      audio.playBeep();
  }); });
  renderer.xr.addEventListener('sessionend', () => { controls = { update: () => ({ rotationDelta: new THREE.Quaternion(), throttle: 0 }) }; });
  
  function handleWarpSelect(body) {
    if (!body) return;
    const bodyWorldPos = new THREE.Vector3();
    body.group.getWorldPosition(bodyWorldPos);
    const scaledRadius = body.group.userData.radius || 1;
    const safeDistance = scaledRadius * 2.5;
    
    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
    const desiredPlayerPos = bodyWorldPos.clone().addScaledVector(camForward, -safeDistance);
    const shift = desiredPlayerPos.negate();
    solarGroup.position.copy(shift);
    audio.playWarp();
    ui.setSelectedIndex(bodies.findIndex(b => b.data.name === body.data.name));
    const fact = (body.data.facts || [])[0];
    if (fact) audio.speak(fact);
  }

  let shipQuaternion = new THREE.Quaternion();
  renderer.setAnimationLoop(() => {
    const delta = renderer.clock.getDelta();
    const xrCamera = renderer.xr.getCamera();
    
    const { rotationDelta, throttle } = controls.update(delta);
    
    shipQuaternion.premultiply(rotationDelta);
    player.quaternion.copy(shipQuaternion);
    
    const power = Math.pow(throttle, 2);
    const speed = power * MAX_FLIGHT_SPEED;
    if (speed > 0) {
        const moveDirection = new THREE.Vector3(0, 0, -1);
        moveDirection.applyQuaternion(shipQuaternion);
        const movement = moveDirection.multiplyScalar(speed * delta);
        solarGroup.position.sub(movement);
    }
    
    updateSolarSystem(solarGroup, delta, xrCamera);
    updateProbes(probes, delta, solarGroup, bodies, cockpit.launcherBarrel);
    updateOrrery(orrery, delta);

    const playerWorldPos = player.getWorldPosition(new THREE.Vector3());
    const solarOrigin = solarGroup.getWorldPosition(new THREE.Vector3());
    const playerPosInSolarSystem = playerWorldPos.clone().sub(solarOrigin);
    playerMarker.position.copy(playerPosInSolarSystem).multiplyScalar(orrery.group.scale.x);
    
    ui.update();
    renderer.render(scene, camera);
  });
  
  const vrButtonOptions = {
    optionalFeatures: ['hand-tracking']
  };
  document.body.appendChild(VRButton.createButton(renderer, vrButtonOptions));
  overlay.classList.add('hidden');
}

function init() {
    const loadingManager = new THREE.LoadingManager();
    const xrMessage = document.getElementById('xr-message');
    xrMessage.textContent = 'LOADING ASSETS... 0%';

    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        const progress = Math.round((itemsLoaded / itemsTotal) * 100);
        xrMessage.textContent = `LOADING ASSETS... ${progress}%`;
    };

    loadingManager.onError = (url) => {
        xrMessage.textContent = `Error loading assets. Please refresh the page.`;
        console.error(`Error loading ${url}`);
    };

    const loadedAssets = { textures: {}, sounds: {} };
    loadingManager.onLoad = () => {
        startExperience(loadedAssets);
    };

    const textureLoader = new THREE.TextureLoader(loadingManager);
    const audioLoader = new THREE.AudioLoader(loadingManager);
    
    const texturesToLoad = {
        sun: 'textures/sun.jpg', mercury: 'textures/mercury.jpg', venus: 'textures/venus_surface.jpg',
        earth: 'textures/earth_daymap.jpg', mars: 'textures/mars.jpg', jupiter: 'textures/jupiter.jpg',
        saturn: 'textures/saturn.jpg', saturnRing: 'textures/saturn_ring_alpha.png',
        uranus: 'textures/uranus.jpg', neptune: 'textures/neptune.jpg', moon: 'textures/moon.jpg'
    };
    const soundsToLoad = {
        warp: './sounds/warp.mp3', beep: './sounds/beep.mp3', ambience: './sounds/ambience.mp3'
    };

    for (const name in texturesToLoad) {
        textureLoader.load(texturesToLoad[name], (texture) => {
            loadedAssets.textures[name] = texture;
        });
    }
    for (const name in soundsToLoad) {
        audioLoader.load(soundsToLoad[name], (buffer) => {
            loadedAssets.sounds[name] = buffer;
        });
    }
}

init();
