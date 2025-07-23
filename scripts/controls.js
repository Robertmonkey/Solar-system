/*
 * controls.js (Improved interaction)
 *
 * Sets up WebXR input for the Solar System VR experience.  This version
 * makes a few notable changes to improve usability:
 *
 *   • The grab radius has been increased so that reaching out to the
 *     controls is easier and does not require precision extension.
 *   • Touch interactions now trigger UI actions immediately upon contact
 *     with the dashboard panels and orrery planets; users no longer need
 *     to pinch (trigger) first.  This makes the panels behave like
 *     touchscreens that respond to your index finger.
 */

import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

// Maximum distance from a controller to highlight or grab an object.
// Increased to 0.8 metres so that hovering over the controls feels
// natural even when the cockpit is scaled up.  A larger radius helps
// compensate for small tracking errors inherent in hand tracking.
const GRAB_DISTANCE = 0.8;

/**
 * Set up WebXR input for the scene.
 *
 * @param {THREE.WebGLRenderer} renderer The renderer with XR enabled.
 * @param {THREE.Scene} scene The scene to add controllers and hands to.
 * @param {object} cockpit An object containing interactive cockpit parts.
 * @param {object} ui The UI system for processing pointer interactions.
 * @param {Function} fireProbe Callback invoked when the fire button is pressed.
 * @param {object} [orrery] Optional orrery helper for warp target selection.
 */
export function setupControls(renderer, scene, cockpit, ui, fireProbe, orrery) {
  const controllerModelFactory = new XRControllerModelFactory();
  const handModelFactory = new XRHandModelFactory();
  handModelFactory.setPath(
    'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-hand/'
  );

  // Array storing per‑hand state
  const controllers = [];
  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    const grip = renderer.xr.getControllerGrip(i);
    const hand = renderer.xr.getHand(i);
    scene.add(controller);
    scene.add(grip);
    scene.add(hand);

    // Visualise physical controller grip
    grip.add(controllerModelFactory.createControllerModel(grip));
    const handModel = handModelFactory.createHandModel(hand, 'mesh');
    hand.add(handModel);

    // Invisible sphere for fingertip collision
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
      lastPanel: null,
      touchingFire: false,
    };
    controllers.push(controllerData);

    // Hook up interaction events.  Select events correspond to trigger presses;
    // squeeze events correspond to grip presses (closing the hand).
    controller.addEventListener('selectstart', () => onSelectStart(controllerData));
    controller.addEventListener('selectend', () => onSelectEnd(controllerData));
    controller.addEventListener('squeezestart', () => onGrabStart(controllerData));
    controller.addEventListener('squeezeend', () => onGrabEnd(controllerData));
  }

  // Objects that can be grabbed with your hand
  const grabInteractables = [
    { object: cockpit.throttle, name: 'throttle' },
    { object: cockpit.joystick, name: 'joystick' },
    { object: cockpit.fireButton, name: 'fireButton' },
  ];

  // --- Event Handlers ---
  function onSelectStart(data) {
    data.isSelecting = true;
  }
  function onSelectEnd(data) {
    data.isSelecting = false;
  }
  function onGrabStart(data) {
    if (data.hoveredObject) {
      const type = data.hoveredObject.name;
      const controllerPos = new THREE.Vector3();
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
        // Immediately trigger the fire probe callback when the fire button is pressed
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
   * Highlights the nearest interactable within GRAB_DISTANCE of the palm.
   */
  function handleHighlighting(data) {
    let closestHover = null;
    let minDistance = GRAB_DISTANCE;
    const handPos = new THREE.Vector3();
    data.hand.getWorldPosition(handPos);
    grabInteractables.forEach((item) => {
      const box = new THREE.Box3().setFromObject(item.object);
      const closestPoint = new THREE.Vector3();
      box.clampPoint(handPos, closestPoint);
      const distance = handPos.distanceTo(closestPoint);
      // Slightly bias against joystick and throttle
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
   * nested meshes.  When intensity is 0 the original emissive colour is restored.
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
   * obtained from the hand’s joints rather than from the hand model.
   */
  function handleTouch(data) {
    const fingerTip = data?.hand?.joints?.['index-finger-tip'];
    if (!fingerTip) return;
    const tipPos = new THREE.Vector3();
    fingerTip.getWorldPosition(tipPos);
    data.touchSphere.position.copy(tipPos);

    // Fire button detection: trigger probe launch on touch
    const fireButtonBox = new THREE.Box3().setFromObject(cockpit.fireButton);
    if (fireButtonBox.containsPoint(tipPos)) {
      // Call fireProbe regardless of pinch; treat as a tap
      fireProbe();
      data.isSelecting = false;
      data.touchingFire = true;
      return;
    } else {
      data.touchingFire = false;
    }

    // Dashboard panels (left, right, facts)
    const panels = [
      { mesh: cockpit.leftPanel, name: 'left' },
      { mesh: cockpit.rightPanel, name: 'right' },
      { mesh: cockpit.factsPanel, name: 'facts' },
    ];
    let touchingPanel = null;
    for (const panel of panels) {
      const box = new THREE.Box3().setFromObject(panel.mesh);
      if (!box.containsPoint(tipPos)) continue;
      touchingPanel = panel.name;
      const tempRay = new THREE.Raycaster();
      const handPos = new THREE.Vector3();
      data.hand.getWorldPosition(handPos);
      const dir = new THREE.Vector3().subVectors(tipPos, handPos).normalize();
      tempRay.set(tipPos, dir);
      // Check orrery first
      if (orrery) {
        const hits = tempRay.intersectObjects(orrery.planetMeshes);
        if (hits.length > 0) {
          const idx = orrery.planetMeshes.indexOf(hits[0].object);
          // Always select warp target on touch; no need to pinch first
          ui.selectWarpTarget(idx);
          data.lastPanel = 'orrery-' + idx;
          data.isSelecting = false;
          return;
        }
      }
      // Otherwise fall back to the 2D dashboard UI for that panel
      const hits = tempRay.intersectObject(panel.mesh);
      if (hits.length > 0) {
        ui.handlePointer(panel.name, hits[0].uv);
        data.lastPanel = panel.name;
        data.isSelecting = false;
        break;
      }
    }
    if (!touchingPanel) data.lastPanel = null;
  }

  /**
   * Update function called every frame from the main animation loop.  Handles
   * grabbing mechanics, highlighting and UI touch.
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
    // Smoothly reset throttle and joystick when released
    if (!controllers.some((c) => c.grabbedObject?.type === 'throttle')) {
      const maxAngle = Math.PI / 3;
      cockpit.throttlePivot.rotation.x = -ui.speedFraction * maxAngle;
    }
    if (!controllers.some((c) => c.grabbedObject?.type === 'joystick')) {
      cockpit.joystickPivot.rotation.x = cockpit.joystickPivot.rotation.x * (1 - 10 * dt);
      cockpit.joystickPivot.rotation.z = cockpit.joystickPivot.rotation.z * (1 - 10 * dt);
      cockpit.cannon.rotation.x = Math.PI / 2;
      cockpit.cannon.rotation.y = 0;
    }
  }

  return { update };
}
