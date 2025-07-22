/*
 * cockpit.js
 *
 * Implements a compact standing console instead of the original seated
 * cockpit.  The new layout resembles a high-tech lectern: a single table with
 * an angled screen and the joystick, throttle and fire button mounted on top.
 * The intent is for players to stand at the console and control everything
 * without moving around the room.
 */

import * as THREE from 'three';

/**
 * Creates the lectern-style cockpit.
 *
 * @returns {object} References to the cockpit group, dashboard and controls.
 */
export function createLecternCockpit() {
  const cockpitGroup = new THREE.Group();
  cockpitGroup.name = 'Cockpit';
  cockpitGroup.position.set(0, 0, 0);

  const BASE_COLOR = 0x0e0e12;
  const ACCENT_COLOR = 0x1188bb;
  const GLOW_COLOR = 0x2299ee;

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: BASE_COLOR,
    metalness: 0.9,
    roughness: 0.3,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: ACCENT_COLOR,
    metalness: 1.0,
    roughness: 0.2,
    emissive: GLOW_COLOR,
    emissiveIntensity: 0.6,
  });

  // Floor base
  const floorGeom = new THREE.CylinderGeometry(2.5, 2.5, 0.1, 8);
  const floor = new THREE.Mesh(floorGeom, darkMetalMat);
  floor.receiveShadow = true;
  cockpitGroup.add(floor);

  // Central stand
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.5, 1.2, 16),
    darkMetalMat
  );
  stand.position.y = 0.6;
  cockpitGroup.add(stand);

  // Table top
  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.1, 0.8),
    darkMetalMat
  );
  tableTop.position.y = 1.2;
  tableTop.rotation.x = -0.15;
  cockpitGroup.add(tableTop);

  // Dashboard panel
  const dashboardGeom = new THREE.PlaneGeometry(1.4, 0.8);
  const dashboardMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.DoubleSide,
  });
  const dashboard = new THREE.Mesh(dashboardGeom, dashboardMat);
  dashboard.name = 'DashboardPanel';
  dashboard.position.set(0, 1.5, -0.3);
  dashboard.rotation.x = -0.3;
  cockpitGroup.add(dashboard);

  const dashGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.9),
    new THREE.MeshBasicMaterial({
      color: GLOW_COLOR,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  );
  dashGlow.position.set(0, 1.5, -0.31);
  dashGlow.rotation.x = -0.3;
  cockpitGroup.add(dashGlow);

  // Throttle control
  const throttleGroup = new THREE.Group();
  const throttleBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.05, 0.2),
    darkMetalMat
  );
  const throttleLever = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.3, 0.04),
    new THREE.MeshStandardMaterial({
      color: ACCENT_COLOR,
      metalness: 0.9,
      roughness: 0.3,
      emissive: GLOW_COLOR,
    })
  );
  throttleLever.position.y = 0.15;
  const throttlePivot = new THREE.Object3D();
  throttlePivot.add(throttleLever);
  const throttleRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.01, 8, 16),
    accentMat
  );
  throttleRing.rotation.x = Math.PI / 2;
  throttleGroup.add(throttleBase, throttleRing, throttlePivot);
  throttleGroup.name = 'Throttle';
  throttleGroup.position.set(-0.4, 1.25, 0.15);
  cockpitGroup.add(throttleGroup);

  // Joystick control
  const joystickGroup = new THREE.Group();
  const stickBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 0.04, 32),
    darkMetalMat
  );
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.02, 0.25, 16),
    new THREE.MeshStandardMaterial({
      color: ACCENT_COLOR,
      metalness: 0.8,
      roughness: 0.4,
    })
  );
  stick.position.y = 0.125;
  const stickTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 16, 16),
    new THREE.MeshStandardMaterial({
      color: ACCENT_COLOR,
      metalness: 0.6,
      roughness: 0.3,
      emissive: GLOW_COLOR,
    })
  );
  stickTop.position.y = 0.25;
  const joystickPivot = new THREE.Object3D();
  joystickPivot.add(stick, stickTop);
  const joystickRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.01, 8, 16),
    accentMat
  );
  joystickRing.rotation.x = Math.PI / 2;
  joystickGroup.add(stickBase, joystickRing, joystickPivot);
  joystickGroup.name = 'Joystick';
  joystickGroup.position.set(0.4, 1.25, 0.15);
  cockpitGroup.add(joystickGroup);

  // Fire button
  const fireButtonGeom = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 32);
  const fireButtonMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    metalness: 0.5,
    roughness: 0.5,
    emissive: 0x550000,
  });
  const fireButton = new THREE.Mesh(fireButtonGeom, fireButtonMat);
  fireButton.name = 'FireButton';
  fireButton.position.set(0, 1.22, 0.3);
  cockpitGroup.add(fireButton);

  // Probe cannon
  const cannonGeom = new THREE.CylinderGeometry(0.1, 0.08, 2.0, 16);
  const cannon = new THREE.Mesh(cannonGeom, accentMat);
  cannon.position.set(0, 1.3, -1.6);
  cannon.rotation.x = Math.PI / 2;
  cockpitGroup.add(cannon);

  return {
    group: cockpitGroup,
    dashboard,
    throttle: throttleGroup,
    joystick: joystickGroup,
    throttlePivot,
    joystickPivot,
    fireButton,
    cannon,
  };
}

export { createLecternCockpit as createCockpit };
