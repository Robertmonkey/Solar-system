/*
 * cockpit.js
 *
 * Completely reworks the cockpit layout.  The prior implementation used a
 * cramped cylindrical dashboard with side consoles.  Users complained that
 * the controls were hard to reach and the overall look felt dated.  This
 * version builds a more open cockpit with a flat dashboard panel, a wider
 * floor, and repositioned controls.  The throttle and joystick sit on low
 * pedestals beside the seat and the dashboard is a large plane directly in
 * front of the pilot.  The canopy and lighting remain mostly unchanged.
 *
 * This second rework focuses on style.  Materials and lights now follow a
 * cohesive blue‑neon theme and subtle glow elements were added around the
 * dashboard to give the cockpit a high‑tech feel.
*/

import * as THREE from 'three';

/**
 * Creates a new dashboard‑style cockpit.
 *
 * @returns An object containing the main cockpit group and references to
 *          interactive parts like the dashboard panel, throttle, joystick,
 *          fire button and cannon for external manipulation.
 */
export function createReworkedCockpit() {
  const cockpitGroup = new THREE.Group();
  cockpitGroup.name = 'Cockpit';
  cockpitGroup.position.set(0, 0, 0);
  // Slightly larger overall scale for comfort
  cockpitGroup.scale.set(0.75, 0.75, 0.75);

  const BASE_COLOR = 0x0e0e12;
  const ACCENT_COLOR = 0x1188bb;
  const GLOW_COLOR = 0x2299ee;
  const SEAT_COLOR = 0x1b1f27;

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: BASE_COLOR,
    metalness: 0.9,
    roughness: 0.3,
  });
  // Materials for new decorative elements
  const seatMat = new THREE.MeshStandardMaterial({
    color: SEAT_COLOR,
    metalness: 0.6,
    roughness: 0.5,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: ACCENT_COLOR,
    metalness: 1.0,
    roughness: 0.2,
    emissive: GLOW_COLOR,
    emissiveIntensity: 0.6,
  });

  // --- Floor ---
  // Slightly wider hexagonal floor for a roomier feel
  const floorGeom = new THREE.CylinderGeometry(3.2, 3.2, 0.1, 8);
  const floor = new THREE.Mesh(floorGeom, darkMetalMat);
  floor.position.y = -0.05;
  floor.receiveShadow = true;
  cockpitGroup.add(floor);

  // --- Pilot Seat ---
  const seatGroup = new THREE.Group();
  // CHANGED: Applying the better chair fix.
  seatGroup.rotation.y = Math.PI; // face forward
  seatGroup.position.z = 0.3;
  const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.7), seatMat);
  seatBase.position.set(0, 0.55, -0.25);
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.1), seatMat);
  seatBack.position.set(0, 1.0, -0.55);
  const seatLeftArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.6), accentMat);
  seatLeftArm.position.set(-0.4, 0.75, -0.3);
  const seatRightArm = seatLeftArm.clone();
  seatRightArm.position.set(0.4, 0.75, -0.3);
  seatGroup.add(seatBase, seatBack, seatLeftArm, seatRightArm);
  cockpitGroup.add(seatGroup);

  // Floor accent ring
  const ringGeom = new THREE.TorusGeometry(2.4, 0.02, 8, 32);
  const floorRing = new THREE.Mesh(ringGeom, accentMat);
  floorRing.rotation.x = Math.PI / 2;
  floorRing.position.y = 0.01;
  cockpitGroup.add(floorRing);

  const glowRingMat = new THREE.MeshBasicMaterial({
    color: GLOW_COLOR,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
  });
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.05, 8, 32), glowRingMat);
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.02;
  cockpitGroup.add(glowRing);

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
  const crossbar = new THREE.Mesh(crossbarGeom, accentMat);
  crossbar.position.set(0, 2.2, -0.3);
  crossbar.rotation.z = Math.PI / 2;
  cockpitGroup.add(crossbar);

  const cabinLightLeft = new THREE.PointLight(GLOW_COLOR, 0.6, 4);
  cabinLightLeft.position.set(-1.0, 0, 0);
  crossbar.add(cabinLightLeft);

  const cabinLightRight = new THREE.PointLight(GLOW_COLOR, 0.6, 4);
  cabinLightRight.position.set(1.0, 0, 0);
  crossbar.add(cabinLightRight);

  // --- Main Dashboard ---
  // Flat rectangular dashboard directly in front of the pilot
  const dashboardGeom = new THREE.PlaneGeometry(2.8, 1.4);
  const dashboardMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
  const dashboard = new THREE.Mesh(dashboardGeom, dashboardMat);
  dashboard.name = 'DashboardPanel';
  dashboard.position.set(0, 1.25, -0.8);
  dashboard.rotation.x = -0.4;
  cockpitGroup.add(dashboard);

  const dashGlowMat = new THREE.MeshBasicMaterial({
    color: GLOW_COLOR,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const dashGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.6), dashGlowMat);
  dashGlow.position.set(0, 1.25, -0.81);
  dashGlow.rotation.x = -0.4;
  cockpitGroup.add(dashGlow);

  // --- Side Consoles ---
  // Low pedestals on either side of the seat for the throttle/joystick
  const consoleGeom = new THREE.BoxGeometry(0.4, 0.1, 0.5);
  const leftConsole = new THREE.Mesh(consoleGeom, darkMetalMat);
  leftConsole.position.set(-0.5, 0.65, -0.2);
  leftConsole.rotation.y = 0.15;
  cockpitGroup.add(leftConsole);
  const rightConsole = new THREE.Mesh(consoleGeom, darkMetalMat);
  rightConsole.position.set(0.5, 0.65, -0.2);
  rightConsole.rotation.y = -0.15;
  cockpitGroup.add(rightConsole);

  // --- Controls ---
  const throttleGroup = new THREE.Group();
  const throttleBase = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.2), darkMetalMat);
  const throttleLever = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.3, 0.04),
    new THREE.MeshStandardMaterial({ color: ACCENT_COLOR, metalness: 0.9, roughness: 0.3, emissive: GLOW_COLOR })
  );
  throttleLever.position.y = 0.15;
  const throttlePivot = new THREE.Object3D();
  throttlePivot.add(throttleLever);
  const throttleRing = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.01, 8, 16), accentMat);
  throttleRing.rotation.x = Math.PI / 2;
  throttleGroup.add(throttleBase, throttleRing, throttlePivot);
  throttleGroup.name = 'Throttle';
  leftConsole.add(throttleGroup);
  throttleGroup.position.set(0, 0.05, 0.05);

  const joystickGroup = new THREE.Group();
  const stickBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 32), darkMetalMat);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.25, 16), new THREE.MeshStandardMaterial({ color: ACCENT_COLOR, metalness: 0.8, roughness: 0.4 }));
  stick.position.y = 0.125;
  const stickTop = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), new THREE.MeshStandardMaterial({ color: ACCENT_COLOR, metalness: 0.6, roughness: 0.3, emissive: GLOW_COLOR }));
  stickTop.position.y = 0.25;
  const joystickPivot = new THREE.Object3D();
  joystickPivot.add(stick, stickTop);
  const joystickRing = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.01, 8, 16), accentMat);
  joystickRing.rotation.x = Math.PI / 2;
  joystickGroup.add(stickBase, joystickRing, joystickPivot);
  joystickGroup.name = 'Joystick';
  rightConsole.add(joystickGroup);
  joystickGroup.position.set(0, 0.05, 0.05);

  const fireButtonGeom = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 32);
  const fireButtonMat = new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.5, roughness: 0.5, emissive: 0x550000 });
  const fireButton = new THREE.Mesh(fireButtonGeom, fireButtonMat);
  fireButton.name = 'FireButton';
  rightConsole.add(fireButton);
  fireButton.position.set(0, 0.07, 0.2);

  // --- Probe Cannon ---
  const cannonGeom = new THREE.CylinderGeometry(0.1, 0.08, 2.0, 16);
  const cannon = new THREE.Mesh(cannonGeom, accentMat);
  cannon.position.set(0, -0.2, -2.7);
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

// Export the new function with a friendly alias.  This preserves the
// external API expected by main.js while allowing the implementation
// details to evolve over time.  Note: the alias is re‑exported at
// the bottom so consumers can continue to import { createCockpit }.
export { createReworkedCockpit as createCockpit };
