// This file has been rewritten to use a simpler, more stable structure
// for hand-tracking, based on the original working version. This should
// resolve the "black screen" issue when entering VR.

import * as THREE from 'three';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { MAX_FLIGHT_SPEED } from './constants.js';

export function createControls(renderer, scene, camera, cockpit, ui, fireCallback) {
  renderer.clock = new THREE.Clock();
  const handModelFactory = new XRHandModelFactory();

  const hands = [renderer.xr.getHand(0), renderer.xr.getHand(1)];
  hands.forEach(hand => {
    hand.add(handModelFactory.createHandModel(hand, 'mesh'));
    scene.add(hand);
  });
  
  const interactableMeshes = [
      cockpit.throttle, cockpit.joystick, cockpit.fireButton,
      ui.warpMesh, ui.probeMesh, ui.factsMesh
  ];
  const interactableBoxes = interactableMeshes.map(() => new THREE.Box3());

  let throttleValue = 0;
  let joystickX = 0;
  let joystickY = 0;
  
  // Keep track of which hand is touching which object
  const touchStates = [ { touching: null }, { touching: null }];

  function update(deltaTime, xrCamera) {
    // Update bounding boxes every frame as objects might move
    interactableMeshes.forEach((mesh, i) => interactableBoxes[i].setFromObject(mesh));

    let activeCamera = xrCamera.cameras.length > 0 ? xrCamera : camera;

    hands.forEach((hand, handIndex) => {
      const indexTip = hand.joints['index-finger-tip'];
      if (!indexTip) return;

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

      const state = touchStates[handIndex];
      if (currentTouch) {
        state.touching = currentTouch.name;
        const localPos = currentTouch.mesh.worldToLocal(tipPos.clone());
        
        switch (currentTouch.name) {
          case 'Throttle':
            const tVal = THREE.MathUtils.mapLinear(localPos.z, 0.15, -0.15, 0, 1);
            throttleValue = THREE.MathUtils.clamp(tVal, 0, 1);
            cockpit.updateControlVisuals('throttle', localPos);
            break;
          case 'Joystick':
            joystickX = THREE.MathUtils.clamp(localPos.x / 0.1, -1, 1);
            joystickY = THREE.MathUtils.clamp(localPos.z / 0.1, -1, 1);
            cockpit.updateControlVisuals('joystick', localPos);
            break;
          case 'FireButton':
            fireCallback();
            break;
          case 'WarpPanel':
          case 'ProbePanel':
          case 'FactsPanel':
            ui.handleTap(currentTouch.name.replace('Panel','').toLowerCase(), localPos);
            break;
        }
      } else {
        state.touching = null;
      }
    });

    // Reset controls if no hand is touching them
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
