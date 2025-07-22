/*
 * controls.js (modified)
 *
 * Sets up WebXR controllers, hand models and input handling for interacting
 * with the cockpit UI.  In addition to the original pointer‑ray based
 * interaction, this version adds fully rendered VR hands via
 * XRHandModelFactory, pinch detection on the index finger for UI
 * selection, and grabbing mechanics using the squeeze gesture for
 * operating the throttle and joystick.  It also recognises a physical
 * fire button on the desk and launches probes when the button is
 * pressed either by raycast selection or pinch selection.  The
 * throttle controls the ship’s speed directly by writing to
 * ui.speedFraction.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';
import { XRControllerModelFactory } from 'https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/webxr/XRHandModelFactory.js';
import { launchProbe } from './probes.js';

/**
 * Set up XR controllers, hands and pointer interactions.  This function
 * registers controllers and hands with the scene and attaches visible
 * rays or pinch detection to aid pointing.  When the trigger or pinch
 * gesture is activated the intersection with cockpit panels or the
 * fire button is computed and appropriate callbacks are invoked.
 * Squeeze gestures are used to grab and manipulate the throttle and
 * joystick controls.  The throttle directly modifies ui.speedFraction
 * to adjust travel speed.
 *
 * @param {THREE.WebGLRenderer} renderer Three.js renderer with XR enabled
 * @param {THREE.Scene} scene main scene
 * @param {THREE.Camera} camera main camera (unused here but kept for symmetry)
 * @param {Object} cockpit object returned from createCockpit() { throttle, joystick, panels, fireButton }
 * @param {Object} ui UI controller returned from createUI()
 * @param {Object} audio optional audio helper with playBeep()
 */
export function setupControls(renderer, scene, camera, cockpit, ui, audio) {
  const raycaster = new THREE.Raycaster();
  const workingMatrix = new THREE.Matrix4();
  const pointerColor = new THREE.Color(0xffaa00);

  // Factories for controller and hand models
  const controllerModelFactory = new XRControllerModelFactory();
  const handModelFactory = new XRHandModelFactory();

  // State for an active grab (throttle or joystick)
  let activeGrab = null;

  /**
   * Handle a pinch gesture from a hand.  Rays are cast from the index finger
   * towards its proximal joint to determine what the finger is pointing at.
   * If a panel is hit the UI’s handlePointer() method is invoked.  If the
   * fire button is hit a probe is launched.
   *
   * @param {THREE.Object3D} hand the hand performing the pinch
   */
  function handleHandPinch(hand) {
    const tip = hand.joints && hand.joints['index-finger-tip'];
    const prox = hand.joints && hand.joints['index-finger-phalanx-proximal'];
    if (!tip || !prox) return;
    const origin = new THREE.Vector3();
    tip.getWorldPosition(origin);
    const proxPos = new THREE.Vector3();
    prox.getWorldPosition(proxPos);
    const dir = origin.clone().sub(proxPos).normalize();
    raycaster.ray.origin.copy(origin);
    raycaster.ray.direction.copy(dir);
    const targets = cockpit.panels.slice();
    if (cockpit.fireButton) targets.push(cockpit.fireButton);
    const intersects = raycaster.intersectObjects(targets);
    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.object === cockpit.fireButton) {
        // Launch a probe in the direction the cockpit is facing
        launchProbe(cockpit.group, ui.speedFraction, 1e4, scene);
      } else {
        const panelIndex = cockpit.panels.indexOf(hit.object);
        if (panelIndex !== -1) {
          ui.handlePointer(panelIndex, hit.uv);
        }
      }
      if (audio && audio.playBeep) audio.playBeep();
    }
  }

  /**
   * Set up a hand for a given index.  Adds a mesh hand model and pinch
   * listener.  Returns the hand object for potential future use.
   *
   * @param {number} idx the hand index (0 for left, 1 for right)
   * @returns {THREE.Object3D}
   */
  function setupHand(idx) {
    const hand = renderer.xr.getHand(idx);
    const model = handModelFactory.createHandModel(hand, 'mesh');
    hand.add(model);
    scene.add(hand);
    hand.addEventListener('pinchstart', () => handleHandPinch(hand));
    return hand;
  }

  /**
   * Handle a squeeze start on a controller.  Determines whether the
   * controller is close enough to the throttle or joystick to grab it.
   * If so, stores the initial positions and angles for later update.
   *
   * @param {THREE.Object3D} controller the controller initiating the squeeze
   */
  function handleSqueezeStart(controller) {
    const controllerPos = new THREE.Vector3();
    controller.getWorldPosition(controllerPos);
    let grabbed = null;
    if (cockpit.throttle) {
      const throttleWorld = new THREE.Vector3();
      cockpit.throttle.getWorldPosition(throttleWorld);
      if (controllerPos.distanceTo(throttleWorld) < 0.3) {
        grabbed = {
          type: 'throttle',
          controller: controller,
          initialPosY: controllerPos.y,
          initialAngle: cockpit.throttle.rotation.x
        };
      }
    }
    if (!grabbed && cockpit.joystick) {
      const joystickWorld = new THREE.Vector3();
      cockpit.joystick.getWorldPosition(joystickWorld);
      if (controllerPos.distanceTo(joystickWorld) < 0.3) {
        grabbed = {
          type: 'joystick',
          controller: controller,
          initialPos: controllerPos.clone(),
          initialRotX: cockpit.joystick.rotation.x,
          initialRotZ: cockpit.joystick.rotation.z
        };
      }
    }
    if (grabbed) activeGrab = grabbed;
  }

  /**
   * Set up a controller for a given index.  Adds a visible pointer ray
   * and controller model, sets up select and squeeze event handlers.
   *
   * @param {number} idx controller index
   * @returns {THREE.Object3D}
   */
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

    // Add controller model (handheld device)
    const grip = renderer.xr.getControllerGrip(idx);
    grip.add(controllerModelFactory.createControllerModel(grip));
    scene.add(grip);

    // Pointer select event
    controller.addEventListener('selectstart', () => {
      controller.userData.selectPressed = true;
      // Cast a ray along the controller’s -Z axis
      workingMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(workingMatrix);
      const targets = cockpit.panels.slice();
      if (cockpit.fireButton) targets.push(cockpit.fireButton);
      const intersects = raycaster.intersectObjects(targets);
      if (intersects.length > 0) {
        const hit = intersects[0];
        if (hit.object === cockpit.fireButton) {
          launchProbe(cockpit.group, ui.speedFraction, 1e4, scene);
        } else {
          const panelIndex = cockpit.panels.indexOf(hit.object);
          if (panelIndex !== -1) {
            ui.handlePointer(panelIndex, hit.uv);
          }
        }
        if (audio && audio.playBeep) audio.playBeep();
      }
    });
    controller.addEventListener('selectend', () => {
      controller.userData.selectPressed = false;
    });

    // Squeeze events for grabbing throttle or joystick
    controller.addEventListener('squeezestart', () => handleSqueezeStart(controller));
    controller.addEventListener('squeezeend', () => {
      activeGrab = null;
    });

    return controller;
  }

  // Initialise controllers and hands
  const controller1 = setupController(0);
  const controller2 = setupController(1);
  const hand1 = setupHand(0);
  const hand2 = setupHand(1);

  /**
   * Update function to adjust throttle and joystick visuals.  Called
   * from the animation loop.  If the user is actively grabbing a
   * control the angle is computed from the controller’s movement;
   * otherwise the visuals follow the UI speed fraction for the throttle
   * and remain neutral for the joystick.
   */
  function update() {
    if (activeGrab) {
      const ctrl = activeGrab.controller;
      const pos = new THREE.Vector3();
      ctrl.getWorldPosition(pos);
      if (activeGrab.type === 'throttle') {
        const dy = pos.y - activeGrab.initialPosY;
        const maxAngle = Math.PI / 3; // 60° range
        cockpit.throttle.rotation.x = THREE.MathUtils.clamp(activeGrab.initialAngle - dy * 3.0, -maxAngle, 0);
        // Map throttle angle back to speed fraction [0,1]
        const fraction = THREE.MathUtils.clamp(-cockpit.throttle.rotation.x / maxAngle, 0, 1);
        ui.speedFraction = fraction;
      } else if (activeGrab.type === 'joystick') {
        const dx = pos.x - activeGrab.initialPos.x;
        const dz = pos.z - activeGrab.initialPos.z;
        const maxAngle = Math.PI / 4; // 45° range
        cockpit.joystick.rotation.x = THREE.MathUtils.clamp(activeGrab.initialRotX + -dz * 2.0, -maxAngle, maxAngle);
        cockpit.joystick.rotation.z = THREE.MathUtils.clamp(activeGrab.initialRotZ + -dx * 2.0, -maxAngle, maxAngle);
        // Joystick orientation could be used to aim the cannon or ship; left as an exercise
      }
    } else {
      // Idle: throttle follows UI speed fraction
      if (cockpit.throttle) {
        const maxAngle = Math.PI / 3;
        cockpit.throttle.rotation.x = -ui.speedFraction * maxAngle;
      }
      // Joystick neutral when not grabbed
      if (cockpit.joystick) {
        cockpit.joystick.rotation.x = 0;
        cockpit.joystick.rotation.z = 0;
      }
    }
  }

  return { controller1, controller2, hand1, hand2, update };
}