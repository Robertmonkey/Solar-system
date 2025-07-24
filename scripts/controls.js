// Hand‑tracking controls adapted for the lectern cockpit. This version uses
// gesture-based grabbing ('select' event) for the throttle and joystick, and
// 'select' for tapping UI panels, providing a more intuitive and robust
// interaction model than the previous proximity-based system.

import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { MAX_FLIGHT_SPEED, MPH_TO_KMPS } from './constants.js';

export function createControls(renderer, scene, camera, cockpit, ui, fireCallback) {
  const controllerModelFactory = new XRControllerModelFactory();
  const handModelFactory = new XRHandModelFactory().setPath('./models/hands/'); // Assuming models are served from a path

  let throttleValue = 0; // 0 to 1
  let joystickX = 0; // -1 to 1
  let joystickY = 0; // -1 to 1

  const hands = [];
  const handStates = [
    { isGrabbing: null, activeControl: null, hoverTarget: null }, // Left hand
    { isGrabbing: null, activeControl: null, hoverTarget: null }  // Right hand
  ];

  const interactableObjects = [cockpit.throttle, cockpit.joystick, cockpit.fireButton, ui.warpMesh, ui.probeMesh, ui.factsMesh];
  const raycaster = new THREE.Raycaster();

  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    scene.add(controller);
    hands.push(controller);

    const grip = renderer.xr.getControllerGrip(i);
    grip.add(controllerModelFactory.createControllerModel(grip));
    scene.add(grip);

    const hand = renderer.xr.getHand(i);
    hand.add(handModelFactory.createHandModel(hand, 'mesh'));
    scene.add(hand);

    controller.addEventListener('selectstart', onSelectStart);
    controller.addEventListener('selectend', onSelectEnd);
  }

  function onSelectStart(event) {
    const controller = event.target;
    const handIndex = hands.indexOf(controller);
    const state = handStates[handIndex];

    if (state.hoverTarget) {
      const targetName = state.hoverTarget.object.name;
      if (targetName === 'Throttle' || targetName === 'Joystick') {
        state.isGrabbing = true;
        state.activeControl = state.hoverTarget.object;
      } else if (targetName === 'FireButton') {
        cockpit.fireButton.scale.set(1, 0.5, 1);
        fireCallback();
      } else { // UI panel interaction
        const uv = state.hoverTarget.uv;
        if (ui.warpMesh === state.hoverTarget.object) {
          ui.handlePointer('warp', uv, true);
        } else if (ui.probeMesh === state.hoverTarget.object) {
          ui.handlePointer('probe', uv, true);
        } else if (ui.factsMesh === state.hoverTarget.object) {
          ui.handlePointer('facts', uv, true);
        }
      }
    }
  }

  function onSelectEnd(event) {
    const controller = event.target;
    const handIndex = hands.indexOf(controller);
    const state = handStates[handIndex];

    if (state.hoverTarget && state.hoverTarget.object.name === 'FireButton') {
        cockpit.fireButton.scale.set(1, 1, 1);
    }
    
    state.isGrabbing = false;
    state.activeControl = null;

    // Reset joystick/throttle when released
    if (state.hoverTarget && state.hoverTarget.object.name === 'Joystick') {
        joystickX = 0;
        joystickY = 0;
        cockpit.joystick.children[1].rotation.set(0,0,0); // Reset stick visual
    }
    if (state.hoverTarget && state.hoverTarget.object.name === 'Throttle') {
        throttleValue = 0;
        cockpit.throttle.children[1].rotation.set(0,0,0); // Reset lever visual
    }
  }

  function update(deltaTime) {
    let totalMovement = null;

    hands.forEach((controller, i) => {
      const state = handStates[i];
      const controllerMatrix = controller.matrixWorld;
      
      raycaster.setFromCamera({ x: 0, y: 0 }, { matrixWorld: controllerMatrix, projectionMatrix: camera.projectionMatrix });

      // Handle grabbing state
      if (state.isGrabbing && state.activeControl) {
        const handPos = new THREE.Vector3().setFromMatrixPosition(controllerMatrix);
        const control = state.activeControl.name === 'Throttle' ? cockpit.throttle : cockpit.joystick;
        const localPos = control.worldToLocal(handPos);
        
        cockpit.updateControlVisuals(control.name, localPos);

        if (control.name === 'Throttle') {
            const val = THREE.MathUtils.mapLinear(localPos.z, 0.1, -0.1, 0, 1);
            throttleValue = THREE.MathUtils.clamp(val, 0, 1);
        } else if (control.name === 'Joystick') {
            joystickX = THREE.MathUtils.clamp(localPos.x / 0.1, -1, 1);
            joystickY = THREE.MathUtils.clamp(localPos.z / 0.1, -1, 1);
        }

      } else { // Handle hovering
        const intersects = raycaster.intersectObjects(interactableObjects, true);
        const firstHit = intersects.length > 0 ? intersects[0] : null;

        // Clear previous hover state
        if (state.hoverTarget && (!firstHit || state.hoverTarget.object.uuid !== firstHit.object.uuid)) {
            const obj = state.hoverTarget.object;
            if (obj.material.emissive) {
                obj.material.emissive.setHex(obj.userData.originalEmissive || 0x000000);
            }
            state.hoverTarget = null;
            ui.handlePointer('clear', null);
        }
        
        // Set new hover state
        if (firstHit) {
            state.hoverTarget = firstHit;
            const obj = firstHit.object;
             if (obj.material.emissive && !obj.userData.originalEmissive) {
                obj.userData.originalEmissive = obj.material.emissive.getHex();
                obj.material.emissive.setHex(0xaaaaff);
            }
            if (ui.warpMesh === obj || ui.probeMesh === obj || ui.factsMesh === obj) {
                const panelName = ui.warpMesh === obj ? 'warp' : (ui.probeMesh === obj ? 'probe' : 'facts');
                ui.handlePointer(panelName, firstHit.uv, false);
            }
        }
      }
    });

    // Calculate flight movement based on control state
    const power = Math.pow(throttleValue, 2); // Exponential response
    const speed = power * MAX_FLIGHT_SPEED;
    if (speed > 0 || joystickX !== 0 || joystickY !== 0) {
        const moveVec = new THREE.Vector3(joystickX, 0, -joystickY);
        // Prevent moving faster diagonally
        if (moveVec.lengthSq() > 1) {
            moveVec.normalize();
        }
        moveVec.applyQuaternion(camera.quaternion);
        moveVec.multiplyScalar(speed * deltaTime);
        totalMovement = moveVec;
    }

    return totalMovement;
  }

  return { update };
}
