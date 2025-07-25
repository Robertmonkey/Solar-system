/*
 * lecternCockpit.js
 *
 * This module defines the physical cockpit, now featuring a larger console
 * desk to properly house all controls, and a new forward-extending probe
 * launcher barrel.
 */

import * as THREE from 'three';
import { COLORS } from './constants.js';

export function createLecternCockpit() {
  const cockpitGroup = new THREE.Group();
  cockpitGroup.name = 'LecternCockpit';

  const loader = new THREE.TextureLoader();
  const detailTexture = loader.load('./textures/ui.png');
  detailTexture.wrapS = THREE.RepeatWrapping; detailTexture.wrapT = THREE.RepeatWrapping;
  detailTexture.repeat.set(8, 8);

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: COLORS.cockpitBase, metalness: 0.9, roughness: 0.4,
    roughnessMap: detailTexture, metalnessMap: detailTexture
  });

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

  // --- Enlarged Lectern Desk ---
  const deskRadius = 1.2;
  const deskHeight = 0.08;
  const deskGeom = new THREE.CylinderGeometry(deskRadius, deskRadius, deskHeight, 64, 1, false, Math.PI / 2.5, Math.PI * 2 - (Math.PI / 2.5) * 2);
  const desk = new THREE.Mesh(deskGeom, darkMetalMat);
  desk.position.set(0, 1.0, -0.2);
  desk.material.side = THREE.DoubleSide;
  cockpitGroup.add(desk);

  // --- Desk Support ---
  const supportHeight = desk.position.y;
  const supportGeom = new THREE.CylinderGeometry(0.2, 0.15, supportHeight, 16);
  const support = new THREE.Mesh(supportGeom, darkMetalMat);
  support.position.set(0, supportHeight / 2, deskRadius * 0.2);
  cockpitGroup.add(support);
  
  // --- Probe Launcher Barrel ---
  const launcherGeom = new THREE.CylinderGeometry(0.1, 0.12, 2.5, 16);
  const launcherBarrel = new THREE.Mesh(launcherGeom, darkMetalMat);
  launcherBarrel.rotation.x = Math.PI / 2;
  launcherBarrel.position.set(0, 0.85, 0);
  launcherBarrel.name = "ProbeLauncher";
  cockpitGroup.add(launcherBarrel);
  // Add a muzzle object to easily get the launch position
  const launcherMuzzle = new THREE.Object3D();
  launcherMuzzle.position.set(0, 0, 1.3);
  launcherBarrel.add(launcherMuzzle);


  // --- Orrery Mount (Resized and Repositioned) ---
  const orreryMount = new THREE.Object3D();
  const standGeom = new THREE.CylinderGeometry(0.1, 0.12, 0.04, 24);
  const stand = new THREE.Mesh(standGeom, darkMetalMat);
  orreryMount.add(stand);
  orreryMount.position.set(0, 1.04, -0.2);
  cockpitGroup.add(orreryMount);

  // --- Controls (Repositioned) ---
  const controlY = 1.04;
  const throttleGroup = new THREE.Group();
  const throttleLever = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8), new THREE.MeshStandardMaterial({color: COLORS.uiHighlight}));
  throttleLever.position.y = 0.125;
  throttleGroup.add(throttleLever);
  throttleGroup.name = 'Throttle';
  throttleGroup.position.set(-0.7, controlY, -0.5);
  cockpitGroup.add(throttleGroup);

  const joystickGroup = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.2, 16), new THREE.MeshStandardMaterial({color: COLORS.controlBase}));
  stick.position.y = 0.1;
  const stickTop = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), stick.material);
  stickTop.position.y = 0.2; stick.add(stickTop);
  joystickGroup.add(stick);
  joystickGroup.name = 'Joystick';
  joystickGroup.position.set(0.7, controlY, -0.5);
  cockpitGroup.add(joystickGroup);

  const fireButtonGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 32);
  const fireButtonMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0x550000 });
  const fireButton = new THREE.Mesh(fireButtonGeom, fireButtonMat);
  fireButton.name = 'FireButton';
  fireButton.position.set(0, controlY, -0.8);
  cockpitGroup.add(fireButton);

  function updateControlVisuals(controlName, localPos) {
    if (controlName === 'throttle') {
      const angle = THREE.MathUtils.mapLinear(localPos.z, -0.1, 0.1, Math.PI / 4, -Math.PI / 4);
      throttleLever.rotation.x = angle;
    } else if (controlName === 'joystick') {
      const maxAngle = Math.PI / 4;
      stick.rotation.x = THREE.MathUtils.clamp(localPos.z, -0.1, 0.1) * maxAngle * 10;
      stick.rotation.z = -THREE.MathUtils.clamp(localPos.x, -0.1, 0.1) * maxAngle * 10;
    }
  }

  return {
    group: cockpitGroup, throttle: throttleGroup, joystick: joystickGroup, fireButton, orreryMount,
    launcherMuzzle, 
    launcherBarrel, // --- FIX --- Added the missing launcherBarrel to the return object.
    updateControlVisuals,
  };
}

export { createLecternCockpit as createCockpit };
