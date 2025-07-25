/*
 * lecternCockpit.js
 *
 * This version features a corrected desk color, a more compact control layout
 * with desk-mounted labels, and removes the orrery mount.
 */

import * as THREE from 'three';
import { COLORS } from './constants.js';
import { createLabel } from './utils.js'; // Import the shared label utility

export function createLecternCockpit() {
  const cockpitGroup = new THREE.Group();
  cockpitGroup.name = 'LecternCockpit';

  const loader = new THREE.TextureLoader();
  const detailTexture = loader.load('./textures/ui.png');
  detailTexture.wrapS = THREE.RepeatWrapping; detailTexture.wrapT = THREE.RepeatWrapping;
  detailTexture.repeat.set(8, 8);

  // --- FIX: Restored stylish color from constants.js ---
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: COLORS.cockpitBase, metalness: 0.9, roughness: 0.4,
    roughnessMap: detailTexture, metalnessMap: detailTexture
  });
  
  const controlMaterial = new THREE.MeshStandardMaterial({ color: COLORS.controlBase });
  const highlightMaterial = new THREE.MeshStandardMaterial({ color: COLORS.uiHighlight });

  // ... (Holographic Floor remains the same) ...
  const floor = new THREE.Mesh( new THREE.PlaneGeometry(4, 4), /* ... */ );
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; cockpitGroup.add(floor);

  // --- Probe Cannon ---
  const launcherGeom = new THREE.CylinderGeometry(0.2, 0.25, 20, 16);
  const launcherBarrel = new THREE.Mesh(launcherGeom, darkMetalMat);
  launcherBarrel.rotation.x = Math.PI / 2;
  launcherBarrel.position.set(0, -0.2, 9); // Under the floor, extending forward
  cockpitGroup.add(launcherBarrel);
  const launcherMuzzle = new THREE.Object3D();
  launcherMuzzle.position.set(0, 0, 10); // Tip of the barrel
  launcherBarrel.add(launcherMuzzle);

  // --- Enlarged Lectern Desk & Support ---
  const desk = new THREE.Mesh( new THREE.CylinderGeometry(1.2, 1.2, 0.08, 64, 1, false, Math.PI / 2.5, Math.PI * 2 - (Math.PI / 2.5) * 2), darkMetalMat);
  desk.position.set(0, 1.0, -0.2);
  cockpitGroup.add(desk);
  const support = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 1.0, 16), darkMetalMat);
  support.position.set(0, 0.5, 0.24);
  cockpitGroup.add(support);

  // --- Controls (New Layout) ---
  const controlY = 1.04; // Y position for top of desk
  const controlZ = -0.7; // Closer to the front
  
  // --- Redesigned Throttle ---
  const throttleGroup = new THREE.Group();
  const throttleBase = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.4), darkMetalMat);
  const throttleLever = new THREE.Group();
  const leverArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2), darkMetalMat);
  leverArm.position.y = 0.1;
  const leverHandle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.06), highlightMaterial);
  leverHandle.position.y = 0.2;
  leverArm.add(leverHandle);
  throttleLever.add(leverArm);
  throttleGroup.add(throttleBase, throttleLever);
  throttleGroup.name = 'Throttle';
  throttleGroup.position.set(-0.4, controlY, controlZ); // Closer together
  cockpitGroup.add(throttleGroup);

  // --- Labeled Joystick ---
  const joystickGroup = new THREE.Group();
  const stickBase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.04, 32), darkMetalMat);
  joystickGroup.add(stickBase);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.2, 16), darkMetalMat);
  stick.position.y = 0.1;
  const stickTop = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), controlMaterial);
  stickTop.position.y = 0.2; stick.add(stickTop);
  stick.name = 'stick_visual';
  joystickGroup.add(stick);
  joystickGroup.name = 'Joystick';
  joystickGroup.position.set(0.4, controlY, controlZ); // Closer together
  cockpitGroup.add(joystickGroup);

  // --- Fire Button ---
  const fireButton = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 32), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0x550000 }));
  fireButton.name = 'FireButton';
  fireButton.position.set(0, controlY, controlZ);
  cockpitGroup.add(fireButton);

  // --- FIX: Labels positioned on the desk ---
  const labelY = 1.08; // Slightly above desk surface
  const throttleLabel = createLabel('THROTTLE');
  throttleLabel.position.set(-0.4, labelY, controlZ + 0.25);
  throttleLabel.rotation.x = -Math.PI / 2;
  cockpitGroup.add(throttleLabel);

  const joystickLabel = createLabel('JOYSTICK');
  joystickLabel.position.set(0.4, labelY, controlZ + 0.25);
  joystickLabel.rotation.x = -Math.PI / 2;
  cockpitGroup.add(joystickLabel);

  const fireLabel = createLabel('LAUNCH PROBE');
  fireLabel.position.set(0, labelY, controlZ + 0.1);
  fireLabel.rotation.x = -Math.PI / 2;
  cockpitGroup.add(fireLabel);
  
  function updateControlVisuals(controlName, localPos) { /* ... same as before ... */ }

  return {
    group: cockpitGroup, throttle: throttleGroup, joystick: joystickGroup, fireButton,
    launcherMuzzle, launcherBarrel, updateControlVisuals,
  };
}

export { createLecternCockpit as createCockpit };
