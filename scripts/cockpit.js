/*
 * cockpit.js
 *
 * Constructs the VR cockpit interior.  The cockpit provides a sense of
 * enclosure for the user, with a floor, a partially transparent
 * canopy to look out into space, a wrap‑around control desk with
 * surfaces for UI elements, and simple throttle and joystick
 * controls.  Sizes are chosen in real‑world metres rather than
 * astronomical units since the cockpit exists at human scale.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';

/**
 * Create the cockpit geometry and return a group containing all
 * components.  Individual control elements (throttle and joystick)
 * and panel surfaces are exposed on the returned object for later
 * interaction.  All dimensions are approximate and can be tuned for
 * ergonomics.
 *
 * @returns {{ group: THREE.Group, throttle: THREE.Object3D, joystick: THREE.Object3D, panels: Array<THREE.Mesh> }}
 */
export function createCockpit() {
  const cockpit = new THREE.Group();
  cockpit.name = 'cockpit';
  // Floor – a simple circular disk.
  const floorRadius = 2.0;
  const floorGeom = new THREE.CylinderGeometry(floorRadius, floorRadius, 0.02, 64);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.2, roughness: 0.7 });
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.rotation.x = Math.PI / 2; // rotate so it's flat
  floor.position.y = -0.01;
  floor.receiveShadow = true;
  cockpit.add(floor);

  // Canopy – an octahedral shell to give a faceted spaceship feel.  The
  // material is semi‑transparent to provide an unobstructed view of
  // space while still conveying the sense of being inside a craft.
  const canopyRadius = 2.3;
  const canopyGeom = new THREE.OctahedronGeometry(canopyRadius, 0);
  const canopyMat = new THREE.MeshBasicMaterial({ color: 0x445566, transparent: true, opacity: 0.1, wireframe: true });
  const canopy = new THREE.Mesh(canopyGeom, canopyMat);
  canopy.position.y = 1.5;
  cockpit.add(canopy);

  // Desk – a curved control surface that wraps around the user.
  // Use a partial cylinder to create the curved shape.  The desk is
  // hollow on the inside (openEnded = true) and has a small height.
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
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide });
  const desk = new THREE.Mesh(deskGeom, deskMat);
  desk.position.y = 0.9;
  desk.rotation.x = Math.PI / 2;
  desk.receiveShadow = true;
  cockpit.add(desk);

  // Desk top surface for UI panels: create planar meshes that sit on
  // top of the curved desk and face upward.  We’ll place three panels
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
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
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
  // also attached to a pivot to allow tilting in two axes.  For
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

  return { group: cockpit, throttle: throttlePivot, joystick: joystickPivot, panels };
}