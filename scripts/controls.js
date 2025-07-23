// Hand-tracking controls for the Solar System simulator. This version
// automatically grabs the throttle and joystick when the user’s index finger
// touches them, without requiring the controller squeeze button. It also
// handles UI interaction and firing probes via the physical button on the
// cockpit.

import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

// Create controls. The renderer must have XR enabled. Provide the scene,
// camera, cockpit (which should expose throttle, joystick and fireButton
// meshes) and UI (from ui.js) as well as a fireCallback to launch probes.
export function createControls(renderer, scene, camera, cockpit, ui, fireCallback) {
  const controllerModelFactory = new XRControllerModelFactory();
  const handModelFactory = new XRHandModelFactory();

  // XR controllers for each hand. We attach rays to them for UI interaction.
  const controllers = [];
  const hands = [];

  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    scene.add(controller);
    controller.userData.index = i;
    controllers.push(controller);

    const controllerGrip = renderer.xr.getControllerGrip(i);
    controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
    scene.add(controllerGrip);

    const hand = renderer.xr.getHand(i);
    const handModel = handModelFactory.createHandModel(hand, 'mesh');
    hand.add(handModel);
    scene.add(hand);
    hand.userData.index = i;
    hands.push(hand);
  }

  // Boxes for interaction targets. We compute them in local space and update
  // them in world space every frame.
  const throttleBox = new THREE.Box3().setFromObject(cockpit.throttle);
  const joystickBox = new THREE.Box3().setFromObject(cockpit.joystick);
  const fireButtonBox = new THREE.Box3().setFromObject(cockpit.fireButton);

  // Per-hand state for grabbing
  const grabState = [
    { grabbingThrottle: false, grabbingJoystick: false },
    { grabbingThrottle: false, grabbingJoystick: false }
  ];

  // Raycaster for UI interaction
  const raycaster = new THREE.Raycaster();
  const uiMeshes = {
    left: ui.leftMesh,
    right: ui.rightMesh,
    bottom: ui.bottomMesh
  };
  const uiNames = ['left', 'right', 'bottom'];

  function update(deltaTime) {
    // Update bounding boxes to world space
    throttleBox.setFromObject(cockpit.throttle);
    joystickBox.setFromObject(cockpit.joystick);
    fireButtonBox.setFromObject(cockpit.fireButton);

    // For each hand, update grabbing and interactions
    hands.forEach((hand, i) => {
      const state = grabState[i];
      // Determine fingertip position. We look for the index finger tip joint.
      const indexTip = hand.joints && hand.joints['index-finger-tip'];
      if (!indexTip) return;
      const tipPos = new THREE.Vector3();
      indexTip.getWorldPosition(tipPos);

      // Auto‑grab throttle when touching
      if (!state.grabbingThrottle && throttleBox.containsPoint(tipPos)) {
        state.grabbingThrottle = true;
        cockpit.startGrabbingThrottle(i, tipPos);
      } else if (state.grabbingThrottle && !throttleBox.containsPoint(tipPos)) {
        state.grabbingThrottle = false;
        cockpit.stopGrabbingThrottle(i);
      }

      // Auto‑grab joystick when touching
      if (!state.grabbingJoystick && joystickBox.containsPoint(tipPos)) {
        state.grabbingJoystick = true;
        cockpit.startGrabbingJoystick(i, tipPos);
      } else if (state.grabbingJoystick && !joystickBox.containsPoint(tipPos)) {
        state.grabbingJoystick = false;
        cockpit.stopGrabbingJoystick(i);
      }

      // Fire button: if fingertip enters the button box, trigger fire.
      if (fireButtonBox.containsPoint(tipPos)) {
        fireCallback();
      }

      // UI interaction: cast a short ray from the fingertip forward along
      // the finger’s direction to detect intersections with UI panels.
      const direction = new THREE.Vector3();
      indexTip.getWorldDirection(direction);
      raycaster.set(tipPos, direction);
      const intersections = [];
      uiNames.forEach(name => {
        const mesh = uiMeshes[name];
        const hits = raycaster.intersectObject(mesh, false);
        if (hits.length) {
          intersections.push({ name, hit: hits[0] });
        }
      });
      if (intersections.length > 0) {
        // Choose the closest intersection
        intersections.sort((a, b) => a.hit.distance - b.hit.distance);
        const { name, hit } = intersections[0];
        // Compute UV coordinates on the panel
        const uv = hit.uv;
        ui.handlePointer(name, uv);
      }
    });
  }

  return {
    update
  };
}