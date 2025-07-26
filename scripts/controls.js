// A stable, professional control system based on the official Three.js
// XRHandModelFactory and a direct-touch interaction model.

import * as THREE from 'three';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { MAX_FLIGHT_SPEED } from './constants.js';

export function createControls(renderer, scene, camera, cockpit, ui, fireCallback) {
  renderer.clock = new THREE.Clock();

  const handModelFactory = new XRHandModelFactory().setPath(
    "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/models/hands/"
  );

  const hands = [renderer.xr.getHand(0), renderer.xr.getHand(1)];
  const touchStates = [ { touching: null }, { touching: null } ];

  hands.forEach(hand => {
    hand.add(handModelFactory.createHandModel(hand));
    scene.add(hand);
  });

  const interactables = [
    { mesh: cockpit.throttle, name: 'Throttle' },
    { mesh: cockpit.joystick, name: 'Joystick' },
    { mesh: cockpit.fireButton, name: 'FireButton' },
    { mesh: ui.warpMesh, name: 'WarpPanel' },
    { mesh: ui.probeMesh, name: 'ProbePanel' },
    { mesh: ui.factsMesh, name: 'FactsPanel' }
  ];
  const interactableBoxes = interactables.map(() => new THREE.Box3());

  let throttleValue = 0, joystickX = 0, joystickY = 0;

  function update(deltaTime, xrCamera) {
    interactables.forEach(item => item.mesh.updateWorldMatrix(true, false));
    
    interactables.forEach((item, i) => {
      interactableBoxes[i].setFromObject(item.mesh);
      if (item.name === 'FireButton' || item.name.endsWith('Panel')) {
        interactableBoxes[i].expandByScalar(0.02);
      } else {
        interactableBoxes[i].expandByScalar(0.01);
      }
    });

    const orientationCamera = (xrCamera && xrCamera.cameras && xrCamera.cameras.length > 0)
      ? xrCamera.cameras[0]
      : xrCamera;
    let activeCamera = orientationCamera || camera;

    let isTouchingAnyPanel = false;

    hands.forEach((hand, i) => {
      const state = touchStates[i];
      const wasTouching = state.touching;
      const indexTip = hand.joints['index-finger-tip'];

      if (!indexTip) {
        state.touching = null;
        return;
      }

      const tipPos = new THREE.Vector3();
      indexTip.getWorldPosition(tipPos);

      let currentTouchItem = null;
      interactables.forEach((item, j) => {
        if (interactableBoxes[j].containsPoint(tipPos)) {
          currentTouchItem = item;
        }
      });

      state.touching = currentTouchItem ? currentTouchItem.name : null;
      const isNewTouch = state.touching && state.touching !== wasTouching;

      if (currentTouchItem) {
        const localPos = currentTouchItem.mesh.worldToLocal(tipPos.clone());
        const panelName = currentTouchItem.name.includes('Panel') ? currentTouchItem.name.replace('Panel','').toLowerCase() : null;

        if (panelName) {
          isTouchingAnyPanel = true;
          ui.setHover(panelName, localPos);
        }

        switch (currentTouchItem.name) {
          case 'Throttle':
            throttleValue = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(localPos.z, 0.15, -0.15, 0, 1), 0, 1);
            cockpit.updateControlVisuals('throttle', localPos);
            break;
          case 'Joystick':
            joystickX = THREE.MathUtils.clamp(localPos.x / 0.1, -1, 1);
            joystickY = THREE.MathUtils.clamp(localPos.z / 0.1, -1, 1);
            cockpit.updateControlVisuals('joystick', localPos);
            break;
          case 'FireButton':
            if (isNewTouch) fireCallback();
            break;
          case 'ProbePanel':
             ui.handleTap(panelName, localPos);
             break;
          case 'WarpPanel':
          case 'FactsPanel':
             if (isNewTouch) {
                ui.handleTap(panelName, localPos);
             }
             break;
        }
      }
    });

    if (!isTouchingAnyPanel) {
      ui.setHover(null, null);
    }

    if (!touchStates.some(s => s.touching === 'Joystick')) {
      joystickX = 0;
      joystickY = 0;
      cockpit.updateControlVisuals('joystick', new THREE.Vector3(0,0,0));
    }

    const power = Math.pow(throttleValue, 2);
    const speed = power * MAX_FLIGHT_SPEED;
    
    let inputVec = new THREE.Vector3(joystickX, 0, joystickY);
    
    if (speed > 0 && inputVec.lengthSq() < 1e-6) {
      inputVec.set(0, 0, -1);
    }
    
    // --- FINAL FIX ---
    // The condition is now '&&' (AND). This requires both throttle to be engaged
    // AND a direction to be specified (either by joystick or the default forward).
    if (speed > 0 && inputVec.lengthSq() > 0) {
        // Normalize the direction vector to ensure consistent speed.
        if (inputVec.lengthSq() > 1) {
            inputVec.normalize();
        }

        const worldQuat = new THREE.Quaternion();
        activeCamera.getWorldQuaternion(worldQuat);
        inputVec.applyQuaternion(worldQuat);
        return inputVec.multiplyScalar(speed * deltaTime);
    }
    
    return null;
  }
  return { update };
}
