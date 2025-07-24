// Hand-tracking controls implementing a direct "touch" interaction model.
// This system uses simple sphere colliders on the index fingertips to detect
// intersection with UI and cockpit controls, providing an intuitive,
// touchscreen-like experience.

import * as THREE from 'three';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { MAX_FLIGHT_SPEED } from './constants.js';

export function createControls(renderer, cockpit, ui, fireCallback) {
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
    const hand = renderer.xr.getHand(i);
    hand.add(handModelFactory.createHandModel(hand, 'mesh'));
    cockpit.group.add(hand); // Attach hands to the cockpit/player rig

    const fingerTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.015), // Small invisible sphere collider
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    fingerTip.name = 'FingerTipCollider';
    hand.add(fingerTip);
    handStates[i].fingerTip = fingerTip;
  }

  function update(deltaTime) {
    let totalMovement = null;

    handStates.forEach((state, i) => {
      const hand = renderer.xr.getHand(i);
      const indexTipJoint = hand.joints['index-finger-tip'];
      if (!indexTipJoint) return;

      // Position the collider at the fingertip
      state.fingerTip.position.copy(indexTipJoint.position);
      
      const tipWorldPos = state.fingerTip.getWorldPosition(new THREE.Vector3());
      const tipBox = new THREE.Box3().setFromObject(state.fingerTip);

      let currentTouch = null;
      let closestDist = Infinity;

      // Find the closest object the finger is touching
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

      // Handle touch state changes
      if (currentTouch) {
        if (state.touching?.name !== currentTouch.name) { // New touch started
          if (currentTouch.name === 'fireButton') {
            cockpit.fireButton.scale.set(1, 0.5, 1);
            fireCallback();
          }
        }
        state.touching = currentTouch;
        state.touchPos.copy(tipWorldPos);
        ui.setHover(currentTouch.name, currentTouch.mesh.worldToLocal(tipWorldPos.clone()));
      } else {
        if (state.touching) { // Touch ended
          if (state.touching.name === 'fireButton') {
            cockpit.fireButton.scale.set(1, 1, 1);
          } else if (state.touching.name === 'warp') {
            ui.handleTap(state.touching.name, state.touching.mesh.worldToLocal(state.touchPos.clone()));
          }
        }
        state.touching = null;
        ui.setHover(null);
      }
      
      // Update controls based on active touch
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
      joystickX = 0;
      joystickY = 0;
      cockpit.joystick.children[1].rotation.set(0, 0, 0);
    }
    if (!handStates.some(s => s.touching?.name === 'throttle')) {
      throttleValue = 0;
      cockpit.throttle.children[1].rotation.set(0, 0, 0);
    }
    
    // Calculate flight movement
    const power = Math.pow(throttleValue, 2);
    const speed = power * MAX_FLIGHT_SPEED;
    if (speed > 0 || joystickX !== 0 || joystickY !== 0) {
      const moveVec = new THREE.Vector3(joystickX, joystickY, 0);
      if (moveVec.lengthSq() > 1) moveVec.normalize();
      
      const camQuat = renderer.xr.getCamera().quaternion;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camQuat);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camQuat);
      
      const dir = new THREE.Vector3();
      dir.addScaledVector(right, moveVec.x);
      dir.addScaledVector(forward, -throttleValue); // Always move forward based on throttle
      dir.normalize();
      
      totalMovement = dir.multiplyScalar(speed * deltaTime);
    }

    return totalMovement;
  }

  return { update };
}
