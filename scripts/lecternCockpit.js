/*
 * lecternCockpit.js
 *
 * This module defines a new cockpit layout for the Solar System simulator.  It
 * replaces the seated desk and overhead light bar with a standing platform and
 * wrap‑around lectern.  The design provides a semi‑circular console at waist
 * height, integrated throttle/joystick controls, a launch button and a
 * dedicated pedestal for the orrery.  The cockpit group is returned along
 * with references to interactive components so the rest of the application
 * can hook into them.
 */

import * as THREE from 'three';

/**
 * Creates a lectern‑style cockpit.  The returned object exposes the group
 * containing all meshes as well as references to the throttle, joystick,
 * fire button and a mount for the orrery.  It also exposes helper methods to
 * handle grabbing of the controls and update their orientation based on
 * fingertip positions.
 *
 * @returns {{
 *   group: THREE.Group,
 *   throttle: THREE.Group,
 *   joystick: THREE.Group,
 *   throttlePivot: THREE.Object3D,
 *   joystickPivot: THREE.Object3D,
 *   fireButton: THREE.Mesh,
 *   orreryMount: THREE.Object3D,
 *   startGrabbingThrottle: function(number),
 *   stopGrabbingThrottle: function(number),
 *   startGrabbingJoystick: function(number),
 *   stopGrabbingJoystick: function(number),
 *   updateGrab: function(number, THREE.Vector3)
 * }}
 */
export function createLecternCockpit() {
  const cockpitGroup = new THREE.Group();
  cockpitGroup.name = 'LecternCockpit';

  // Materials.  Dark metallic surfaces with subtle emissive accents to achieve
  // the cosmic aesthetic.
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a20,
    metalness: 0.9,
    roughness: 0.3
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x224466,
    metalness: 0.9,
    roughness: 0.2,
    emissive: 0x112244,
    emissiveIntensity: 0.6
  });
  const controlMat = new THREE.MeshStandardMaterial({
    color: 0x00aaff,
    metalness: 0.8,
    roughness: 0.4,
    emissive: 0x001133
  });

  // --- Floor Ring ---
  // A torus that gives the player a sense of platform and orientation.  The
  // radius should be large enough for the player to stand comfortably.  It
  // doesn’t block movement but anchors the scene visually.
  const floorGeom = new THREE.TorusGeometry(2.2, 0.04, 12, 48);
  const floorRing = new THREE.Mesh(floorGeom, accentMat);
  floorRing.rotation.x = Math.PI / 2;
  floorRing.position.y = 0;
  cockpitGroup.add(floorRing);

  // --- Lectern Desk ---
  // Use a half‑cylinder to create a wrap‑around desk.  The desk is open
  // towards the player and spans 180 degrees around them.  We use
  // CylinderGeometry with a start angle of ‑π/2 so the flat edge faces the
  // player’s back.  The height is small to resemble a tabletop.
  const deskRadius = 1.5;
  const deskThickness = 0.12;
  const deskGeom = new THREE.CylinderGeometry(
    deskRadius,
    deskRadius,
    deskThickness,
    64,
    1,
    true,
    -Math.PI / 2,
    Math.PI
  );
  const desk = new THREE.Mesh(deskGeom, darkMetalMat);
  desk.position.set(0, 0.8, 0);
  desk.rotation.x = Math.PI / 2; // Lay it horizontally
  cockpitGroup.add(desk);

  // Add an accent ring along the top edge of the desk for visual interest.
  const deskEdgeGeom = new THREE.TorusGeometry(deskRadius + 0.01, 0.01, 8, 64, Math.PI);
  const deskEdge = new THREE.Mesh(deskEdgeGeom, accentMat);
  deskEdge.position.set(0, 0.86, 0);
  deskEdge.rotation.y = Math.PI; // Align the opening
  cockpitGroup.add(deskEdge);

  // --- Orrery Mount ---
  // A small pedestal at the rear of the desk for the miniature solar system.
  const orreryMount = new THREE.Object3D();
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 24), accentMat);
  stand.position.set(0, 0.96, 0);
  orreryMount.add(stand);
  cockpitGroup.add(orreryMount);

  // --- Controls ---
  // Position the throttle on the left side of the desk and the joystick on
  // the right.  The controls sit slightly forward so the player doesn’t
  // overreach.
  const throttleGroup = new THREE.Group();
  const throttleBase = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.2), darkMetalMat);
  const throttleLever = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.35, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.8, roughness: 0.3, emissive: 0x331100 })
  );
  throttleLever.position.y = 0.175;
  const throttlePivot = new THREE.Object3D();
  throttlePivot.add(throttleLever);
  throttleGroup.add(throttleBase, throttlePivot);
  throttleGroup.name = 'Throttle';
  throttleGroup.position.set(-0.5, 0.82, 0.9);
  cockpitGroup.add(throttleGroup);

  const joystickGroup = new THREE.Group();
  const stickBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 32), darkMetalMat);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.3, 16), controlMat);
  stick.position.y = 0.15;
  const stickTop = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), controlMat);
  stickTop.position.y = 0.3;
  const joystickPivot = new THREE.Object3D();
  joystickPivot.add(stick, stickTop);
  joystickGroup.add(stickBase, joystickPivot);
  joystickGroup.name = 'Joystick';
  joystickGroup.position.set(0.5, 0.82, 0.9);
  cockpitGroup.add(joystickGroup);

  // Launch/Fire button near the probe controls (front centre).
  const fireButtonGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 32);
  const fireButtonMat = new THREE.MeshStandardMaterial({ color: 0xff2222, metalness: 0.5, roughness: 0.4, emissive: 0x330000 });
  const fireButton = new THREE.Mesh(fireButtonGeom, fireButtonMat);
  fireButton.name = 'FireButton';
  fireButton.position.set(0, 0.82, 1.05);
  cockpitGroup.add(fireButton);

  // --- Grabbing State ---
  const grabbingThrottle = [false, false];
  const grabbingJoystick = [false, false];

  function startGrabbingThrottle(handIndex) {
    grabbingThrottle[handIndex] = true;
  }
  function stopGrabbingThrottle(handIndex) {
    grabbingThrottle[handIndex] = false;
  }
  function startGrabbingJoystick(handIndex) {
    grabbingJoystick[handIndex] = true;
  }
  function stopGrabbingJoystick(handIndex) {
    grabbingJoystick[handIndex] = false;
  }

  /**
   * Update the orientation of the throttle and joystick based on the
   * fingertip position of the grabbing hand.  This function inverts the
   * axes compared to the previous implementation to make the controls feel
   * natural.  Pulling the throttle back increases the rotation (pushes
   * forward) and pushing the joystick forward tilts the ship forward.
   *
   * @param {number} handIndex
   * @param {THREE.Vector3} tipPosWorld
   */
  function updateGrab(handIndex, tipPosWorld) {
    if (grabbingThrottle[handIndex]) {
      const local = throttleGroup.worldToLocal(tipPosWorld.clone());
      const y = THREE.MathUtils.clamp(local.y, 0, 0.35);
      const angle = THREE.MathUtils.mapLinear(y, 0, 0.35, 0, Math.PI / 2);
      // When the user pulls back (higher y), rotate the lever forwards.
      throttlePivot.rotation.x = angle;
    }
    if (grabbingJoystick[handIndex]) {
      const local = joystickGroup.worldToLocal(tipPosWorld.clone());
      const maxAngle = Math.PI / 4;
      // Invert axes so forward tilt corresponds to positive Z.
      const xAngle = -THREE.MathUtils.clamp(local.x * 2, -maxAngle, maxAngle);
      const yAngle = THREE.MathUtils.clamp(local.z * 2, -maxAngle, maxAngle);
      joystickPivot.rotation.set(yAngle, 0, xAngle);
    }
  }

  return {
    group: cockpitGroup,
    throttle: throttleGroup,
    joystick: joystickGroup,
    throttlePivot,
    joystickPivot,
    fireButton,
    orreryMount,
    startGrabbingThrottle,
    stopGrabbingThrottle,
    startGrabbingJoystick,
    stopGrabbingJoystick,
    updateGrab,
  };
}

// Preserve API compatibility with the older code by re‑exporting the new
// function as createCockpit().  Existing imports that call createCockpit()
// will automatically use the lectern cockpit.
export { createLecternCockpit as createCockpit };
