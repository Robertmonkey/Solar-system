/*
 * controls.js (Refactored)
 *
 * Sets up WebXR controllers, hand models, and input handling. This version implements:
 * - Both controller and articulated hand models using official three.js factories.
 * - Ray-based pointing for controllers and a visual ray for index fingers.
 * - Pinch-to-select interaction for hands.
 * - Squeeze-to-grab interaction for manipulating the throttle and joystick.
 * - Logic to link the joystick's physical orientation to the cannon's aim.
 * - State management for grabbing and releasing controls.
 */

import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

// Configuration
const GRAB_DISTANCE = 0.2; // Max distance to grab an object
const POINTER_COLOR_DEFAULT = 0xffaa00;
const POINTER_COLOR_HOVER = 0x00ff00;

export function setupControls(renderer, scene, cockpit, ui, audio) {
  const raycaster = new THREE.Raycaster();
  const tempMatrix = new THREE.Matrix4();
  const controllerModelFactory = new XRControllerModelFactory();
  const handModelFactory = new XRHandModelFactory().setPath(
    "https://cdn.jsdelivr.net/npm/three@0.155.0/examples/models/fbx/"
  );

  // State for each controller/hand
  const controllers = [
    { grip: renderer.xr.getControllerGrip(0), hand: renderer.xr.getHand(0), grabbedObject: null, lastHovered: null },
    { grip: renderer.xr.getControllerGrip(1), hand: renderer.xr.getHand(1), grabbedObject: null, lastHovered: null }
  ];

  controllers.forEach((controllerData, i) => {
    // --- Controller Grip and Model ---
    const grip = controllerData.grip;
    grip.add(controllerModelFactory.createControllerModel(grip));
    scene.add(grip);

    // --- Hand Model ---
    const hand = controllerData.hand;
    hand.add(handModelFactory.createHandModel(hand, 'oculus'));
    scene.add(hand);

    // --- Pointer Ray ---
    const pointerGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    const pointerMat = new THREE.LineBasicMaterial({ color: POINTER_COLOR_DEFAULT, linewidth: 2 });
    const pointer = new THREE.Line(pointerGeom, pointerMat);
    pointer.name = 'pointer';
    pointer.scale.z = 5;
    grip.add(pointer); // Attach ray to controller grip initially

    // Event listeners
    hand.addEventListener('pinchstart', (e) => onSelectStart(e.target, ui));
    hand.addEventListener('pinchend', (e) => onSelectEnd(e.target));
    hand.addEventListener('squeezestart', (e) => onGrabStart(e.target, controllerData));
    hand.addEventListener('squeezeend', (e) => onGrabEnd(e.target, controllerData));
  });
  
  // --- Interaction Functions ---

  function onSelectStart(controller, ui) {
    const intersections = getIntersections(controller);
    if (intersections.length > 0) {
      const intersection = intersections[0];
      const object = intersection.object;

      if (object.name === "FireButton") {
        ui.handleProbeLaunch();
      } else {
        const panelIndex = cockpit.panels.indexOf(object);
        if (panelIndex !== -1) {
          ui.handlePointer(panelIndex, intersection.uv);
        }
      }
      if (audio) audio.playBeep();
    }
  }

  function onSelectEnd(controller) { /* No action needed on release for simple clicks */ }

  function onGrabStart(controller, controllerData) {
    const controllerPos = new THREE.Vector3();
    controller.getWorldPosition(controllerPos);

    // Check for throttle
    const throttlePos = new THREE.Vector3();
    cockpit.throttle.getWorldPosition(throttlePos);
    if (controllerPos.distanceTo(throttlePos) < GRAB_DISTANCE) {
      controllerData.grabbedObject = {
        type: 'throttle',
        object: cockpit.throttle,
        initialControllerY: controllerPos.y,
        initialObjectRotationX: cockpit.throttle.rotation.x
      };
      return;
    }
    
    // Check for joystick
    const joystickPos = new THREE.Vector3();
    cockpit.joystick.getWorldPosition(joystickPos);
    if (controllerPos.distanceTo(joystickPos) < GRAB_DISTANCE) {
      const initialControllerPose = new THREE.Matrix4().copy(controller.matrixWorld);
      controllerData.grabbedObject = {
        type: 'joystick',
        object: cockpit.joystick,
        initialControllerMatrix: initialControllerPose.invert(),
        initialObjectRotation: cockpit.joystick.rotation.clone()
      };
    }
  }
  
  function onGrabEnd(controller, controllerData) {
    if (controllerData.grabbedObject) {
      if(controllerData.grabbedObject.type === 'joystick') {
        // Smoothly return joystick to center
        // This could be a tween animation for more polish
        cockpit.joystick.rotation.set(0, 0, 0);
      }
      controllerData.grabbedObject = null;
    }
  }

  function getIntersections(controller) {
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    const interactables = [...cockpit.panels, cockpit.fireButton];
    return raycaster.intersectObjects(interactables);
  }

  function update() {
    controllers.forEach(data => {
      // Handle grabbed objects
      if (data.grabbedObject) {
        const grab = data.grabbedObject;
        const controllerPos = new THREE.Vector3();
        data.hand.getWorldPosition(controllerPos);

        if (grab.type === 'throttle') {
          const dy = controllerPos.y - grab.initialControllerY;
          const maxAngle = Math.PI / 3; // 60 degrees range of motion
          const newRotationX = grab.initialObjectRotationX - dy * 4.0; // Multiplier for sensitivity
          grab.object.rotation.x = THREE.MathUtils.clamp(newRotationX, -maxAngle, 0);
          ui.speedFraction = grab.object.rotation.x / -maxAngle;
        } 
        else if (grab.type === 'joystick') {
          const controllerMatrix = data.hand.matrixWorld;
          const deltaMatrix = new THREE.Matrix4().multiplyMatrices(controllerMatrix, grab.initialControllerMatrix);
          const deltaEuler = new THREE.Euler().setFromRotationMatrix(deltaMatrix);
          
          const maxAngle = Math.PI / 6; // 30 degrees range
          grab.object.rotation.x = THREE.MathUtils.clamp(grab.initialObjectRotation.x + deltaEuler.x, -maxAngle, maxAngle);
          grab.object.rotation.y = 0; // Prevent twisting
          grab.object.rotation.z = THREE.MathUtils.clamp(grab.initialObjectRotation.z + deltaEuler.z, -maxAngle, maxAngle);

          // Aim the cannon based on joystick rotation
          cockpit.cannon.rotation.y = -grab.object.rotation.z * 0.5; // Yaw
          cockpit.cannon.rotation.x = Math.PI / 2 - grab.object.rotation.x * 0.5; // Pitch
        }
      } else {
        // Handle hovering and pointer visuals when not grabbing
        const pointer = data.grip.getObjectByName('pointer');
        if (pointer) {
            const intersections = getIntersections(data.hand); // Use hand for intersection
            if (intersections.length > 0) {
                pointer.material.color.set(POINTER_COLOR_HOVER);
                data.lastHovered = intersections[0].object;
            } else if (data.lastHovered) {
                pointer.material.color.set(POINTER_COLOR_DEFAULT);
                data.lastHovered = null;
            }
        }
      }
    });

    // When not grabbed, the throttle should visually match the UI state
    const isThrottleGrabbed = controllers.some(c => c.grabbedObject && c.grabbedObject.type === 'throttle');
    if (!isThrottleGrabbed) {
      const maxAngle = Math.PI / 3;
      cockpit.throttle.rotation.x = -ui.speedFraction * maxAngle;
    }
  }

  return { update };
}
