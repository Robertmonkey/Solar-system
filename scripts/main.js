// scripts/main.js

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { createSolarSystem, updateSolarSystem } from './solarSystem.js';
import { createCockpit } from './lecternCockpit.js';
import { createUI } from './ui.js';
import { createControls as setupControls } from './controls.js';
import { createOrrery, updateOrrery, createPlayerMarker, LOG_POSITION_SCALE } from './orrery.js';
import { createProbes, launchProbe, updateProbes } from './probes.js';
import { initAudio } from './audio.js';
import { setTimeMultiplier, AU_KM, KM_TO_WORLD_UNITS, MAX_FLIGHT_SPEED } from './constants.js';

function createProceduralStarfield(radius) {
    const starCount = 15000;
    const positions = [];
    const colors = [];
    const starColor = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
        const x = THREE.MathUtils.randFloatSpread(2);
        const y = THREE.MathUtils.randFloatSpread(2);
        const z = THREE.MathUtils.randFloatSpread(2);
        const d = 1 / Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2));
        positions.push(x * d * radius, y * d * radius, z * d * radius);

        if (Math.random() > 0.97) {
            starColor.setRGB(1.0, 0.9, 0.7);
        } else {
            starColor.setRGB(0.8, 0.9, 1.0);
        }
        colors.push(starColor.r, starColor.g, starColor.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        sizeAttenuation: false,
    });

    const stars = new THREE.Points(geometry, material);
    return stars;
}


function startExperience(assets) {
  const overlay = document.getElementById('overlay');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005);
  
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1e16);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.style.backgroundImage = 'none';
  renderer.clock = new THREE.Clock();
  
  const player = new THREE.Group();
  scene.add(player);
  player.add(camera);

  // NEW: Add a light source back to the scene, parented to the player.
  // This will illuminate the cockpit, hands, and launcher, which use
  // MeshStandardMaterial, fixing the issue where they appeared black.
  // A HemisphereLight provides soft, ambient-like light without harsh shadows.
  const cockpitLight = new THREE.HemisphereLight(
      0xffffff, // sky color
      0x888888, // ground color
      2.0       // intensity
  );
  player.add(cockpitLight);

  const starfield = createProceduralStarfield(camera.far * 0.9);
  scene.add(starfield);

  const { solarGroup, bodies } = createSolarSystem(assets.textures);
  solarGroup.position.x = -AU_KM * KM_TO_WORLD_UNITS;
  scene.add(solarGroup);

  const cockpit = createCockpit();
  player.add(cockpit.group);

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
  solarGroup.add(probes.group);
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
  renderer.xr.addEventListener('sessionstart', () => { controls = setupControls(renderer, player, cockpit, ui, () => {
      player.updateWorldMatrix(true, false);
      solarGroup.updateWorldMatrix(true, false);

      const muzzlePos = cockpit.launcherMuzzle.getWorldPosition(new THREE.Vector3());
      const launchPos = solarGroup.worldToLocal(muzzlePos);

      const launchDir = new THREE.Vector3();
      cockpit.launcherMuzzle.getWorldDirection(launchDir);
      const inverseSolarRotation = solarGroup.getWorldQuaternion(new THREE.Quaternion()).invert();
      const launchDirLocal = launchDir.clone().applyQuaternion(inverseSolarRotation);

      launchProbe(probes, launchPos, launchDirLocal, probeSettings.mass, probeSettings.velocity);
      audio.playBeep();
  }); });
  renderer.xr.addEventListener('sessionend', () => { controls = { update: () => ({ rotationDelta: new THREE.Quaternion(), throttle: 0 }) }; });

  function getSolarSystemRelativePosition(bodyObject, solarGroup) {
      const position = new THREE.Vector3();
      let current = bodyObject.group;
      while (current && current !== solarGroup) {
          position.add(current.position);
          current = current.parent;
      }
      return position;
  }
  
  function handleWarpSelect(body) {
    if (!body) return;
    const bodySolarSystemPos = getSolarSystemRelativePosition(body, solarGroup);
    const scaledRadius = body.group.userData.radius || 1;
    const safeDistance = scaledRadius * 2.5 + 50000;
    const offset = new THREE.Vector3(0, scaledRadius * 0.2, safeDistance);
    const desiredPlayerPos = bodySolarSystemPos.clone().add(offset);
    solarGroup.position.copy(desiredPlayerPos).negate();
    player.lookAt(bodySolarSystemPos);
    shipQuaternion.copy(player.quaternion);
    audio.playWarp();
    ui.setSelectedIndex(bodies.findIndex(b => b.data.name === body.data.name));
    const fact = (body.data.facts || [])[0];
    if (fact) audio.speak(fact);
  }

  let shipQuaternion = new THREE.Quaternion();
  renderer.setAnimationLoop(() => {
    const delta = renderer.clock.getDelta();
    const xrCamera = renderer.xr.getCamera();
    
    starfield.rotation.y += delta * 0.002;

    const { rotationDelta, throttle } = controls.update(delta);
    
    shipQuaternion.premultiply(rotationDelta);
    player.quaternion.copy(shipQuaternion);
    
    const power = Math.pow(throttle, 3);
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
    const playerPosInSolarSystem = playerWorldPos.clone().sub(solarGroup.position);

    const playerDist = playerPosInSolarSystem.length();
    // MODIFIED: Use natural log to match the orrery's new scaling function.
    const logPlayerDist = Math.log(playerDist + 1);
    const playerMarkerPos = playerPosInSolarSystem.normalize().multiplyScalar(logPlayerDist * LOG_POSITION_SCALE);
    playerMarker.position.copy(playerMarkerPos).multiplyScalar(orrery.group.scale.x);
    
    ui.update();
    renderer.render(scene, camera);
  });
  
  const vrButtonOptions = {
    optionalFeatures: ['hand-tracking']
  };
  document.body.appendChild(VRButton.createButton(renderer, vrButtonOptions));
  overlay.classList.add('hidden');
}

// ... (init function is unchanged)
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
        uranus: 'textures/uranus.jpg', neptune: 'textures/neptune.jpg', moon: 'textures/moon.jpg',
        stars: 'textures/stars_milky_way.jpg' 
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
