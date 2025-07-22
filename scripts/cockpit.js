/*
 * cockpit.js (modified)
 *
 * Constructs the VR cockpit interior.  In this version the floor is
 * larger, lighter and positioned beneath the user rather than behind
 * them.  A visible cannon emerges from the front of the cockpit and a
 * red fire button sits on the desk for launching probes.  The desk,
 * canopy and panels retain their original layout but colours and
 * opacity have been adjusted slightly for better visibility.  The
 * returned object exposes the throttle and joystick pivots, panels,
 * fireButton and cannon for downstream interaction.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';

/**
 * Create the cockpit geometry and return a group containing all
 * components.  Individual control elements (throttle and joystick),
 * panels, the fire button and the forward‑facing cannon are exposed
 * on the returned object for later interaction.
 *
 * @returns {{ group: THREE.Group, throttle: THREE.Object3D, joystick: THREE.Object3D, panels: Array, fireButton: THREE.Object3D, cannon: THREE.Object3D }}
 */
export function createCockpit() {
  const cockpit = new THREE.Group();
  cockpit.name = 'cockpit';
  // Floor – a larger, lighter circular disk positioned underfoot.  A bigger
  // radius helps avoid the sensation of a tiny platform floating behind the
  // user.
  const floorRadius = 3.0;
  const floorGeom = new THREE.CylinderGeometry(floorRadius, floorRadius, 0.02, 64);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.2, roughness: 0.7 });
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.rotation.x = Math.PI / 2; // rotate so it's flat
  floor.position.y = 0.0;
  floor.receiveShadow = true;
  cockpit.add(floor);

  // Canopy – a faceted shell to give a spaceship feel.  Increase opacity
  // slightly and lighten colour so the cockpit interior is less gloomy.
  const canopyRadius = 2.3;
  const canopyGeom = new THREE.OctahedronGeometry(canopyRadius, 0);
  const canopyMat = new THREE.MeshBasicMaterial({ color: 0x556677, transparent: true, opacity: 0.2, wireframe: true });
  const canopy = new THREE.Mesh(canopyGeom, canopyMat);
  canopy.position.y = 1.5;
  cockpit.add(canopy);

  // Desk – a curved control surface that wraps around the user.  Colours
  // are brightened slightly for contrast against the floor.
  const deskInnerRadius = 1.3;
  const deskThickness = 0.2;
  const deskHeight = 0.1;
  const deskThetaStart = Math.PI / 6; // 30 degrees
  const deskThetaLength = Math.PI - 2 * deskThetaStart; // 120 degrees span
  const deskGeom = new THREE.CylinderGeometry(
    deskInnerRadius + deskThickness,
    deskInnerRadius + deskThickness,
    deskHeight,
    32,
    1,
    true,
    deskThetaStart,
    deskThetaLength
  );
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide });
  const desk = new THREE.Mesh(deskGeom, deskMat);
  desk.position.y = 0.9;
  desk.rotation.x = Math.PI / 2;
  desk.receiveShadow = true;
  cockpit.add(desk);

  // Desk top surface for UI panels: create planar meshes that sit on
  // top of the curved desk and face upward.  We place three panels
  // evenly spaced along the desk’s arc: left (warp/navigation), centre
  // (map/info) and right (probe control).  Each panel is a simple
  // rectangle with an unassigned texture.  Consumers of this module
  // can assign a texture later.
  const panels = [];
  const panelCount = 3;
  const panelWidth = 0.8;
  const panelHeight = 0.4;
  for (let i = 0; i < panelCount; i++) {
    const panelGeom = new THREE.PlaneGeometry(panelWidth, panelHeight);
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide });
    const panel = new THREE.Mesh(panelGeom, panelMat);
    // Position panels along the arc.  Parameter u goes from -0.5 to 0.5.
    const u = (i - (panelCount - 1) / 2) / (panelCount - 1);
    const angle = deskThetaStart + (deskThetaLength / 2) * (1 - u);
    const radius = deskInnerRadius + deskThickness - 0.05;
    panel.position.set(
      radius * Math.cos(angle),
      desk.position.y + deskHeight / 2 + 0.02,
      -radius * Math.sin(angle)
    );
    panel.rotation.y = Math.PI / 2 - angle;
    panel.rotation.x = -Math.PI / 2;
    cockpit.add(panel);
    panels.push(panel);
  }

  // Throttle – a simple lever that pivots around its base.  Create
  // a box for the base and a slender cuboid for the lever arm.  The
  // lever is attached to a pivot object so it can be rotated easily.
  const throttleBaseGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16);
  const throttleBaseMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.3 });
  const throttleBase = new THREE.Mesh(throttleBaseGeom, throttleBaseMat);
  const throttleArmGeom = new THREE.BoxGeometry(0.02, 0.25, 0.02);
  const throttleArmMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.3, roughness: 0.5 });
  const throttleArm = new THREE.Mesh(throttleArmGeom, throttleArmMat);
  throttleArm.position.y = 0.125;
  // Pivot for the arm so that we can rotate it.
  const throttlePivot = new THREE.Object3D();
  throttlePivot.add(throttleArm);
  // Create a group for the throttle combining base and pivot.
  const throttle = new THREE.Group();
  throttle.add(throttleBase);
  throttle.add(throttlePivot);
  throttle.position.set(-0.6, desk.position.y + 0.05, -0.6);
  cockpit.add(throttle);

  // Joystick – a vertical stick with a spherical top.  This control is
  // attached to a pivot to allow tilting in two axes.  For
  // simplicity the pivot is a single Object3D and the code that
  // manipulates the joystick can set its rotation.x and rotation.z.
  const stickBaseGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16);
  const stickBase = new THREE.Mesh(stickBaseGeom, throttleBaseMat);
  const stickGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 16);
  const stickMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, metalness: 0.3, roughness: 0.4 });
  const stick = new THREE.Mesh(stickGeom, stickMat);
  stick.position.y = 0.125;
  const stickTopGeom = new THREE.SphereGeometry(0.04, 16, 16);
  const stickTop = new THREE.Mesh(stickTopGeom, new THREE.MeshStandardMaterial({ color: 0x0066cc, metalness: 0.5, roughness: 0.4 }));
  stickTop.position.y = 0.25;
  const joystickPivot = new THREE.Object3D();
  joystickPivot.add(stick);
  joystickPivot.add(stickTop);
  const joystick = new THREE.Group();
  joystick.add(stickBase);
  joystick.add(joystickPivot);
  joystick.position.set(0.6, desk.position.y + 0.05, -0.6);
  cockpit.add(joystick);

  // Cannon – a forward‑facing barrel that extends from beneath the floor.
  // The cannon provides a visual reference for where probes will launch.
  const cannonGeom = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 12);
  const cannonMat = new THREE.MeshStandardMaterial({ color: 0x7777ff, metalness: 0.5, roughness: 0.3 });
  const cannon = new THREE.Mesh(cannonGeom, cannonMat);
  cannon.rotation.x = Math.PI / 2; // point forward along -Z
  // Position the cannon so that it appears to emerge from the floor in front of the user.
  cannon.position.set(0.0, 0.6, -1.5);
  cockpit.add(cannon);

  // Fire Button – a red button on the desk used to launch probes.  It sits
  // conveniently within reach near the centre of the control surface.
  const fireButtonGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16);
  const fireButtonMat = new THREE.MeshStandardMaterial({ color: 0xff3333, metalness: 0.3, roughness: 0.4 });
  const fireButton = new THREE.Mesh(fireButtonGeom, fireButtonMat);
  fireButton.position.set(0.0, desk.position.y + 0.08, -0.3);
  cockpit.add(fireButton);

  return { group: cockpit, throttle: throttlePivot, joystick: joystickPivot, panels, fireButton, cannon };
}