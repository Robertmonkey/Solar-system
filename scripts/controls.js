/*
 * controls.js
 *
 * This module sets up WebXR controllers and basic input handling for
 * interacting with the cockpit UI.  It uses Three.js’s XR API to
 * obtain the controller poses and a Raycaster to detect intersections
 * with the UI panels.  When the user presses the primary trigger on
 * either controller a pointer event is sent to the UI system.  The
 * throttle and joystick visuals in the cockpit are animated based on
 * the UI’s speed state, but they are otherwise non‑interactive.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';
import { XRControllerModelFactory } from 'https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/webxr/XRControllerModelFactory.js';

/**
 * Set up XR controllers and pointer interactions.  This function
 * registers controllers with the scene and attaches a visible ray
 * (line) to each to aid pointing.  When the trigger is pressed the
 * intersection with the cockpit panels is computed and passed to
 * ui.handlePointer().  The joystick and throttle visuals are also
 * updated based on the UI’s speed fraction.
 *
 * @param {THREE.WebGLRenderer} renderer Three.js renderer with XR enabled
 * @param {THREE.Scene} scene main scene
 * @param {THREE.Camera} camera main camera
 * @param {Object} cockpit object returned from createCockpit() { throttle, joystick, panels }
 * @param {Object} ui UI controller returned from createUI()
 * @param {function():void} onLaunchProbe callback for launching probes
 */
export function setupControls(renderer, scene, camera, cockpit, ui, onLaunchProbe) {
  const raycaster = new THREE.Raycaster();
  const workingMatrix = new THREE.Matrix4();
  const pointerColor = new THREE.Color(0xffaa00);

  // Create controller models and event handlers
  const controllerModelFactory = new XRControllerModelFactory();

  function setupController(idx) {
    const controller = renderer.xr.getController(idx);
    controller.userData.selectPressed = false;
    // Add a small line to represent the pointer ray
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: pointerColor, linewidth: 2 }));
    line.name = 'pointer';
    line.scale.z = 5; // length of pointer in metres
    controller.add(line);
    scene.add(controller);

    // Add controller model (hand)
    const grip = renderer.xr.getControllerGrip(idx);
    grip.add(controllerModelFactory.createControllerModel(grip));
    scene.add(grip);

    // Event listeners
    controller.addEventListener('selectstart', (event) => {
      controller.userData.selectPressed = true;
      // On select start treat as a click (for simplicity).  We'll cast a ray and send to UI.
      workingMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(workingMatrix);
      // Intersect with UI panels
      const intersects = raycaster.intersectObjects(cockpit.panels);
      if (intersects.length > 0) {
        const hit = intersects[0];
        // Determine which panel was hit
        const panelIndex = cockpit.panels.indexOf(hit.object);
        if (panelIndex !== -1) {
          ui.handlePointer(panelIndex, hit.uv);
        }
      } else {
        // If not hitting UI, maybe the throttle or joystick or probe button?  For
        // now treat as launch probe if pointing near the launch button.  The
        // UI code already calls onLaunchProbe() when appropriate via handlePointer.
      }
    });
    controller.addEventListener('selectend', () => {
      controller.userData.selectPressed = false;
    });
    return controller;
  }

  // Set up both controllers
  const controller1 = setupController(0);
  const controller2 = setupController(1);

  // Update function to adjust throttle and joystick visuals.  Called
  // from the animation loop.
  function update() {
    // Tilt the throttle arm based on speed fraction (0 → upright, 1 → fully forward)
    const throttlePivot = cockpit.throttle;
    if (throttlePivot) {
      const maxAngle = Math.PI / 3; // 60° range
      throttlePivot.rotation.x = -ui.speedFraction * maxAngle;
    }
    // Tilt the joystick based on slight head rotation for demonstration.  In
    // a real implementation the joystick would control ship rotation.
    const joystickPivot = cockpit.joystick;
    if (joystickPivot) {
      // For now set to neutral.  Could be tied to orientation or controllers.
      joystickPivot.rotation.x = 0;
      joystickPivot.rotation.z = 0;
    }
  }

  return { controller1, controller2, update };
}