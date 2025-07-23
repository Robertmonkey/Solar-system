// Defines the cockpit geometry and controls for the Solar System simulator.
// The cockpit contains a throttle lever, a joystick and a fire button. It
// exposes methods to start and stop grabbing these controls and keeps
// track of current values for use in navigation and flight.

import * as THREE from 'three';

export function createCockpit() {
  const root = new THREE.Group();
  root.name = 'Cockpit';

  // Create a simple desk surface
  const deskGeom = new THREE.BoxGeometry(2.0, 0.1, 1.0);
  const deskMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const desk = new THREE.Mesh(deskGeom, deskMat);
  desk.position.set(0, -0.5, 0);
  root.add(desk);

  // Throttle: vertical slider on the left side of the desk
  const throttleGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 16);
  const throttleMat = new THREE.MeshLambertMaterial({ color: 0x6666ff });
  const throttle = new THREE.Mesh(throttleGeom, throttleMat);
  throttle.position.set(-0.6, -0.3, 0.2);
  root.add(throttle);

  // Joystick: pivoting stick on the right side of the desk
  const joystickGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 16);
  const joystickMat = new THREE.MeshLambertMaterial({ color: 0xff6666 });
  const joystick = new THREE.Mesh(joystickGeom, joystickMat);
  joystick.position.set(0.6, -0.3, 0.2);
  root.add(joystick);

  // Fire button: a small box on the desk to launch probes
  const buttonGeom = new THREE.BoxGeometry(0.2, 0.05, 0.2);
  const buttonMat = new THREE.MeshLambertMaterial({ color: 0x00aa00 });
  const fireButton = new THREE.Mesh(buttonGeom, buttonMat);
  fireButton.position.set(0, -0.45, 0.4);
  root.add(fireButton);

  // Internal state for grabbing
  const throttleGrab = [{ active: false, offsetY: 0 }, { active: false, offsetY: 0 }];
  const joystickGrab = [{ active: false, offset: new THREE.Vector3() }, { active: false, offset: new THREE.Vector3() }];

  // Normalised values exposed to the main loop
  let throttleValue = 0; // 0–1
  const joystickValue = new THREE.Vector2(0, 0); // X and Y tilt

  function startGrabbingThrottle(handIndex, tipPos) {
    throttleGrab[handIndex].active = true;
    // Compute initial offset in local Y of the throttle
    const localPos = throttle.worldToLocal(tipPos.clone());
    throttleGrab[handIndex].offsetY = localPos.y;
  }
  function stopGrabbingThrottle(handIndex) {
    throttleGrab[handIndex].active = false;
  }
  function startGrabbingJoystick(handIndex, tipPos) {
    joystickGrab[handIndex].active = true;
    const localPos = joystick.worldToLocal(tipPos.clone());
    joystickGrab[handIndex].offset.copy(localPos);
  }
  function stopGrabbingJoystick(handIndex) {
    joystickGrab[handIndex].active = false;
  }

  // Called each frame from the main loop to update the throttle and joystick
  // positions based on the fingertips of the hands currently grabbing them.
  function updateGrab(handIndex, tipPos) {
    if (throttleGrab[handIndex].active) {
      const local = throttle.worldToLocal(tipPos.clone());
      // Compute throttle position relative to its centre. Limit movement
      // between -0.2 and 0.2 units on the Y axis.
      let y = local.y - throttleGrab[handIndex].offsetY;
      y = Math.max(-0.2, Math.min(0.2, y));
      throttle.position.y = -0.3 + y;
      throttleValue = (y + 0.2) / 0.4;
    }
    if (joystickGrab[handIndex].active) {
      const local = joystick.worldToLocal(tipPos.clone());
      // Compute deviation from initial grab point
      const delta = local.clone().sub(joystickGrab[handIndex].offset);
      // Clamp tilt in X and Z (forward/back left/right) directions
      const maxTilt = 0.3;
      const tiltX = THREE.MathUtils.clamp(delta.x, -maxTilt, maxTilt);
      const tiltY = THREE.MathUtils.clamp(delta.z, -maxTilt, maxTilt);
      // Rotate the joystick by setting its rotation.x and rotation.z
      joystick.rotation.z = -tiltX * 2; // left/right tilt
      joystick.rotation.x = tiltY * 2; // forward/back tilt
      joystickValue.set(tiltX / maxTilt, tiltY / maxTilt);
    }
  }

  return {
    root,
    throttle,
    joystick,
    fireButton,
    startGrabbingThrottle,
    stopGrabbingThrottle,
    startGrabbingJoystick,
    stopGrabbingJoystick,
    updateGrab,
    get throttleValue() {
      return throttleValue;
    },
    get joystickValue() {
      return joystickValue;
    }
  };
}