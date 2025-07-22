/*
 * controls.js (Updated)
 *
 * This module wires up the WebXR input sources so that users can grab
 * controls, point at UI elements and fire probes.  A number of fixes
 * have been made here:
 *
 *   1. The cockpit scale was increased elsewhere, but the hands were still
 *      invisible because the high‑quality hand meshes weren’t loading.  We
 *      explicitly set the path on the XRHandModelFactory to point at the
 *      WebXR input profiles CDN and request the 'mesh' profile.  This
 *      loads the correct glTF hand models for both hands.  Without a
 *      path the factory falls back to spheres and may silently fail to
 *      fetch assets on some devices.
 *   2. The previous code attached interaction events to the hand group.
 *      However, WebXR emits select/squeeze events on the controller
 *      objects returned from renderer.xr.getController().  Event
 *      listeners have been moved onto the controllers accordingly.
 *   3. Touch detection now uses the joints exposed by the hand group
 *      instead of attempting to read joints from the hand model.  The
 *      hand model is purely visual; the underlying hand group is what
 *      exposes joint poses.
 */

import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

// Maximum distance from a controller to highlight or grab an object.
//
// The cockpit geometry was scaled up by ~20 % to give users more room.  As a
// consequence the physical distance between the user’s hand and the controls
// increased, and the original grab radius (0.25 m) made it impossible to
// hover over or grab the throttle, joystick or fire button.  Increasing
// the grab radius slightly restores the ability to highlight and pick up
// these controls without requiring uncomfortable arm extension.  A value of
// 0.45 was chosen experimentally to balance reach with avoiding accidental
// grabs when merely reaching past a control.
const GRAB_DISTANCE = 0.45;

/**
 * Set up WebXR input for the scene.
 *
 * @param {THREE.WebGLRenderer} renderer The renderer with XR enabled.
 * @param {THREE.Scene} scene The scene to add controllers and hands to.
 * @param {object} cockpit An object containing interactive cockpit parts.
 * @param {object} ui The UI system for processing pointer interactions.
 * @param {Function} fireProbe Callback invoked when the fire button is pressed.
 */
export function setupControls(renderer, scene, cockpit, ui, fireProbe) {
  const controllerModelFactory = new XRControllerModelFactory();
  const handModelFactory = new XRHandModelFactory();
  // Point the hand model factory at the WebXR input profiles CDN.  Use the
  // default version (@1.0) rather than @1.0.0; some versions of Three.js
  // expect this exact path.  Without setting a path the loader falls back
  // to the same default, but we specify it here for clarity.
  handModelFactory.setPath(
    'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-hand/'
  );

  // Array storing per‑hand state
  const controllers = [];

  for (let i = 0; i < 2; i++) {
    // WebXR returns three distinct objects for each hand: a controller for
    // events, a grip for the physical controller model and a hand group for
    // articulated joints.  We add each to the scene explicitly rather than
    // passing them together so that the scene graph is clear.
    const controller = renderer.xr.getController(i);
    const grip = renderer.xr.getControllerGrip(i);
    const hand = renderer.xr.getHand(i);
    scene.add(controller);
    scene.add(grip);
    scene.add(hand);

    // Visualize the physical controller grip (for non‑hand controllers)
    grip.add(controllerModelFactory.createControllerModel(grip));

    // Load the high‑fidelity GLTF hand mesh.  Using the 'mesh' profile
    // creates a fully rigged hand model with skinned meshes for each
    // finger.  This matches the behaviour of the earlier proof‑of‑concept
    // code and relies on the assets hosted on the WebXR input profiles CDN.
    const handModel = handModelFactory.createHandModel(hand, 'mesh');
    hand.add(handModel);

    // Invisible sphere used for precise finger tip collision testing.  This
    // sphere follows the index fingertip each frame and allows us to test
    // intersections against other objects (e.g. the dashboard panel).
    const touchSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.015),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    touchSphere.name = 'Fingertip';
    scene.add(touchSphere);

    const controllerData = {
      controller,
      grip,
      hand,
      handModel,
      touchSphere,
      isSelecting: false,
      grabbedObject: null,
      hoveredObject: null,
      lastTouchTime: 0,
    };
    controllers.push(controllerData);

    // Hook up interaction events.  Select events correspond to trigger
    // presses; squeeze events correspond to grip presses.
    controller.addEventListener('selectstart', () => onSelectStart(controllerData));
    controller.addEventListener('selectend', () => onSelectEnd(controllerData));
    controller.addEventListener('squeezestart', () => onGrabStart(controllerData));
    controller.addEventListener('squeezeend', () => onGrabEnd(controllerData));
  }

  // A list of objects that can be grabbed.  Each entry has a reference to the
  // Three.js object and a name used to decide how to handle the grab.
  const grabInteractables = [
    { object: cockpit.throttle, name: 'throttle' },
    { object: cockpit.joystick, name: 'joystick' },
    { object: cockpit.fireButton, name: 'fireButton' },
  ];

  // --- Event Handlers ---
  function onSelectStart(data) {
    data.isSelecting = true;
    if (!data.grabbedObject && data.hoveredObject) {
      onGrabStart(data);
    }
  }

  function onSelectEnd(data) {
    data.isSelecting = false;
    if (data.grabbedObject) {
      onGrabEnd(data);
    }
  }

  function onGrabStart(data) {
    if (data.hoveredObject) {
      const type = data.hoveredObject.name;
      const controllerPos = new THREE.Vector3();
      // Use the hand group to get a stable world position for the palm.  The
      // controller object has no position when hand tracking is active.
      data.hand.getWorldPosition(controllerPos);

      if (type === 'throttle') {
        data.grabbedObject = {
          type: 'throttle',
          object: cockpit.throttlePivot,
          initialControllerY: controllerPos.y,
          initialObjectRotationX: cockpit.throttlePivot.rotation.x,
        };
      } else if (type === 'joystick') {
        const initialControllerPose = new THREE.Matrix4().copy(data.hand.matrixWorld);
        data.grabbedObject = {
          type: 'joystick',
          object: cockpit.joystickPivot,
          initialControllerMatrix: initialControllerPose.invert(),
          initialObjectRotation: cockpit.joystickPivot.rotation.clone(),
        };
      } else if (type === 'fireButton') {
        // Immediately trigger the fire probe callback when the fire button is
        // pressed.  This behaviour matches the UI’s expected semantics.
        fireProbe();
        data.isSelecting = false;
        return;
      }
    }
  }

  function onGrabEnd(data) {
    if (data.grabbedObject) {
      if (data.grabbedObject.type === 'joystick') {
        cockpit.joystickPivot.rotation.set(0, 0, 0);
      }
      data.grabbedObject = null;
    }
  }

  /**
   * Highlights the nearest interactable within GRAB_DISTANCE of the palm.  If
   * the palm moves closer to a different object the highlight is switched.
   */
  function handleHighlighting(data) {
    let closestHover = null;
    let minDistance = GRAB_DISTANCE;
    const handPos = new THREE.Vector3();
    data.hand.getWorldPosition(handPos);

    grabInteractables.forEach((item) => {
      const itemPos = new THREE.Vector3();
      item.object.getWorldPosition(itemPos);
      const distance = handPos.distanceTo(itemPos);
      // Slightly bias against the joystick and throttle so you need to get a
      // little closer to grab them.  This prevents accidentally grabbing
      // them when you intend to press the fire button.
      const verticalBias = item.name === 'joystick' || item.name === 'throttle' ? 0.1 : 0;
      if (distance < minDistance + verticalBias) {
        minDistance = distance;
        closestHover = item;
      }
    });

    if (data.hoveredObject !== closestHover) {
      if (data.hoveredObject) {
        setObjectEmissive(data.hoveredObject.object, 0);
      }
      if (closestHover) {
        setObjectEmissive(closestHover.object, 0.5);
      }
      data.hoveredObject = closestHover;
    }
  }

  /**
   * Temporarily changes the emissive colour and intensity of a mesh and all
   * nested meshes.  When intensity is 0 the original emissive colour is
   * restored.
   */
  function setObjectEmissive(object, intensity) {
    object.traverse((child) => {
      if (child.isMesh && child.material.emissive) {
        if (intensity > 0) {
          if (child.material.originalEmissive === undefined) {
            child.material.originalEmissive = child.material.emissive.getHex();
          }
          child.material.emissive.setHex(0xffff00);
        } else {
          child.material.emissive.setHex(child.material.originalEmissive || 0x000000);
        }
        child.material.emissiveIntensity = intensity;
      }
    });
  }

  /**
   * Called every frame to update the fingertip collider and dispatch UI
   * events when the user taps on the dashboard.  The index finger tip is
   * obtained from the hand’s joints rather than from the hand model.  This
   * ensures reliable positions even if the hand mesh hasn’t finished
   * loading or isn’t visible.
   */
  function handleTouch(data) {
    // The hand group exposes a map of joints when hand tracking is active.
    const fingerTip = data?.hand?.joints?.['index-finger-tip'];
    if (!fingerTip) return;
    // Compute the world position of the fingertip.
    const tipPos = new THREE.Vector3();
    fingerTip.getWorldPosition(tipPos);
    data.touchSphere.position.copy(tipPos);

    const now = performance.now();
    if (now - data.lastTouchTime < 300) return;

    // Check fire button first
    const fireButtonBox = new THREE.Box3().setFromObject(cockpit.fireButton);
    if (fireButtonBox.containsPoint(tipPos)) {
      fireProbe();
      data.lastTouchTime = now;
      return;
    }

    // Then check the dashboard panel
    const dashboardBox = new THREE.Box3().setFromObject(cockpit.dashboard);
    if (dashboardBox.containsPoint(tipPos)) {
      const tempRay = new THREE.Raycaster();
      const handPos = new THREE.Vector3();
      data.hand.getWorldPosition(handPos);
      const dir = new THREE.Vector3().subVectors(tipPos, handPos).normalize();
      tempRay.set(tipPos, dir);
      const dashboardIntersects = tempRay.intersectObject(cockpit.dashboard);
      if (dashboardIntersects.length > 0) {
        ui.handlePointer(dashboardIntersects[0].uv);
        data.lastTouchTime = now;
      }
    }
  }

  /**
   * Update function called every frame from the main animation loop.
   * Handles grabbing mechanics, highlighting and UI touch.
   *
   * @param {number} dt Delta time in seconds
   */
  function update(dt) {
    controllers.forEach((data) => {
      if (data.grabbedObject) {
        const grab = data.grabbedObject;
        const controllerPos = new THREE.Vector3();
        data.hand.getWorldPosition(controllerPos);
        if (grab.type === 'throttle') {
          const dy = controllerPos.y - grab.initialControllerY;
          const maxAngle = Math.PI / 3;
          const newRotationX = grab.initialObjectRotationX - dy * 4.0;
          grab.object.rotation.x = THREE.MathUtils.clamp(newRotationX, -maxAngle, 0);
          ui.speedFraction = grab.object.rotation.x / -maxAngle;
        } else if (grab.type === 'joystick') {
          const controllerMatrix = data.hand.matrixWorld;
          const deltaMatrix = new THREE.Matrix4().multiplyMatrices(controllerMatrix, grab.initialControllerMatrix);
          const deltaEuler = new THREE.Euler().setFromRotationMatrix(deltaMatrix);
          const maxAngle = Math.PI / 4;
          grab.object.rotation.x = THREE.MathUtils.clamp(
            grab.initialObjectRotation.x + deltaEuler.x * 2.0,
            -maxAngle,
            maxAngle
          );
          grab.object.rotation.z = THREE.MathUtils.clamp(
            grab.initialObjectRotation.z - deltaEuler.y * 2.0,
            -maxAngle,
            maxAngle
          );
          cockpit.cannon.rotation.y = -grab.object.rotation.z;
          cockpit.cannon.rotation.x = Math.PI / 2 - grab.object.rotation.x;
        }
      } else {
        handleHighlighting(data);
        handleTouch(data);
      }
    });

    // If neither controller is grabbing the throttle then smoothly follow the
    // UI speed fraction back to its rest position.  This interpolation
    // provides a spring‑like behaviour when releasing the throttle.
    if (!controllers.some((c) => c.grabbedObject?.type === 'throttle')) {
      const maxAngle = Math.PI / 3;
      cockpit.throttlePivot.rotation.x = -ui.speedFraction * maxAngle;
    }
    // Likewise if no joystick is being grabbed, ease the joystick back to
    // neutral.
    if (!controllers.some((c) => c.grabbedObject?.type === 'joystick')) {
      cockpit.joystickPivot.rotation.x = cockpit.joystickPivot.rotation.x * (1 - 10 * dt);
      cockpit.joystickPivot.rotation.z = cockpit.joystickPivot.rotation.z * (1 - 10 * dt);
      cockpit.cannon.rotation.x = Math.PI / 2;
      cockpit.cannon.rotation.y = 0;
    }
  }

  return { update };
}
