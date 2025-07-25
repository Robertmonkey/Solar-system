// Hand and cockpit input controller for Solar System VR.
//
// This module has been updated to improve WebXR compatibility.  It now
// uses articulated mesh hand models loaded from the WebXR Input Profiles CDN.
// These models are detailed and animate based on the user's real hand poses.

import * as THREE from 'three';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { MAX_FLIGHT_SPEED } from './constants.js';

export function createControls(renderer, scene, camera, cockpit, ui, fireCallback) {
  const handModelFactory = new XRHandModelFactory();
  // No need to set path unless you’re self-hosting hand models.
  // handModelFactory.setPath('./models/hands/');

  const hands = [renderer.xr.getHand(0), renderer.xr.getHand(1)];
  hands.forEach(hand => {
    // Use detailed articulated hand meshes
    hand.add(handModelFactory.createHandModel(hand, 'mesh'));
    scene.add(hand);
  });

  const interactableMeshes = [
    cockpit.throttle, cockpit.joystick, cockpit.fireButton,
    ui.warpMesh, ui.probeMesh, ui.factsMesh
  ];
  // --- FIX: Assign names to the UI panel meshes for easier identification. ---
  ui.warpMesh.name = "WarpPanel";
  ui.probeMesh.name = "ProbePanel";
  ui.factsMesh.name = "FactsPanel";

  const interactableBoxes = interactableMeshes.map(() => new THREE.Box3());

  let throttleValue = 0;
  let joystickX = 0;
  let joystickY = 0;

  // --- FIX: Reworked state tracking to detect a "tap" (first frame of touch). ---
  // This prevents buttons from firing on every single frame.
  const prevTouchState = [ { name: null }, { name: null } ];

  function update(deltaTime, xrCamera) {
    interactableMeshes.forEach((mesh, i) => interactableBoxes[i].setFromObject(mesh));

    const activeCamera = (xrCamera && xrCamera.isArrayCamera) ? xrCamera : camera;

    hands.forEach((hand, handIndex) => {
      const indexTip = hand.joints && hand.joints['index-finger-tip'];
      if (!indexTip || !indexTip.getWorldPosition) return;

      const tipPos = new THREE.Vector3();
      indexTip.getWorldPosition(tipPos);

      let currentTouch = null;
      let closestDist = Infinity;
      interactableMeshes.forEach((mesh, meshIndex) => {
        if (interactableBoxes[meshIndex].containsPoint(tipPos)) {
          const dist = tipPos.distanceTo(mesh.position);
          if (dist < closestDist) {
            closestDist = dist;
            currentTouch = { name: mesh.name, mesh: mesh };
          }
        }
      });
      
      const state = prevTouchState[handIndex];
      const justTapped = currentTouch && (currentTouch.name !== state.name);

      if (currentTouch) {
        state.name = currentTouch.name;
        const localPos = currentTouch.mesh.worldToLocal(tipPos.clone());

        switch (currentTouch.name) {
          case 'Throttle': {
            const tVal = THREE.MathUtils.mapLinear(localPos.z, 0.15, -0.15, 0, 1);
            throttleValue = THREE.MathUtils.clamp(tVal, 0, 1);
            cockpit.updateControlVisuals('throttle', localPos);
            break;
          }
          case 'Joystick': {
            joystickX = THREE.MathUtils.clamp(localPos.x / 0.1, -1, 1);
            joystickY = THREE.MathUtils.clamp(localPos.z / 0.1, -1, 1);
            cockpit.updateControlVisuals('joystick', localPos);
            break;
          }
          case 'FireButton': {
            if (justTapped) {
              fireCallback();
            }
            break;
          }
          case 'WarpPanel':
          case 'ProbePanel':
          case 'FactsPanel': {
            ui.handleTap(currentTouch.name.replace('Panel', '').toLowerCase(), localPos, justTapped);
            break;
          }
        }
      } else {
        state.name = null;
      }
    });
    
    // Check if any hand is touching the controls.
    const isTouchingThrottle = prevTouchState.some(s => s.name === 'Throttle');
    const isTouchingJoystick = prevTouchState.some(s => s.name === 'Joystick');

    if (!isTouchingThrottle) {
      throttleValue = 0;
      cockpit.updateControlVisuals('throttle', new THREE.Vector3(0, 0, 0.15)); // Reset to 0 position
    }
    if (!isTouchingJoystick) {
      joystickX = 0;
      joystickY = 0;
      cockpit.updateControlVisuals('joystick', new THREE.Vector3(0, 0, 0));
    }

    const power = Math.pow(throttleValue, 2);
    const speed = power * MAX_FLIGHT_SPEED;
    if (speed > 0 || joystickX !== 0 || joystickY !== 0) {
      const moveVec = new THREE.Vector3(joystickX, 0, -joystickY);
      if (moveVec.lengthSq() > 1) moveVec.normalize();
      moveVec.applyQuaternion(activeCamera.quaternion);
      return moveVec.multiplyScalar(speed * deltaTime);
    }

    return null;
  }

  return { update };
}
