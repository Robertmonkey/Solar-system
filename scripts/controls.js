// A stable, professional control system based on the official Three.js
// XRHandModelFactory and a direct‑touch interaction model.

import * as THREE from 'three';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

export function createControls(renderer, player, cockpit, ui, fireCallback) {
  renderer.clock = new THREE.Clock();

  const handModelFactory = new XRHandModelFactory().setPath(
    "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/models/hands/"
  );

  const hands = [renderer.xr.getHand(0), renderer.xr.getHand(1)];
  const touchStates = [ { touching: null }, { touching: null } ];

  hands.forEach(hand => {
    hand.add(handModelFactory.createHandModel(hand));
    player.add(hand); // Attach hands to the rotating player group
  });

  const interactables = [
    { mesh: cockpit.throttle, name: 'Throttle' },
    { mesh: cockpit.joystick, name: 'Joystick' },
    { mesh: cockpit.fireButton, name: 'FireButton' },
    { mesh: ui.warpMesh, name: 'WarpPanel' },
    { mesh: ui.probeMesh, name: 'ProbePanel' },
    { mesh: ui.factsMesh, name: 'FactsPanel' }
  ];
  const interactableBoxes = interactables.map(() => new THREE.Box3());

  let throttleValue = 0, joystickX = 0, joystickY = 0;
  let joystickAnchor = null;

  function update(deltaTime) {
    interactables.forEach(item => item.mesh.updateWorldMatrix(true, false));
    interactables.forEach((item, i) => {
      interactableBoxes[i].setFromObject(item.mesh);
      if (item.name === 'FireButton' || item.name.endsWith('Panel')) {
        interactableBoxes[i].expandByScalar(0.02);
      } else {
        interactableBoxes[i].expandByScalar(0.01);
      }
    });

    let isTouchingAnyPanel = false;

    hands.forEach((hand, i) => {
      const state = touchStates[i];
      const wasTouching = state.touching;
      const indexTip = hand.joints['index-finger-tip'];

      if (!indexTip) {
        state.touching = null;
        return;
      }
      
      const tipPos = indexTip.getWorldPosition(new THREE.Vector3());

      let currentTouchItem = null;
      interactables.forEach((item, j) => {
        if (interactableBoxes[j].containsPoint(tipPos)) {
          currentTouchItem = item;
        }
      });

      state.touching = currentTouchItem ? currentTouchItem.name : null;
      const isNewTouch = state.touching && state.touching !== wasTouching;
      
      if (currentTouchItem && currentTouchItem.name !== 'Joystick') {
        const localPos = currentTouchItem.mesh.worldToLocal(tipPos.clone());
        const panelName = currentTouchItem.name.includes('Panel') ? currentTouchItem.name.replace('Panel','').toLowerCase() : null;

        if (panelName) {
          isTouchingAnyPanel = true;
          ui.setHover(panelName, localPos);
        }

        switch (currentTouchItem.name) {
          case 'Throttle':
            throttleValue = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(localPos.z, 0.15, -0.15, 0, 1), 0, 1);
            cockpit.updateControlVisuals('throttle', localPos);
            break;
          case 'FireButton':
            if (isNewTouch) {
              fireCallback();
              cockpit.fireButton.position.y = 1.045;
              cockpit.fireButton.material.emissive.setHex(0xff2222);
            }
            break;
          case 'ProbePanel':
             ui.handleTap(panelName, localPos);
             break;
          case 'WarpPanel':
          case 'FactsPanel':
             if (isNewTouch) { ui.handleTap(panelName, localPos); }
             break;
        }
      }
      
      if (state.touching === 'Joystick' && isNewTouch && !joystickAnchor) {
          joystickAnchor = { handIndex: i, startPos: tipPos };
      }
    });

    if (joystickAnchor) {
      if (touchStates[joystickAnchor.handIndex].touching === 'Joystick') {
        const indexTip = hands[joystickAnchor.handIndex].joints['index-finger-tip'];
        if (indexTip) {
          const currentPos = indexTip.getWorldPosition(new THREE.Vector3());
          const worldDelta = currentPos.clone().sub(joystickAnchor.startPos);
          
          const invPlayerQuat = player.getWorldQuaternion(new THREE.Quaternion()).invert();
          const localDelta = worldDelta.applyQuaternion(invPlayerQuat);
          
          // --- FIX: Add a dead zone and decrease sensitivity for smoother control ---
          const DEAD_ZONE = 0.01; // 1cm dead zone
          if (localDelta.length() < DEAD_ZONE) {
              joystickX = 0;
              joystickY = 0;
          } else {
              const SENSITIVITY = 0.15; // Requires 15cm of movement for full deflection
              joystickX = THREE.MathUtils.clamp(localDelta.x / SENSITIVITY, -1, 1);
              joystickY = THREE.MathUtils.clamp(localDelta.z / SENSITIVITY, -1, 1);
          }
        }
      } else {
        joystickAnchor = null;
      }
    }
    
    if (!joystickAnchor) {
      joystickX = 0;
      joystickY = 0;
    }
    cockpit.updateControlVisuals('joystick', new THREE.Vector3(joystickX * 0.1, 0, joystickY * 0.1));


    if (!isTouchingAnyPanel) { ui.setHover(null, null); }
    if (!touchStates.some(s => s.touching === 'FireButton')) {
        cockpit.fireButton.position.y = 1.055;
        cockpit.fireButton.material.emissive.setHex(0x550000);
    }

    const yawRate = -joystickX * 0.8;
    const pitchRate = joystickY * 0.8;
    
    const rotationDelta = new THREE.Quaternion();
    const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawRate * deltaTime);
    const pitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchRate * deltaTime);
    rotationDelta.multiply(yaw).multiply(pitch);
    
    return { rotationDelta, throttle: throttleValue };
  }
  return { update };
}
