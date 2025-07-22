/*
 * controls.js (Major Interaction Refactor)
 *
 * This version implements a more intuitive, direct-manipulation control scheme.
 * - REMOVED: Distracting pointer rays are gone.
 * - NEW: Direct Touch Interaction. A small, invisible sphere on the user's
 * index fingertip detects collisions with UI panels, simulating a touchscreen.
 * - NEW: Visual Highlighting. Grab-able controls (throttle, joystick) now glow
 * when a hand is close enough to interact, providing clear feedback.
 * - FIXED: Grabbing logic is more robust and reliable.
 */

import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

const GRAB_DISTANCE = 0.25; // Max distance to highlight/grab an object

export function setupControls(renderer, scene, cockpit, ui, fireProbe) {
    const tempMatrix = new THREE.Matrix4();
    const controllerModelFactory = new XRControllerModelFactory();
    const handModelFactory = new XRHandModelFactory().setPath("https://cdn.jsdelivr.net/npm/three@0.155.0/examples/models/fbx/");

    // State for each controller/hand
    const controllers = [];
    for (let i = 0; i < 2; i++) {
        const grip = renderer.xr.getControllerGrip(i);
        const hand = renderer.xr.getHand(i);
        scene.add(grip, hand);
        
        // --- Models ---
        grip.add(controllerModelFactory.createControllerModel(grip));
        const handModel = handModelFactory.createHandModel(hand, 'oculus');
        hand.add(handModel);

        // --- Fingertip for Touch Interaction ---
        const touchSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.015), 
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }) // Invisible
        );
        touchSphere.name = "Fingertip";
        scene.add(touchSphere);

        const controllerData = {
            grip,
            hand,
            handModel,
            touchSphere,
            isSelecting: false,
            grabbedObject: null,
            hoveredObject: null,
        };
        controllers.push(controllerData);

        // --- Event Listeners ---
        hand.addEventListener('selectstart', () => onSelectStart(controllerData));
        hand.addEventListener('selectend', () => onSelectEnd(controllerData));
        hand.addEventListener('squeezestart', () => onGrabStart(controllerData));
        hand.addEventListener('squeezeend', () => onGrabEnd(controllerData));
    }
    
    const grabInteractables = [
        { object: cockpit.throttle, name: 'throttle' },
        { object: cockpit.joystick, name: 'joystick' },
        { object: cockpit.fireButton, name: 'fireButton' }
    ];

    // --- Interaction Logic ---
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
                    initialObjectRotationX: cockpit.throttlePivot.rotation.x
                };
            } else if (type === 'joystick') {
                const initialControllerPose = new THREE.Matrix4().copy(data.hand.matrixWorld);
                data.grabbedObject = {
                    type: 'joystick',
                    object: cockpit.joystickPivot,
                    initialControllerMatrix: initialControllerPose.invert(),
                    initialObjectRotation: cockpit.joystickPivot.rotation.clone()
                };
            }
        }
    }
    
    function onGrabEnd(data) {
        if (data.grabbedObject) {
            if(data.grabbedObject.type === 'joystick') {
                // Smoothly return joystick to center
                cockpit.joystickPivot.rotation.set(0, 0, 0);
            }
            data.grabbedObject = null;
        }
    }

    function handleHighlighting(data) {
        let closestHover = null;
        let minDistance = GRAB_DISTANCE;
        const handPos = new THREE.Vector3();
        data.hand.getWorldPosition(handPos);

        grabInteractables.forEach(item => {
            const itemPos = new THREE.Vector3();
            item.object.getWorldPosition(itemPos);
            const distance = handPos.distanceTo(itemPos);

            // Make the joystick and throttle easier to grab from above
            const verticalBias = (item.name === 'joystick' || item.name === 'throttle') ? 0.1 : 0;
            if (distance < minDistance + verticalBias) {
                minDistance = distance;
                closestHover = item;
            }
        });
        
        if (data.hoveredObject !== closestHover) {
            // Un-highlight old object if it exists
            if (data.hoveredObject) {
                setObjectEmissive(data.hoveredObject.object, 0);
            }
            // Highlight new object
            if (closestHover) {
                setObjectEmissive(closestHover.object, 0.5);
            }
            data.hoveredObject = closestHover;
        }
    }
    
    function setObjectEmissive(object, intensity) {
        object.traverse(child => {
            if (child.isMesh && child.material.emissive) {
                if (intensity > 0) {
                    child.material.originalEmissive = child.material.emissive.getHex();
                    child.material.emissive.setHex(0xffff00); // Highlight color
                } else {
                    child.material.emissive.setHex(child.material.originalEmissive || 0x000000);
                }
                child.material.emissiveIntensity = intensity;
            }
        });
    }

    function handleTouch(data) {
        const fingerTip = data.handModel.joints['index-finger-tip'];
        if (fingerTip) {
            const tipPos = new THREE.Vector3();
            fingerTip.getWorldPosition(tipPos);
            data.touchSphere.position.copy(tipPos);

            if (data.isSelecting) {
                // Raycast from the fingertip sphere's position to detect intersection
                const raycaster = new THREE.Raycaster();
                raycaster.set(data.touchSphere.position, new THREE.Vector3(0,0,-1)); // Dummy direction
                const intersects = raycaster.intersectObject(cockpit.dashboard);

                // Simple bounding box check is often enough for touch
                const dashboardBox = new THREE.Box3().setFromObject(cockpit.dashboard);
                if (dashboardBox.intersectsSphere(data.touchSphere.geometry.boundingSphere.clone().translate(data.touchSphere.position))) {
                    
                    // Fire button is special
                    const fireButtonBox = new THREE.Box3().setFromObject(cockpit.fireButton);
                    if (fireButtonBox.intersectsSphere(data.touchSphere.geometry.boundingSphere.clone().translate(data.touchSphere.position))) {
                        fireProbe();
                        data.isSelecting = false; // Prevent repeated firing
                        return;
                    }

                    // For the dashboard, we need UV coordinates to know where the touch happened
                    const tempRay = new THREE.Raycaster();
                    const handPos = new THREE.Vector3();
                    data.hand.getWorldPosition(handPos);
                    const dir = new THREE.Vector3().subVectors(tipPos, handPos).normalize();
                    tempRay.set(tipPos, dir);
                    const dashboardIntersects = tempRay.intersectObject(cockpit.dashboard);
                    
                    if(dashboardIntersects.length > 0) {
                        ui.handlePointer(dashboardIntersects[0].uv);
                        data.isSelecting = false; // Consume the select event
                    }
                }
            }
        }
    }
    
    function update(dt) {
        controllers.forEach(data => {
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
                    grab.object.rotation.x = THREE.MathUtils.clamp(grab.initialObjectRotation.x + deltaEuler.x * 2.0, -maxAngle, maxAngle);
                    grab.object.rotation.z = THREE.MathUtils.clamp(grab.initialObjectRotation.z - deltaEuler.y * 2.0, -maxAngle, maxAngle);

                    // Aim the cannon based on joystick rotation
                    cockpit.cannon.rotation.y = -grab.object.rotation.z;
                    cockpit.cannon.rotation.x = Math.PI / 2 - grab.object.rotation.x;
                }
            } else {
                handleHighlighting(data);
                handleTouch(data);
            }
        });
        
        // When not grabbed, throttle visually matches UI state
        if (!controllers.some(c => c.grabbedObject?.type === 'throttle')) {
            const maxAngle = Math.PI / 3;
            cockpit.throttlePivot.rotation.x = -ui.speedFraction * maxAngle;
        }
        // When joystick not grabbed, return to neutral and point cannon forward
        if (!controllers.some(c => c.grabbedObject?.type === 'joystick')) {
            cockpit.joystickPivot.rotation.x = cockpit.joystickPivot.rotation.x * (1-10*dt);
            cockpit.joystickPivot.rotation.z = cockpit.joystickPivot.rotation.z * (1-10*dt);
            cockpit.cannon.rotation.x = Math.PI / 2;
            cockpit.cannon.rotation.y = 0;
        }
    }

    return { update };
}
