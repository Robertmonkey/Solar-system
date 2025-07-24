/*
 * lecternCockpit.js
 *
 * This module defines a new cockpit layout for the Solar System simulator.  It
 * replaces the seated desk and overhead light bar with a standing platform and
 * wrap‑around lectern.  The design provides a semi‑circular console at waist
 * height, integrated throttle/joystick controls, a launch button and a
 * dedicated pedestal for the orrery.  The cockpit group is returned along
 * with references to interactive components so the rest of the application
 * can hook into them.
 */

import * as THREE from 'three';
import { COLORS } from './constants.js';

/**
 * Creates a lectern‑style cockpit.  The returned object exposes the group
 * containing all meshes as well as references to the throttle, joystick,
 * fire button and a mount for the orrery.
 *
 * @returns {{
 * group: THREE.Group,
 * throttle: THREE.Group,
 * joystick: THREE.Group,
 * fireButton: THREE.Mesh,
 * orreryMount: THREE.Object3D,
 * updateControlVisuals: function(string, THREE.Vector3)
 * }}
 */
export function createLecternCockpit() {
  const cockpitGroup = new THREE.Group();
  cockpitGroup.name = 'LecternCockpit';

  const loader = new THREE.TextureLoader();
  const detailTexture = loader.load('./textures/ui.png');
  detailTexture.wrapS = THREE.RepeatWrapping;
  detailTexture.wrapT = THREE.RepeatWrapping;
  detailTexture.repeat.set(4, 4);


  // --- Materials ---
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: COLORS.cockpitBase,
    metalness: 0.9,
    roughness: 0.4,
    roughnessMap: detailTexture, // Add texture for detail
    metalnessMap: detailTexture
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: COLORS.cockpitAccent,
    metalness: 0.9,
    roughness: 0.2,
    emissive: COLORS.cockpitEmissive,
    emissiveIntensity: 0.6
  });

  const controlMat = new THREE.MeshStandardMaterial({
    color: COLORS.controlBase,
    metalness: 0.8,
    roughness: 0.4,
    emissive: COLORS.controlEmissive,
    emissiveIntensity: 0.4
  });

  // --- Holographic Floor ---
  const floorGeom = new THREE.PlaneGeometry(3.5, 3.5);
  const floorMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(COLORS.uiHighlight) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color;
      varying vec2 vUv;

      float hex_grid(vec2 uv, float scale, float thickness) {
        uv *= scale;
        vec2 a = mod(uv, vec2(1.0, 1.732));
        vec2 b = mod(uv - vec2(0.5, 0.866), vec2(1.0, 1.732));
        float d = min(
          abs(a.y - 0.866),
          min(abs(a.x * 1.732 - a.y), abs(a.x * 1.732 + a.y - 1.732))
        );
        d = min(d, min(
          abs(b.y - 0.866),
          min(abs(b.x * 1.732 - b.y), abs(b.x * 1.732 + b.y - 1.732))
        ));
        return smoothstep(thickness, thickness + 0.02, d);
      }

      void main() {
        float pulse = (sin(time * 2.0) * 0.25 + 0.75);
        float grid = hex_grid(vUv - 0.5, 12.0, 0.05);
        float radial = 1.0 - smoothstep(0.45, 0.5, length(vUv - 0.5));
        float alpha = grid * radial * pulse;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  cockpitGroup.add(floor);
  // Animate the floor shader
  const clock = new THREE.Clock();
  floor.onBeforeRender = () => {
    floorMat.uniforms.time.value = clock.getElapsedTime();
  };


  // --- Lectern Desk ---
  const deskRadius = 0.8;
  const deskHeight = 0.08;
  const deskGeom = new THREE.CylinderGeometry(deskRadius, deskRadius, deskHeight, 64, 1, false, Math.PI / 2, Math.PI);
  const desk = new THREE.Mesh(deskGeom, darkMetalMat);
  desk.position.set(0, 1.0, 0);
  desk.material.side = THREE.DoubleSide;
  cockpitGroup.add(desk);

  // --- Desk Support ---
  const supportHeight = desk.position.y;
  const supportGeom = new THREE.CylinderGeometry(0.2, 0.15, supportHeight, 16);
  const support = new THREE.Mesh(supportGeom, darkMetalMat);
  support.position.set(0, supportHeight / 2, deskRadius * 0.7);
  cockpitGroup.add(support);

  // --- Orrery Mount ---
  const orreryMount = new THREE.Object3D();
  const standGeom = new THREE.CylinderGeometry(0.15, 0.18, 0.2, 24);
  const stand = new THREE.Mesh(standGeom, accentMat);
  orreryMount.add(stand);
  orreryMount.position.set(0, 1.0 + deskHeight, 0);
  cockpitGroup.add(orreryMount);


  // --- Controls ---
  const controlY = 1.0 + deskHeight / 2;
  const controlZ = 0.5;

  const throttleGroup = new THREE.Group();
  const throttleBase = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.2), darkMetalMat);
  throttleBase.position.y = -0.02;
  const throttleLever = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8),
    controlMat
  );
  throttleLever.position.y = 0.125;
  const throttleHandle = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 8), controlMat);
  throttleHandle.position.y = 0.25;
  throttleLever.add(throttleHandle);
  throttleGroup.add(throttleBase, throttleLever);
  throttleGroup.name = 'Throttle';
  throttleGroup.position.set(-0.4, controlY, controlZ);
  cockpitGroup.add(throttleGroup);

  const joystickGroup = new THREE.Group();
  const stickBase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.04, 32), darkMetalMat);
  stickBase.position.y = -0.02;
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.2, 16), controlMat);
  stick.position.y = 0.1;
  const stickTop = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), controlMat);
  stickTop.position.y = 0.2;
  stick.add(stickTop);
  joystickGroup.add(stickBase, stick);
  joystickGroup.name = 'Joystick';
  joystickGroup.position.set(0.4, controlY, controlZ);
  cockpitGroup.add(joystickGroup);

  // Launch/Fire button near the probe controls
  const fireButtonGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 32);
  const fireButtonMat = new THREE.MeshStandardMaterial({ color: 0xff2222, metalness: 0.5, roughness: 0.4, emissive: 0x550000, emissiveIntensity: 1 });
  const fireButton = new THREE.Mesh(fireButtonGeom, fireButtonMat);
  fireButton.name = 'FireButton';
  fireButton.position.set(0, controlY, 0.65);
  cockpitGroup.add(fireButton);

  // Add a cockpit light for better ambience
  const cockpitLight = new THREE.PointLight(0x88aaff, 5, 3);
  cockpitLight.position.set(0, 1.2, 0.2);
  cockpitGroup.add(cockpitLight);

  // --- Control Visuals ---
  /**
   * Updates the visual representation of the throttle or joystick.
   * @param {'throttle'|'joystick'} controlName
   * @param {THREE.Vector3} localPos The grabbing hand's position in the control's local space.
   */
  function updateControlVisuals(controlName, localPos) {
    if (controlName === 'throttle') {
      const y = THREE.MathUtils.clamp(localPos.z, -0.1, 0.1);
      const angle = THREE.MathUtils.mapLinear(y, -0.1, 0.1, Math.PI / 4, -Math.PI / 4);
      throttleLever.rotation.x = angle;
    } else if (controlName === 'joystick') {
      const maxAngle = Math.PI / 4;
      const xAngle = THREE.MathUtils.clamp(localPos.z, -0.1, 0.1) * maxAngle * 10;
      const zAngle = -THREE.MathUtils.clamp(localPos.x, -0.1, 0.1) * maxAngle * 10;
      stick.rotation.set(xAngle, 0, zAngle);
    }
  }


  return {
    group: cockpitGroup,
    throttle: throttleGroup,
    joystick: joystickGroup,
    fireButton,
    orreryMount,
    updateControlVisuals,
  };
}

export { createLecternCockpit as createCockpit };
