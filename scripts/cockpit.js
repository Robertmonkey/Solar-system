/*
 * cockpit.js (Major Refactor)
 *
 * This module is completely redesigned to build a stylish and ergonomic dashboard-style cockpit.
 * - Replaces the old floor, desk, and panels with a cohesive design.
 * - Features a large, curved central dashboard for the main UI.
 * - Includes angled side-consoles for the throttle and joystick.
 * - The floor is now a larger hexagonal plate, correctly positioned under the user.
 */

import * as THREE from 'three';

/**
 * Creates a new dashboard-style cockpit.
 * @returns An object containing the main cockpit group and references to
 * interactive parts like the dashboard panel, throttle, joystick, fire button,
 * and cannon for external manipulation.
 */
export function createDashboardCockpit() {
  const cockpitGroup = new THREE.Group();
  cockpitGroup.name = 'Cockpit';
  cockpitGroup.position.set(0, 0, 0);
  cockpitGroup.scale.set(0.6, 0.6, 0.6);

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a20,
    metalness: 0.9,
    roughness: 0.3,
  });
  // Materials for new decorative elements
  const seatMat = new THREE.MeshStandardMaterial({
    color: 0x222233,
    metalness: 0.7,
    roughness: 0.5,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x224466,
    metalness: 0.9,
    roughness: 0.2,
    emissive: 0x112244,
    emissiveIntensity: 0.5,
  });

  // --- Floor ---
  const floorGeom = new THREE.CylinderGeometry(2.5, 2.5, 0.1, 6);
  const floor = new THREE.Mesh(floorGeom, darkMetalMat);
  floor.position.y = -0.05;
  floor.receiveShadow = true;
  cockpitGroup.add(floor);

  // --- Pilot Seat ---
  const seatGroup = new THREE.Group();
  // CHANGED: Applying the better chair fix.
  seatGroup.rotation.y = Math.PI; // Rotate to face dashboard
  seatGroup.position.z = 0.2;
  const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.6), seatMat);
  seatBase.position.set(0, 0.65, -0.3);
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.1), seatMat);
  // Position back at a negative Z before rotation so it ends up behind the player.
  seatBack.position.set(0, 1.15, -0.6);
  const seatLeftArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.5), seatMat);
  seatLeftArm.position.set(-0.35, 0.8, -0.3);
  const seatRightArm = seatLeftArm.clone();
  seatRightArm.position.set(0.35, 0.8, -0.3);
  seatGroup.add(seatBase, seatBack, seatLeftArm, seatRightArm);
  cockpitGroup.add(seatGroup);

  // Floor accent ring
  const ringGeom = new THREE.TorusGeometry(1.8, 0.02, 8, 32);
  const floorRing = new THREE.Mesh(ringGeom, accentMat);
  floorRing.rotation.x = Math.PI / 2;
  floorRing.position.y = 0.01;
  cockpitGroup.add(floorRing);

  // --- Canopy ---
  // CHANGED: Enlarged and raised the canopy for better headroom.
  const canopyGeom = new THREE.SphereGeometry(4.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const canopyMat = new THREE.MeshBasicMaterial({
    color: 0x88aaff,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
  });
  const canopy = new THREE.Mesh(canopyGeom, canopyMat);
  canopy.position.y = 1.7;
  canopy.rotation.x = Math.PI / 2;
  cockpitGroup.add(canopy);

  // --- Overhead Crossbar with Lights ---
  const crossbarGeom = new THREE.CylinderGeometry(0.02, 0.02, 2.2, 8);
  const crossbar = new THREE.Mesh(crossbarGeom, darkMetalMat);
  crossbar.position.set(0, 2.2, -0.3);
  crossbar.rotation.z = Math.PI / 2;
  cockpitGroup.add(crossbar);

  const cabinLightLeft = new THREE.PointLight(0x66ccff, 0.5, 4);
  cabinLightLeft.position.set(-1.0, 0, 0);
  crossbar.add(cabinLightLeft);

  const cabinLightRight = new THREE.PointLight(0x66ccff, 0.5, 4);
  cabinLightRight.position.set(1.0, 0, 0);
  crossbar.add(cabinLightRight);

  // --- Main Dashboard ---
  const dashboardGeom = new THREE.CylinderGeometry(1.4, 1.4, 0.9, 40, 1, true, -0.9, 1.8);
  const dashboardMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const dashboard = new THREE.Mesh(dashboardGeom, dashboardMat);
  dashboard.name = "DashboardPanel";
  dashboard.position.set(0, 1.05, -0.65);
  dashboard.rotation.set(-0.35, 0, 0);
  dashboard.scale.z = -1;
  cockpitGroup.add(dashboard);

  // --- Side Consoles ---
  const consoleGeom = new THREE.BoxGeometry(0.55, 0.1, 0.7);
  const leftConsole = new THREE.Mesh(consoleGeom, darkMetalMat);
  leftConsole.position.set(-0.55, 0.8, -0.25);
  leftConsole.rotation.y = 0.25;
  cockpitGroup.add(leftConsole);
  const rightConsole = new THREE.Mesh(consoleGeom, darkMetalMat);
  rightConsole.position.set(0.55, 0.8, -0.25);
  rightConsole.rotation.y = -0.25;
  cockpitGroup.add(rightConsole);

  // --- Controls ---
  const throttleGroup = new THREE.Group();
  const throttleBase = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.2), darkMetalMat);
  const throttleLever = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.3, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.8, roughness: 0.3, emissive: 0x331100 })
  );
  throttleLever.position.y = 0.15;
  const throttlePivot = new THREE.Object3D();
  throttlePivot.add(throttleLever);
  throttleGroup.add(throttleBase, throttlePivot);
  throttleGroup.name = "Throttle";
  leftConsole.add(throttleGroup);
  throttleGroup.position.set(0, 0.05, 0);

  const joystickGroup = new THREE.Group();
  const stickBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 32), darkMetalMat);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.25, 16), new THREE.MeshStandardMaterial({ color: 0x00aaff, metalness: 0.8, roughness: 0.4 }));
  stick.position.y = 0.125;
  const stickTop = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), new THREE.MeshStandardMaterial({ color: 0x0066cc, metalness: 0.6, roughness: 0.3, emissive: 0x001133 }));
  stickTop.position.y = 0.25;
  const joystickPivot = new THREE.Object3D();
  joystickPivot.add(stick, stickTop);
  joystickGroup.add(stickBase, joystickPivot);
  joystickGroup.name = "Joystick";
  rightConsole.add(joystickGroup);
  joystickGroup.position.set(0, 0.05, 0);
  
  const fireButtonGeom = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 32);
  const fireButtonMat = new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.5, roughness: 0.5, emissive: 0x550000 });
  const fireButton = new THREE.Mesh(fireButtonGeom, fireButtonMat);
  fireButton.name = "FireButton";
  rightConsole.add(fireButton);
  fireButton.position.set(0, 0.07, 0.25);

  // --- Probe Cannon ---
  const cannonGeom = new THREE.CylinderGeometry(0.1, 0.08, 2.0, 16);
  const cannonMat = new THREE.MeshStandardMaterial({ color: 0xbbbbff, metalness: 0.9, roughness: 0.2 });
  const cannon = new THREE.Mesh(cannonGeom, cannonMat);
  cannon.position.set(0, -0.2, -2.5);
  cannon.rotation.x = Math.PI / 2;
  cockpitGroup.add(cannon);

  return {
    group: cockpitGroup,
    dashboard: dashboard,
    throttle: throttleGroup,
    joystick: joystickGroup,
    throttlePivot,
    joystickPivot,
    fireButton,
    cannon,
  };
}

// Export the new function
export { createDashboardCockpit as createCockpit };
