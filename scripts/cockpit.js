/*
 * cockpit.js (Modified for improved visibility)
 *
 * This module constructs the lectern‑style cockpit used in the VR solar
 * experience.  The original version used very dark materials which made
 * the console difficult to see in VR.  To improve readability the base
 * and accent colours have been brightened.  A facts panel is provided
 * to display planetary statistics and fun facts; its geometry and
 * placement mirror the originals.
 */

import * as THREE from 'three';

/**
 * Creates the lectern‑style cockpit.
 *
 * @returns {object} References to the cockpit group, panels and controls.
 */
export function createLecternCockpit() {
  const cockpitGroup = new THREE.Group();
  cockpitGroup.name = 'Cockpit';
  // Lower the entire console so the panels sit around waist height
  cockpitGroup.position.set(0, -0.6, 0);

  // Lighten the materials so the cockpit is visible under typical lighting
  // conditions.  Previously the dashboard appeared almost black in VR which
  // made it difficult to orient yourself relative to the controls.  The
  // accent and glow colours have also been brightened to complement the
  // neon‑styled UI.
  const BASE_COLOR = 0x555577;
  const ACCENT_COLOR = 0x33aaff;
  const GLOW_COLOR = 0x44bbff;

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
  // Two side panels and a central facts panel.  Each panel uses a basic
  // black material onto which a CanvasTexture will be mapped by the UI
  // system.  A faint glow plane sits behind each panel.

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
  // Dedicated panel for fun facts and body statistics.  Positioned lower
  // than the other panels to avoid overlap with the orrery screen.
  const factsPanel = createPanel('FactsPanel', 0);
  factsPanel.position.y = 0.9;

  // Central orrery screen mount.  A plain Group is used instead of a
  // mesh so only the rendered texture is visible and no dark plane
  // obscures the miniature solar system.
  const orreryMount = new THREE.Group();
  orreryMount.name = 'OrreryMount';
  orreryMount.position.set(0, 1.5, -0.32);
  orreryMount.rotation.x = -0.3;
  cockpitGroup.add(orreryMount);

  // Throttle control.  A pivot object allows the lever to rotate about
  // its base when the user grabs it.  The accent colour and emissive
  // values were brightened along with the rest of the cockpit.
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

  // Joystick control.  Similar structure to the throttle: a pivot object
  // controls rotation of the stick relative to the hand's movement.
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

  // Fire button used for launching probes.  Its colour is bright red
  // for high visibility.
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

  // Probe cannon used to align the launch direction.  Its emissive
  // properties match the joystick accent.
  const cannonGeom = new THREE.CylinderGeometry(0.1, 0.08, 2.0, 16);
  const cannon = new THREE.Mesh(cannonGeom, accentMat);
  cannon.position.set(0, 1.3, -1.6);
  cannon.rotation.x = Math.PI / 2;
  cockpitGroup.add(cannon);

  return {
    group: cockpitGroup,
    leftPanel,
    rightPanel,
    factsPanel,
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
