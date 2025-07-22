/*
 * cockpit.js (Refactored)
 *
 * Constructs the VR cockpit interior. This version features:
 * - A correctly positioned and sized floor plate under the user.
 * - A lighter, wireframe canopy for better visibility.
 * - A wrap-around control desk.
 * - Physical models for a throttle, joystick, and a large red fire button.
 * - A probe-launching cannon extending from the front of the ship.
 * - Exports handles to the interactive elements (throttle, joystick, etc.).
 */

import * as THREE from 'three';

/**
 * Creates the cockpit geometry and returns a group containing all components.
 * @returns An object containing the main cockpit group and references to
 * interactive parts like the throttle, joystick, panels, fire button,
 * and cannon for external manipulation.
 */
export function createCockpit() {
  const cockpitGroup = new THREE.Group();
  cockpitGroup.name = 'Cockpit';
  // Position the entire cockpit at the scene origin. The camera will be at (0, 1.6, 0)
  // inside it, simulating standing on the floor.
  cockpitGroup.position.set(0, 0, 0);

  // --- Floor ---
  // A dark, metallic circular platform.
  const floorGeom = new THREE.CylinderGeometry(2.5, 2.5, 0.05, 64);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x222228,
    metalness: 0.8,
    roughness: 0.4
  });
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.receiveShadow = true;
  // Position the top of the floor at y=0, so the user "stands" on it.
  floor.position.y = -0.025;
  cockpitGroup.add(floor);


  // --- Canopy ---
  // A diamond-shaped, wireframe structure for a "spaceship" feel.
  const canopyGeom = new THREE.OctahedronGeometry(2.8, 1);
  const canopyMat = new THREE.MeshBasicMaterial({
    color: 0x88aaff,
    wireframe: true,
    transparent: true,
    opacity: 0.2
  });
  const canopy = new THREE.Mesh(canopyGeom, canopyMat);
  canopy.position.y = 1.5;
  cockpitGroup.add(canopy);

  // --- Desk ---
  // A curved control surface that wraps around the user.
  const deskHeight = 0.9; // Chest height
  const deskGeom = new THREE.TorusGeometry(1.4, 0.2, 16, 48, Math.PI * 0.8);
  const deskMat = new THREE.MeshStandardMaterial({
    color: 0x333338,
    metalness: 0.9,
    roughness: 0.3,
    side: THREE.DoubleSide
  });
  const desk = new THREE.Mesh(deskGeom, deskMat);
  desk.position.y = deskHeight;
  desk.rotation.x = Math.PI / 2;
  desk.rotation.z = Math.PI - (Math.PI * 0.8 / 2); // Center the opening
  cockpitGroup.add(desk);

  // --- UI Panels ---
  // Three flat panels sitting on top of the desk for UI displays.
  const panels = [];
  const panelCount = 3;
  const panelWidth = 0.7;
  const panelHeight = 0.4;
  const panelGeom = new THREE.PlaneGeometry(panelWidth, panelHeight);

  for (let i = 0; i < panelCount; i++) {
    // A basic material that will be replaced by a CanvasTexture in ui.js
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x050510, side: THREE.DoubleSide });
    const panel = new THREE.Mesh(panelGeom, panelMat);

    // Position panels along an arc in front of the user
    const angle = (i - 1) * 1.0; // -1.0 rad, 0 rad, 1.0 rad
    const radius = 1.2;
    panel.position.set(
      radius * Math.sin(angle),
      deskHeight + 0.12,
      -radius * Math.cos(angle)
    );
    panel.rotation.x = -Math.PI / 2.5; // Tilted for easy viewing
    panel.rotation.y = angle;
    cockpitGroup.add(panel);
    panels.push(panel);
  }

  // --- Throttle Control ---
  const throttleGroup = new THREE.Group();
  const throttleBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.04, 0.15),
    deskMat
  );
  const throttleLever = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.25, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.8, roughness: 0.3 })
  );
  throttleLever.position.y = 0.125;
  const throttlePivot = new THREE.Object3D(); // Pivot for rotation
  throttlePivot.add(throttleLever);
  throttleGroup.add(throttleBase, throttlePivot);
  throttleGroup.position.set(-0.8, deskHeight, -0.8);
  cockpitGroup.add(throttleGroup);

  // --- Joystick Control ---
  const joystickGroup = new THREE.Group();
  const stickBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 0.04, 32),
    deskMat
  );
  const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.02, 0.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x00aaff, metalness: 0.8, roughness: 0.4 })
  );
  stick.position.y = 0.1;
  const stickTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x0066cc, metalness: 0.6, roughness: 0.3 })
  );
  stickTop.position.y = 0.2;
  const joystickPivot = new THREE.Object3D(); // Pivot for tilting
  joystickPivot.add(stick, stickTop);
  joystickGroup.add(stickBase, joystickPivot);
  joystickGroup.position.set(0.8, deskHeight, -0.8);
  cockpitGroup.add(joystickGroup);

  // --- Fire Button ---
  const fireButtonGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 32);
  const fireButtonMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    metalness: 0.5,
    roughness: 0.5,
    emissive: 0x330000 // Gives it a slight glow
  });
  const fireButton = new THREE.Mesh(fireButtonGeom, fireButtonMat);
  fireButton.name = "FireButton"; // For easy identification in raycasting
  fireButton.position.set(0, deskHeight, -1.2);
  cockpitGroup.add(fireButton);

  // --- Probe Cannon ---
  const cannonGeom = new THREE.CylinderGeometry(0.1, 0.08, 1.5, 16);
  const cannonMat = new THREE.MeshStandardMaterial({ color: 0xbbbbff, metalness: 0.9, roughness: 0.2 });
  const cannon = new THREE.Mesh(cannonGeom, cannonMat);
  // Position it to extend from under the front of the cockpit floor
  cannon.position.set(0, 0.2, -2.0);
  cannon.rotation.x = Math.PI / 2; // Point forward
  cockpitGroup.add(cannon);

  return {
    group: cockpitGroup,
    panels,
    throttle: throttlePivot,
    joystick: joystickPivot,
    fireButton,
    cannon
  };
}
