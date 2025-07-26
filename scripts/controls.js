// A rewritten, simplified, and more stable control system.
// This version focuses purely on hand-tracking to avoid initialization conflicts.

import * as THREE from 'three';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { MAX_FLIGHT_SPEED } from './constants.js';

export function createControls(renderer, scene, camera, cockpit, ui, fireCallback) {
  renderer.clock = new THREE.Clock();
  const handModelFactory = new XRHandModelFactory();

  // Setup for two hands
  const hands = [renderer.xr.getHand(0), renderer.xr.getHand(1)];
  const touchStates = [ { touching: null }, { touching: null }];
  
  hands.forEach(hand => {
    hand.add(handModelFactory.createHandModel(hand)); // The factory handles the animated model
    scene.add(hand);
  });
  
  // A single list of all interactable objects in the cockpit
  const interactables = [
    { mesh: cockpit.throttle, name: 'Throttle' },
    { mesh: cockpit.joystick, name: 'Joystick' },
    { mesh: cockpit.fireButton, name: 'FireButton' },
    { mesh: ui.warpMesh, name: 'WarpPanel' },
    { mesh: ui.probeMesh, name: 'ProbePanel' },
    { mesh: ui.factsMesh, name: 'FactsPanel' }
  ];
  // We'll update the bounding boxes for these objects each frame
  const interactableBoxes = interactables.map(() => new THREE.Box3());

  let throttleValue = 0;
  let joystickX = 0;
  let joystickY = 0;
  
  function update(deltaTime, xrCamera) {
    // Update the bounding box positions each frame
    interactables.forEach((item, i) => interactableBoxes[i].setFromObject(item.mesh));

    let activeCamera = xrCamera.cameras.length > 0 ? xrCamera : camera;

    hands.forEach((hand, i) => {
      const state = touchStates[i];
      const indexTip = hand.joints['index-finger-tip'];

      // If hand-tracking isn't active or ready, do nothing for this hand
      if (!indexTip) {
        // If this hand was touching something, reset its state
        if (state.touching) state.touching = null;
        return;
      }

      const tipPos = new THREE.Vector3();
      indexTip.getWorldPosition(tipPos);
      
      let currentTouch = null;
      
      // Check if the fingertip is inside any of the interactable boxes
      interactables.forEach((item, j) => {
        if (interactableBoxes[j].containsPoint(tipPos)) {
          currentTouch = item;
        }
      });

      if (currentTouch) {
        // Fire once on the initial touch
        if (state.touching !== currentTouch.name && currentTouch.name === 'FireButton') {
          fireCallback();
        }
        state.touching = currentTouch.name;
        
        const localPos = currentTouch.mesh.worldToLocal(tipPos.clone());
        
        // Handle continuous interaction (like sliders and joysticks)
        switch (currentTouch.name) {
          case 'Throttle':
            throttleValue = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(localPos.z, 0.15, -0.15, 0, 1), 0, 1);
            cockpit.updateControlVisuals('throttle', localPos);
            break;
          case 'Joystick':
            joystickX = THREE.MathUtils.clamp(localPos.x / 0.1, -1, 1);
            joystickY = THREE.MathUtils.clamp(localPos.z / 0.1, -1, 1);
            cockpit.updateControlVisuals('joystick', localPos);
            break;
          case 'WarpPanel': case 'ProbePanel': case 'FactsPanel':
            ui.handleTap(currentTouch.name.replace('Panel','').toLowerCase(), localPos);
            break;
        }
      } else {
        state.touching = null;
      }
    });

    // If neither hand is touching a control, reset it to zero
    if (!touchStates.some(s => s.touching === 'Throttle')) { throttleValue = 0; cockpit.updateControlVisuals('throttle', new THREE.Vector3(0,0,0)); }
    if (!touchStates.some(s => s.touching === 'Joystick')) { joystickX = 0; joystickY = 0; cockpit.updateControlVisuals('joystick', new THREE.Vector3(0,0,0)); }

    // Calculate flight movement
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
