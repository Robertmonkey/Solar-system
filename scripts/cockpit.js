/*
 * cockpit.js
 *
 * Implements a compact standing console instead of the original seated
 * cockpit.  The previous revision used a single large dashboard panel which
 * looked somewhat like a blank "black hole".  This update splits the dashboard
 * into three smaller screens arranged in a command-centre style layout.  It
 * better resembles the multi-panel look of a sci‑fi bridge while keeping the
 * lectern form factor so players can stand comfortably at the console.
 */

import * as THREE from 'three';

/**
 * Creates the lectern-style cockpit.
 *
 * @returns {object} References to the cockpit group, panels and controls.
 */
export function createLecternCockpit() {
  const cockpitGroup = new THREE.Group();
  cockpitGroup.name = 'Cockpit';
  // Lower the entire console so the panels sit around waist height
  cockpitGroup.position.set(0, -0.6, 0);

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

  // --- Dashboard Panels -------------------------------------------------
  // Instead of one large dashboard there are now two side panels and a
  // central screen for the orrery.  The panels use basic black materials and a
  // subtle glow so the UI textures can be swapped in by the main application.

  const panelGeom = new THREE.PlaneGeometry(0.7, 0.8);
  const createPanel = (name, x) => {
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(panelGeom, mat);
    mesh.name = name;
    mesh.position.set(x, 1.5, -0.3);
    mesh.rotation.x = -0.3;
    cockpitGroup.add(mesh);

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.75, 0.85),
      new THREE.MeshBasicMaterial({
        color: GLOW_COLOR,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    glow.position.set(x, 1.5, -0.31);
    glow.rotation.x = -0.3;
    cockpitGroup.add(glow);

    return mesh;
  };

  const leftPanel = createPanel('LeftPanel', -0.8);
  const rightPanel = createPanel('RightPanel', 0.8);

  // Central orrery screen
  const orreryGeom = new THREE.PlaneGeometry(0.6, 0.6);
  const orreryMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
  const orreryMount = new THREE.Mesh(orreryGeom, orreryMat);
  orreryMount.name = 'OrreryScreen';
  orreryMount.position.set(0, 1.5, -0.32);
  orreryMount.rotation.x = -0.3;
  cockpitGroup.add(orreryMount);

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
    leftPanel,
    rightPanel,
    orreryMount,
    throttle: throttleGroup,
    joystick: joystickGroup,
    throttlePivot,
    joystickPivot,
    fireButton,
    cannon,
  };
}

export { createLecternCockpit as createCockpit };
