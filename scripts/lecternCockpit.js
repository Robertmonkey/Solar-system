/*
 * lecternCockpit.js
 *
 * This module defines the physical cockpit, now featuring a larger console,
 * a redesigned throttle, control labels, and a forward-extending probe cannon.
 */

import * as THREE from 'three';
import { COLORS, FONT_FAMILY } from './constants.js';

// Helper to create text labels
function createLabel(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 128;
  ctx.fillStyle = COLORS.uiHighlight;
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(2, 2, 252, 124);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold 40px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  return new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), material);
}

export function createLecternCockpit() {
  const cockpitGroup = new THREE.Group();
  // ... (materials and floor setup remain the same) ...

  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.9, roughness: 0.4 });

  // --- Probe Cannon ---
  const launcherGeom = new THREE.CylinderGeometry(0.2, 0.25, 20, 16);
  const launcherBarrel = new THREE.Mesh(launcherGeom, darkMetalMat);
  launcherBarrel.rotation.x = Math.PI / 2;
  launcherBarrel.position.set(0, -0.2, 9); // Under the floor, extending forward
  cockpitGroup.add(launcherBarrel);
  const launcherMuzzle = new THREE.Object3D();
  launcherMuzzle.position.set(0, 0, 10); // Tip of the barrel
  launcherBarrel.add(launcherMuzzle);
  
  // ... (Enlarged Lectern Desk and Support remain the same) ...
  const desk = new THREE.Mesh( new THREE.CylinderGeometry(1.2, 1.2, 0.08, 64, 1, false, Math.PI / 2.5, Math.PI * 2 - (Math.PI / 2.5) * 2), darkMetalMat);
  desk.position.set(0, 1.0, -0.2);
  cockpitGroup.add(desk);

  // --- Orrery Mount ---
  const orreryMount = new THREE.Object3D();
  orreryMount.position.set(0, 1.04, -0.2); // On top of the desk
  cockpitGroup.add(orreryMount);

  // --- Redesigned Throttle ---
  const throttleGroup = new THREE.Group();
  const throttleBase = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.4), darkMetalMat);
  const throttleTrack = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.3), new THREE.MeshStandardMaterial({color: 0x111111}));
  throttleBase.add(throttleTrack);
  const throttleLever = new THREE.Group();
  const leverArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2), darkMetalMat);
  leverArm.position.y = 0.1;
  const leverHandle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.06), new THREE.MeshStandardMaterial({color: COLORS.uiHighlight}));
  leverHandle.position.y = 0.2;
  leverArm.add(leverHandle);
  throttleLever.add(leverArm);
  throttleGroup.add(throttleBase, throttleLever);
  throttleGroup.name = 'Throttle';
  throttleGroup.position.set(-0.7, 1.04, -0.5); // On top of the desk
  cockpitGroup.add(throttleGroup);
  const throttleLabel = createLabel('THROTTLE');
  throttleLabel.position.set(0, 0.3, 0);
  throttleGroup.add(throttleLabel);

  // --- Labeled Joystick ---
  const joystickGroup = new THREE.Group();
  const stickBase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.04, 32), darkMetalMat);
  joystickGroup.add(stickBase);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.2, 16), darkMetalMat);
  stick.position.y = 0.1;
  const stickTop = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), new THREE.MeshStandardMaterial({color: COLORS.controlBase}));
  stickTop.position.y = 0.2; stick.add(stickTop);
  joystickGroup.add(stick);
  joystickGroup.name = 'Joystick';
  joystickGroup.position.set(0.7, 1.04, -0.5);
  cockpitGroup.add(joystickGroup);
  const joystickLabel = createLabel('JOYSTICK');
  joystickLabel.position.set(0, 0.3, 0);
  joystickGroup.add(joystickLabel);

  const fireButton = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 32), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0x550000 }));
  fireButton.name = 'FireButton';
  fireButton.position.set(0, 1.04, -0.8);
  cockpitGroup.add(fireButton);

  function updateControlVisuals(controlName, localPos) {
    if (controlName === 'throttle') {
        throttleLever.position.z = THREE.MathUtils.clamp(localPos.z, -0.15, 0.15);
    } else if (controlName === 'joystick') {
        const maxAngle = Math.PI / 6;
        stick.rotation.x = THREE.MathUtils.clamp(localPos.y / 0.1, -maxAngle, maxAngle);
        stick.rotation.z = -THREE.MathUtils.clamp(localPos.x / 0.1, -maxAngle, maxAngle);
    }
  }

  return {
    group: cockpitGroup, throttle: throttleGroup, joystick: joystickGroup, fireButton, orreryMount,
    launcherMuzzle, launcherBarrel, updateControlVisuals,
  };
}

export { createLecternCockpit as createCockpit };
