// A robust, rewritten control system for hand-tracking and controllers.
// This version fixes the joystick logic to allow for full 2-axis movement.

import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { MAX_FLIGHT_SPEED } from './constants.js';

export function createControls(renderer, scene, cockpit, ui, fireCallback) {
  renderer.clock = new THREE.Clock();
  const controllerModelFactory = new XRControllerModel_Factory();
  const handModelFactory = new XRHandModelFactory();

  let throttleValue = 0, joystickX = 0, joystickY = 0;

  const handStates = [
    { controller: null, grip: null, hand: null, handModel: null, controllerModel: null, fingerTip: null, touching: null, touchPos: new THREE.Vector3() },
    { controller: null, grip: null, hand: null, handModel: null, controllerModel: null, fingerTip: null, touching: null, touchPos: new THREE.Vector3() }
  ];
  
  const interactables = [
    { mesh: cockpit.throttle, name: 'throttle' }, { mesh: cockpit.joystick, name: 'joystick' },
    { mesh: cockpit.fireButton, name: 'fireButton' }, { mesh: ui.warpMesh, name: 'warp' },
    { mesh: ui.probeMesh, name: 'probe' }, { mesh: ui.factsMesh, name: 'facts' }
  ];

  for (let i = 0; i < 2; i++) {
    const state = handStates[i];
    state.controller = renderer.xr.getController(i);
    scene.add(state.controller);

    state.grip = renderer.xr.getControllerGrip(i);
    state.controllerModel = controllerModelFactory.createControllerModel(state.grip);
    state.grip.add(state.controllerModel);
    scene.add(state.grip);
    
    state.hand = renderer.xr.getHand(i);
    state.handModel = handModelFactory.createHandModel(state.hand, 'mesh');
    state.hand.add(state.handModel);
    scene.add(state.hand);

    state.fingerTip = new THREE.Mesh( new THREE.SphereGeometry(0.015), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
    state.hand.add(state.fingerTip);

    state.controller.addEventListener('connected', (event) => {
        const hasHandTracking = event.data.profiles.includes('hand-tracking');
        state.grip.visible = !hasHandTracking;
        state.hand.visible = hasHandTracking;
    });
    state.controller.addEventListener('disconnected', () => {
        state.grip.visible = false;
        state.hand.visible = false;
    });
  }

  function update(deltaTime) {
    let totalMovement = null;
    const camera = renderer.xr.getCamera();

    handStates.forEach((state) => {
      let rayOrigin;
      if (state.hand.visible && state.hand.joints['index-finger-tip']) {
        state.fingerTip.position.copy(state.hand.joints['index-finger-tip'].position);
        rayOrigin = state.fingerTip.getWorldPosition(new THREE.Vector3());
      } else if (state.grip.visible) {
        rayOrigin = state.grip.getWorldPosition(new THREE.Vector3());
      } else {
        return;
      }
      
      const tipBox = new THREE.Box3().setFromCenterAndSize(rayOrigin, new THREE.Vector3(0.04, 0.04, 0.04));
      let currentTouch = null;
      let closestDist = Infinity;

      interactables.forEach(item => {
        const itemBox = new THREE.Box3().setFromObject(item.mesh);
        if (tipBox.intersectsBox(itemBox)) {
          const dist = rayOrigin.distanceTo(item.mesh.getWorldPosition(new THREE.Vector3()));
          if (dist < closestDist) { closestDist = dist; currentTouch = item; }
        }
      });
      
      if (currentTouch) {
        if (state.touching?.name !== currentTouch.name && currentTouch.name === 'fireButton') { cockpit.fireButton.scale.set(1, 0.5, 1); fireCallback(); }
        state.touching = currentTouch;
        state.touchPos.copy(rayOrigin);
        ui.setHover(currentTouch.name, currentTouch.mesh.worldToLocal(rayOrigin.clone()));
      } else {
        if (state.touching) {
            if (state.touching.name === 'fireButton') cockpit.fireButton.scale.set(1, 1, 1);
            else if (state.touching.name === 'warp') ui.handleTap(state.touching.name, state.touching.mesh.worldToLocal(state.touchPos.clone()));
        }
        state.touching = null; ui.setHover(null);
      }
      
      if (state.touching) {
        const localPos = state.touching.mesh.worldToLocal(rayOrigin.clone());
        switch (state.touching.name) {
          case 'throttle':
            const tVal = THREE.MathUtils.mapLinear(localPos.z, 0.15, -0.15, 0, 1);
            throttleValue = THREE.MathUtils.clamp(tVal, 0, 1);
            cockpit.updateControlVisuals('throttle', localPos);
            break;
          case 'joystick':
            joystickX = THREE.MathUtils.clamp(localPos.x / 0.1, -1, 1);
            // --- FIX: Joystick now reads from the Z-axis (forward/back) instead of Y (up/down) ---
            joystickY = THREE.MathUtils.clamp(localPos.z / 0.1, -1, 1);
            cockpit.updateControlVisuals('joystick', localPos);
            break;
          case 'probe': case 'facts':
            ui.handleTap(state.touching.name, localPos);
            break;
        }
      }
    });

    if (!handStates.some(s => s.touching?.name === 'joystick')) { joystickX = 0; joystickY = 0; cockpit.updateControlVisuals('joystick', new THREE.Vector3(0,0,0)); }
    if (!handStates.some(s => s.touching?.name === 'throttle')) { throttleValue = 0; cockpit.updateControlVisuals('throttle', new THREE.Vector3(0,0,0)); }
    
    const power = Math.pow(throttleValue, 2);
    const speed = power * MAX_FLIGHT_SPEED;
    if (speed > 0 || joystickX !== 0 || joystickY !== 0) {
        const moveVec = new THREE.Vector3(joystickX, 0, -joystickY);
        if (moveVec.lengthSq() > 1) moveVec.normalize();
        moveVec.applyQuaternion(camera.quaternion);
        totalMovement = moveVec.multiplyScalar(speed * deltaTime);
    }

    return totalMovement;
  }
  return { update };
}
