// Hand‑tracking controls adapted for the lectern cockpit.  This version
// automatically grabs the throttle and joystick when touched, handles UI
// interactions on the new radial warp/probe/facts panels and triggers the
// fire callback when the fire button is pressed.

import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { MAX_FLIGHT_SPEED } from './constants.js';

/**
 * Create VR controls.  The renderer must have XR enabled.  Provide the
 * scene, camera, the lectern cockpit object (which exposes throttle,
 * joystick, fireButton and orreryMount), the UI (from ui.js) and a
 * callback for launching a probe.  The returned controller has an
 * update() function to be called each frame.
 */
export function createControls(renderer, scene, camera, cockpit, ui, fireCallback) {
  const controllerModelFactory = new XRControllerModelFactory();
  const handModelFactory = new XRHandModelFactory();
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
  // Interaction boxes computed from cockpit objects
  const throttleBox = new THREE.Box3().setFromObject(cockpit.throttle);
  const joystickBox = new THREE.Box3().setFromObject(cockpit.joystick);
  const fireButtonBox = new THREE.Box3().setFromObject(cockpit.fireButton);
  // Per‑hand state
  const grabState = [
    { grabbingThrottle: false, grabbingJoystick: false },
    { grabbingThrottle: false, grabbingJoystick: false }
  ];
  // Raycaster for UI
  const raycaster = new THREE.Raycaster();
  const uiMeshes = {
    warp: ui.warpMesh,
    probe: ui.probeMesh,
    facts: ui.factsMesh
  };
  const uiNames = ['warp', 'probe', 'facts'];
  let throttleValue = 0;
  let joystickX = 0;
  let joystickY = 0;
  const moveVec = new THREE.Vector3();
  function update(deltaTime) {
    throttleBox.setFromObject(cockpit.throttle);
    joystickBox.setFromObject(cockpit.joystick);
    fireButtonBox.setFromObject(cockpit.fireButton);
    hands.forEach((hand, i) => {
      const state = grabState[i];
      const indexTip = hand.joints && hand.joints['index-finger-tip'];
      if (!indexTip) return;
      const tipPos = new THREE.Vector3();
      indexTip.getWorldPosition(tipPos);
      // Grab throttle
      if (!state.grabbingThrottle && throttleBox.containsPoint(tipPos)) {
        state.grabbingThrottle = true;
        cockpit.startGrabbingThrottle(i, tipPos);
      } else if (state.grabbingThrottle && !throttleBox.containsPoint(tipPos)) {
        state.grabbingThrottle = false;
        cockpit.stopGrabbingThrottle(i);
        throttleValue = 0;
      }
      // Grab joystick
      if (!state.grabbingJoystick && joystickBox.containsPoint(tipPos)) {
        state.grabbingJoystick = true;
        cockpit.startGrabbingJoystick(i, tipPos);
      } else if (state.grabbingJoystick && !joystickBox.containsPoint(tipPos)) {
        state.grabbingJoystick = false;
        cockpit.stopGrabbingJoystick(i);
        joystickX = 0;
        joystickY = 0;
      }
      if (state.grabbingThrottle) {
        const local = cockpit.throttle.worldToLocal(tipPos.clone());
        const y = THREE.MathUtils.clamp(local.y, 0, 0.4);
        throttleValue = THREE.MathUtils.clamp(y / 0.4, 0, 1);
      }
      if (state.grabbingJoystick) {
        const local = cockpit.joystick.worldToLocal(tipPos.clone());
        const lx = THREE.MathUtils.clamp(local.x, -0.2, 0.2);
        const lz = THREE.MathUtils.clamp(local.z, -0.2, 0.2);
        joystickX = THREE.MathUtils.clamp(lx / 0.2, -1, 1);
        joystickY = THREE.MathUtils.clamp(lz / 0.2, -1, 1);
      }
      // Fire button
      if (fireButtonBox.containsPoint(tipPos)) {
        fireCallback();
      }
      // UI interaction: cast ray from fingertip along finger direction
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
        intersections.sort((a, b) => a.hit.distance - b.hit.distance);
        const { name, hit } = intersections[0];
        const uv = hit.uv;
        ui.handlePointer(name, uv);
      }
    });
    const speed = throttleValue * MAX_FLIGHT_SPEED;
    const dir = new THREE.Vector3(joystickX, 0, -joystickY);
    if (dir.lengthSq() > 1) dir.normalize();
    dir.applyQuaternion(camera.quaternion);
    moveVec.copy(dir).multiplyScalar(speed * deltaTime);
    return moveVec;
  }
  return { update };
}
