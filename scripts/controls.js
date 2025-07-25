// Hand-tracking controls implementing a direct "touch" interaction model.
// This version fixes a crash caused by an incorrect index when resetting
// control rotations.

import * as THREE from 'three';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { MAX_FLIGHT_SPEED } from './constants.js';

export function createControls(renderer, scene, cockpit, ui, fireCallback) {
  renderer.clock = new THREE.Clock();
  const handModelFactory = new XRHandModelFactory();

  let throttleValue = 0;
  let joystickX = 0;
  let joystickY = 0;

  const handStates = [
    { fingerTip: null, touching: null, touchPos: new THREE.Vector3() }, // Left hand
    { fingerTip: null, touching: null, touchPos: new THREE.Vector3() }  // Right hand
  ];
  
  const interactables = [
    { mesh: cockpit.throttle, name: 'throttle' },
    { mesh: cockpit.joystick, name: 'joystick' },
    { mesh: cockpit.fireButton, name: 'fireButton' },
    { mesh: ui.warpMesh, name: 'warp' },
    { mesh: ui.probeMesh, name: 'probe' },
    { mesh: ui.factsMesh, name: 'facts' }
  ];

  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    scene.add(controller);

    const hand = renderer.xr.getHand(i);
    hand.add(handModelFactory.createHandModel(hand, 'mesh'));
    scene.add(hand);

    const fingerTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.015),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    fingerTip.name = 'FingerTipCollider';
    hand.add(fingerTip);
    handStates[i].fingerTip = fingerTip;
  }

  function update(deltaTime) {
    let totalMovement = null;
    const camera = renderer.xr.getCamera();

    handStates.forEach((state, i) => {
      const hand = renderer.xr.getHand(i);
      const indexTipJoint = hand.joints['index-finger-tip'];
      if (!indexTipJoint) return;
      
      state.fingerTip.position.copy(indexTipJoint.position);
      const tipWorldPos = state.fingerTip.getWorldPosition(new THREE.Vector3());
      const tipBox = new THREE.Box3().setFromObject(state.fingerTip);
      let currentTouch = null;
      let closestDist = Infinity;

      for (const item of interactables) {
        const itemBox = new THREE.Box3().setFromObject(item.mesh);
        if (tipBox.intersectsBox(itemBox)) {
          const dist = tipWorldPos.distanceTo(item.mesh.getWorldPosition(new THREE.Vector3()));
          if (dist < closestDist) {
            closestDist = dist;
            currentTouch = item;
          }
        }
      }

      if (currentTouch) {
        if (state.touching?.name !== currentTouch.name) {
          if (currentTouch.name === 'fireButton') {
            cockpit.fireButton.scale.set(1, 0.5, 1);
            fireCallback();
          }
        }
        state.touching = currentTouch;
        state.touchPos.copy(tipWorldPos);
        ui.setHover(currentTouch.name, currentTouch.mesh.worldToLocal(tipWorldPos.clone()));
      } else {
        if (state.touching) {
          if (state.touching.name === 'fireButton') {
            cockpit.fireButton.scale.set(1, 1, 1);
          } else if (state.touching.name === 'warp') {
            ui.handleTap(state.touching.name, state.touching.mesh.worldToLocal(state.touchPos.clone()));
          }
        }
        state.touching = null;
        ui.setHover(null);
      }
      
      if (state.touching) {
        const localPos = state.touching.mesh.worldToLocal(tipWorldPos.clone());
        switch (state.touching.name) {
          case 'throttle':
            const tVal = THREE.MathUtils.mapLinear(localPos.z, 0.1, -0.1, 0, 1);
            throttleValue = THREE.MathUtils.clamp(tVal, 0, 1);
            cockpit.updateControlVisuals('throttle', localPos);
            break;
          case 'joystick':
            joystickX = THREE.MathUtils.clamp(localPos.x / 0.1, -1, 1);
            joystickY = THREE.MathUtils.clamp(localPos.z / 0.1, -1, 1);
            cockpit.updateControlVisuals('joystick', localPos);
            break;
          case 'probe':
          case 'facts':
            ui.handleTap(state.touching.name, localPos);
            break;
        }
      }
    });

    // Reset controls if not being touched
    if (!handStates.some(s => s.touching?.name === 'joystick')) {
      joystickX = 0; joystickY = 0;
      // --- FIX --- Corrected index from [1] to [0]
      cockpit.joystick.children[0].rotation.set(0, 0, 0);
    }
    if (!handStates.some(s => s.touching?.name === 'throttle')) {
      throttleValue = 0;
      // --- FIX --- Corrected index from [1] to [0]
      cockpit.throttle.children[0].rotation.set(0, 0, 0);
    }
    
    // Calculate flight movement
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
