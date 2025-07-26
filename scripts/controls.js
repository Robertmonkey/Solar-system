// A stable, professional control system based on the official Three.js
// XRHandModelFactory and a direct‑touch interaction model.

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
    // --- FIX: Force update world matrices for interactables before collision detection ---
    // This ensures bounding boxes are in the correct position for the current frame.
    interactables.forEach(item => item.mesh.updateWorldMatrix(true, false));
    // Update bounding boxes and slightly expand them to ease interactions.  A small margin is applied
    // to panels and the fire button so that tapping near the edges still counts as a hit.
    interactables.forEach((item, i) => {
      interactableBoxes[i].setFromObject(item.mesh);
      if (item.name === 'FireButton') {
        // Expand a bit more around the launch button
        interactableBoxes[i].expandByScalar(0.02);
      } else if (item.name.endsWith('Panel')) {
        // Expand panels a little to improve tap detection
        interactableBoxes[i].expandByScalar(0.02);
      } else {
        // Slightly grow throttle and joystick volumes for easier grabbing
        interactableBoxes[i].expandByScalar(0.01);
      }
    });

    // When running in WebXR, xrCamera is an ArrayCamera with child cameras.
    // Use the first child camera's quaternion for movement direction; otherwise
    // fall back to the provided camera.  Relying on xrCamera.quaternion alone can
    // yield an identity orientation on some platforms, causing the movement vector
    // to always remain in world space (and appear to not move).  Selecting the first
    // sub‑camera's quaternion ensures we rotate the movement vector with the user's
    // head orientation.
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
            if (isNewTouch) {
              fireCallback();
              // --- FIX: Add button press animation ---
              cockpit.fireButton.position.y = 1.045;
              cockpit.fireButton.material.emissive.setHex(0xff2222);
            }
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
    
    // --- FIX: Reset fire button visuals when not touched ---
    if (!touchStates.some(s => s.touching === 'FireButton')) {
        cockpit.fireButton.position.y = 1.055; // Original Y position from lecternCockpit.js
        cockpit.fireButton.material.emissive.setHex(0x550000); // Original emissive color
    }

    // Only recenter the joystick when it is not being touched.  The throttle now retains
    // its last value instead of snapping back to zero each frame.  This makes it behave
    // more like a real spacecraft throttle that stays where the pilot leaves it.
    if (!touchStates.some(s => s.touching === 'Joystick')) {
      joystickX = 0;
      joystickY = 0;
      cockpit.updateControlVisuals('joystick', new THREE.Vector3(0,0,0));
    }

    // --- FIX: Changed throttle curve from exponential to linear for more responsive control ---
    const power = throttleValue;
    const speed = power * MAX_FLIGHT_SPEED;
    // Build a movement vector based on joystick deflection.  If the joystick is
    // centred (zero length) but the throttle is engaged, we still want to move
    // forward relative to the viewer.  In that case we default to a unit
    // vector pointing down the negative Z axis (camera forward in local space).
    let inputVec = new THREE.Vector3(joystickX, 0, joystickY);
    // Normalise if the joystick deflection is greater than one unit.  Without
    // this the ship would move faster diagonally when both axes are near their
    // extremes.
    if (inputVec.lengthSq() > 1) {
      inputVec.normalize();
    }
    // If throttle is open but the joystick is centred, push forward.  Use
    // -Z because local negative Z corresponds to forward on the cockpit.
    if (speed > 0 && inputVec.lengthSq() < 1e-6) {
      inputVec.set(0, 0, -1);
    }
    // Only move if there is some speed or joystick input.  Otherwise return
    // null to indicate no movement and avoid subtracting an undefined vector.
    if (speed > 0 || inputVec.lengthSq() > 0) {
      // Rotate the input vector into world space using the orientation of the
      // underlying camera.  Use getWorldQuaternion() rather than relying on
      // .quaternion directly on ArrayCamera, which can be an identity when
      // running in WebXR.  Falling back to the provided camera ensures we
      // always derive a valid orientation.
      const worldQuat = new THREE.Quaternion();
      if (orientationCamera && typeof orientationCamera.getWorldQuaternion === 'function') {
        orientationCamera.getWorldQuaternion(worldQuat);
      } else {
        worldQuat.copy(orientationCamera.quaternion || new THREE.Quaternion());
      }
      inputVec.applyQuaternion(worldQuat);
      // Multiply by the desired speed and elapsed time to get the movement
      // delta.  Note: The returned vector will be subtracted from the solar
      // system position to move the universe relative to the pilot.
      return inputVec.multiplyScalar(speed * deltaTime);
    }
    return null;
  }
  return { update };
}
