// Hand and cockpit input controller for Solar System VR.
//
// This module has been updated to improve WebXR compatibility.  It now
// requests simple box primitives for the hand model (instead of
// network-loaded meshes) and correctly determines which camera to use during
// updates when running inside or outside of a VR session.

import * as THREE from 'three';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { MAX_FLIGHT_SPEED } from './constants.js';

export function createControls(renderer, scene, camera, cockpit, ui, fireCallback) {
  // No dedicated clock is assigned to the renderer.  The calling
  // application (main.js) manages its own THREE.Clock instance and
  // passes the elapsed time into the update function.
  const handModelFactory = new XRHandModelFactory();
  // If you decide to host your own hand models, set the path here.  The
  // default path used by XRHandModelFactory loads models from the
  // @webxr-input-profiles CDN, which may be blocked or unavailable on some
  // devices.  The 'boxes' profile used below does not require external
  // assets.
  // handModelFactory.setPath('./models/hands/');

  // Retrieve both hands from the XR manager.  These objects are only
  // meaningful once a VR session has started.
  const hands = [renderer.xr.getHand(0), renderer.xr.getHand(1)];
  hands.forEach(hand => {
    // Use the 'boxes' profile for maximum compatibility.  This renders a box
    // at each joint and does not rely on downloading glTF assets.
    hand.add(handModelFactory.createHandModel(hand, 'boxes'));
    scene.add(hand);
  });

  // Define which meshes in the cockpit and UI can be interacted with.  Each
  // corresponding Box3 is updated every frame to reflect the current
  // transform of the mesh.
  const interactableMeshes = [
    cockpit.throttle, cockpit.joystick, cockpit.fireButton,
    ui.warpMesh, ui.probeMesh, ui.factsMesh
  ];
  const interactableBoxes = interactableMeshes.map(() => new THREE.Box3());

  let throttleValue = 0;
  let joystickX = 0;
  let joystickY = 0;

  // Track which control (if any) each hand is currently touching
  const touchStates = [ { touching: null }, { touching: null } ];

  function update(deltaTime, xrCamera) {
    // Update bounding boxes each frame since meshes may move relative to
    // world coordinates (e.g. when the ship translates).
    interactableMeshes.forEach((mesh, i) => interactableBoxes[i].setFromObject(mesh));

    // Determine which camera to use for movement calculations.  When in
    // immersive VR, xrCamera will be an ArrayCamera; otherwise it will be
    // the normal perspective camera.  Check for the isArrayCamera flag to
    // avoid reading an undefined 'cameras' property.
    const activeCamera = (xrCamera && xrCamera.isArrayCamera) ? xrCamera : camera;

    hands.forEach((hand, handIndex) => {
      const indexTip = hand.joints && hand.joints['index-finger-tip'];
      if (!indexTip || !indexTip.getWorldPosition) return;
      const tipPos = new THREE.Vector3();
      indexTip.getWorldPosition(tipPos);

      let currentTouch = null;
      let closestDist = Infinity;
      // Find the closest interactable mesh that contains the fingertip
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
            fireCallback();
            break;
          }
          case 'WarpPanel':
          case 'ProbePanel':
          case 'FactsPanel': {
            // Strip 'Panel' and convert to lower-case for UI method naming
            ui.handleTap(currentTouch.name.replace('Panel', '').toLowerCase(), localPos);
            break;
          }
        }
      } else {
        state.touching = null;
      }
    });

    // Reset controls if no hand is touching them
    if (!touchStates.some(s => s.touching === 'Throttle')) {
      throttleValue = 0;
      cockpit.updateControlVisuals('throttle', new THREE.Vector3(0, 0, 0));
    }
    if (!touchStates.some(s => s.touching === 'Joystick')) {
      joystickX = 0;
      joystickY = 0;
      cockpit.updateControlVisuals('joystick', new THREE.Vector3(0, 0, 0));
    }

    // Calculate flight movement.  Use quadratic mapping for throttle to
    // provide fine control at low speeds.  Apply the movement vector
    // relative to the camera's orientation so that the ship moves in the
    // direction the user is looking.
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
