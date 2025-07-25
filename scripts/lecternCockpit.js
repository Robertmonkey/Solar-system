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

  // --- Holographic Floor ---
  const floorGeom = new THREE.PlaneGeometry(4, 4);
  const floorMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, color: { value: new THREE.Color(COLORS.uiHighlight) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float time; uniform vec3 color; varying vec2 vUv; float hex_grid(vec2 uv, float s, float t) { uv *= s; vec2 a = mod(uv, vec2(1.,1.732)); vec2 b = mod(uv-vec2(.5,.866), vec2(1.,1.732)); float d = min(abs(a.y-.866),min(abs(a.x*1.732-a.y),abs(a.x*1.732+a.y-1.732))); d=min(d,min(abs(b.y-.866),min(abs(b.x*1.732-b.y),abs(b.x*1.732+b.y-1.732)))); return smoothstep(t,t+.02,d); } void main() { float p = (sin(time*2.)*.25+.75); float g = hex_grid(vUv-.5,12.,.05); float r = 1.-smoothstep(.45,.5,length(vUv-.5)); float a = g*r*p; gl_FragColor=vec4(color,a); }`,
    transparent: true, side: THREE.DoubleSide,
  });
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; cockpitGroup.add(floor);
  const clock = new THREE.Clock();
  floor.onBeforeRender = () => { floorMat.uniforms.time.value = clock.getElapsedTime(); };

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
  throttleGroup.position.set(-0.4, 1.04, -0.7); // Closer together and forward
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
  joystickGroup.position.set(0.4, 1.04, -0.7); // Closer together and forward
  cockpitGroup.add(joystickGroup);

  // --- Fire Button ---
  const fireButton = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 32), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0x550000 }));
  fireButton.name = 'FireButton';
  fireButton.position.set(0, 1.04, -0.7);
  cockpitGroup.add(fireButton);

  // --- Labels positioned on the desk ---
  const labelY = 1.085; // Slightly above desk surface
  const throttleLabel = createLabel('THROTTLE');
  throttleLabel.position.set(-0.4, labelY, -0.5);
  throttleLabel.rotation.x = -Math.PI / 2;
  cockpitGroup.add(throttleLabel);

  const joystickLabel = createLabel('JOYSTICK');
  joystickLabel.position.set(0.4, labelY, -0.5);
  joystickLabel.rotation.x = -Math.PI / 2;
  cockpitGroup.add(joystickLabel);

  const fireLabel = createLabel('LAUNCH PROBE');
  fireLabel.position.set(0, labelY, -0.6);
  fireLabel.rotation.x = -Math.PI / 2;
  cockpitGroup.add(fireLabel);
  
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
    group: cockpitGroup,
    throttle: throttleGroup,
    joystick: joystickGroup,
    fireButton,
    launcherMuzzle,
    launcherBarrel,
    updateControlVisuals,
  };
}

export { createLecternCockpit as createCockpit };
