import * as THREE from 'three';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { MAX_FLIGHT_SPEED } from './constants.js';

export function createControls(renderer, scene, camera, cockpit, ui, fireCallback) {
  renderer.clock = new THREE.Clock();
  
  const handModelFactory = new XRHandModelFactory().setPath(
    "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/models/hands/"
  );

  const hands = [renderer.xr.getHand(0), renderer.xr.getHand(1)];
  const touchStates = [ { touching: null }, { touching: null }];
  
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
    interactables.forEach((item, i) => interactableBoxes[i].setFromObject(item.mesh));

    // --- FIX: Use the XR camera for movement calculations ---
    const activeCamera = renderer.xr.isPresenting ? xrCamera : camera;

    hands.forEach((hand, i) => {
      const state = touchStates[i];
      const indexTip = hand.joints['index-finger-tip'];

      if (!indexTip) {
        if (state.touching) state.touching = null;
        return;
      }

      const tipPos = new THREE.Vector3();
      indexTip.getWorldPosition(tipPos);
      
      let currentTouch = null;
      
      interactables.forEach((item, j) => {
        if (interactableBoxes[j].containsPoint(tipPos)) {
          currentTouch = item;
        }
      });

      // Pass hover/touch state to the UI for visual feedback and actions
      if (currentTouch) {
        if (state.touching !== currentTouch.name && currentTouch.name === 'FireButton') {
          fireCallback();
        }
        state.touching = currentTouch.name;
        const localPos = currentTouch.mesh.worldToLocal(tipPos.clone());
        ui.handleTouch(currentTouch.name.replace('Panel','').toLowerCase(), localPos);

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
        }
      } else {
        if (state.touching) {
            ui.handleTouchEnd(state.touching.replace('Panel','').toLowerCase());
        }
        state.touching = null;
      }
    });

    if (!touchStates.some(s => s.touching === 'Throttle')) { throttleValue = 0; cockpit.updateControlVisuals('throttle', new THREE.Vector3(0,0,0)); }
    if (!touchStates.some(s => s.touching === 'Joystick')) { joystickX = 0; joystickY = 0; cockpit.updateControlVisuals('joystick', new THREE.Vector3(0,0,0)); }

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
