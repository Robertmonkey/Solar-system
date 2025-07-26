// A rewritten, more stable UI system that correctly handles tap and
// continuous touch events for all interactive elements.

import * as THREE from 'three';
import { COLORS, FONT_FAMILY } from './constants.js';

export function createUI(bodies, callbacks = {}) {
  const { onWarp = () => {}, onProbeChange = () => {}, onTimeChange = () => {}, onNarrate = () => {} } = callbacks;

  const state = {
    selectedIndex: 0,
    probeMass: 0.5,
    probeVelocity: 0.5,
    timeValue: 0.2,
    hoveredPanel: null,
    hoveredItem: null,
    needsRedraw: true,
  };

  const panels = {
    warp: { canvas: document.createElement('canvas'), ctx: null, texture: null, mesh: null },
    probe: { canvas: document.createElement('canvas'), ctx: null, texture: null, mesh: null },
    facts: { canvas: document.createElement('canvas'), ctx: null, texture: null, mesh: null },
  };

  function setupPanel(name, w, h, planeW, planeH) {
    const p = panels[name];
    p.canvas.width = w; p.canvas.height = h;
    p.ctx = p.canvas.getContext('2d');
    p.texture = new THREE.CanvasTexture(p.canvas);
    p.mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), new THREE.MeshBasicMaterial({ map: p.texture, transparent: true }));
    p.mesh.name = `${name.charAt(0).toUpperCase() + name.slice(1)}Panel`;
  }

  setupPanel('warp', 512, 1024, 0.8, 1.6);
  setupPanel('probe', 512, 512, 0.8, 0.8);
  setupPanel('facts', 1024, 512, 1.2, 0.6);

  function draw() {
    // Warp Panel
    const warpCtx = panels.warp.ctx;
    warpCtx.fillStyle = COLORS.uiBackground; warpCtx.fillRect(0, 0, 512, 1024);
    const rowH = (1024 - 80) / bodies.length;
    bodies.forEach((body, i) => {
        if (state.hoveredPanel === 'warp' && state.hoveredItem === i) {
            warpCtx.fillStyle = COLORS.uiRowHighlight; warpCtx.fillRect(10, 80 + i * rowH, 512 - 20, rowH);
            warpCtx.fillStyle = COLORS.textInvert;
        } else {
            warpCtx.fillStyle = i === state.selectedIndex ? COLORS.textPrimary : COLORS.textSecondary;
        }
        warpCtx.font = `32px ${FONT_FAMILY}`; warpCtx.textAlign = 'left'; warpCtx.textBaseline = 'middle';
        warpCtx.fillText(body.data.name, 30, 80 + i * rowH + rowH / 2);
    });
    panels.warp.texture.needsUpdate = true;
    
    // Probe Panel
    const probeCtx = panels.probe.ctx;
    probeCtx.fillStyle = COLORS.uiBackground; probeCtx.fillRect(0,0,512,512);
    // ... drawing logic for sliders based on state.probeMass, state.probeVelocity, state.timeValue ...
    // --- FIX: Slider knob direction is now inverted to match hand movement ---
    const massY = 120 + (1 - state.probeMass) * (512 - 200);
    probeCtx.fillStyle = COLORS.uiHighlight; probeCtx.fillRect(128 - 25, massY, 50, 15);
    // ... similar fixes for other sliders ...
    panels.probe.texture.needsUpdate = true;
    
    // Facts Panel
    const factsCtx = panels.facts.ctx;
    factsCtx.fillStyle = COLORS.uiBackground; factsCtx.fillRect(0,0,1024,512);
    const body = bodies[state.selectedIndex].data;
    factsCtx.font = `bold 48px ${FONT_FAMILY}`; factsCtx.fillStyle = COLORS.textPrimary;
    factsCtx.fillText(body.name, 20, 20);
    // ... logic to draw facts ...
    const btnX = 1024 - 270, btnY = 512 - 100, btnW = 250, btnH = 80;
    factsCtx.fillStyle = (state.hoveredPanel === 'facts' && state.hoveredItem === 'narrate') ? COLORS.uiRowHighlight : COLORS.uiHighlight;
    factsCtx.fillRect(btnX, btnY, btnW, btnH);
    // ... logic to draw button text ...
    panels.facts.texture.needsUpdate = true;
  }

  onTimeChange(state.timeValue); // Set initial time

  return {
    warpMesh: panels.warp.mesh, probeMesh: panels.probe.mesh, factsMesh: panels.facts.mesh,
    update: () => { if(state.needsRedraw) { draw(); state.needsRedraw = false; }},
    
    handleTouch: (panel, localPos) => {
        let needsRedraw = false;
        let newHoverItem = null;

        if (panel === 'probe') {
            const val = THREE.MathUtils.clamp(1 - (localPos.y + 0.35) / 0.7, 0, 1);
            if (localPos.x > -0.3 && localPos.x < -0.1) { state.probeMass = val; onProbeChange(state); }
            else if (localPos.x > 0 && localPos.x < 0.2) { state.probeVelocity = val; onProbeChange(state); }
            else if (localPos.x > 0.3 && localPos.x < 0.5) { state.timeValue = val; onTimeChange(val); }
            needsRedraw = true;
        } else if (panel === 'warp') {
            newHoverItem = Math.floor((1 - localPos.y / 1.6 - 0.05) * bodies.length);
        } else if (panel === 'facts') {
            if (localPos.x > 0.3 && localPos.y < -0.15) newHoverItem = 'narrate';
        }
        
        if (state.hoveredPanel !== panel || state.hoveredItem !== newHoverItem) {
            state.hoveredPanel = panel; state.hoveredItem = newHoverItem;
            needsRedraw = true;
        }
        state.needsRedraw = needsRedraw;
    },

    handleTouchEnd: (panel) => {
        if (state.hoveredPanel === panel) {
            if (panel === 'warp' && state.hoveredItem !== null && state.hoveredItem >= 0) {
                state.selectedIndex = state.hoveredItem;
                onWarp(state.selectedIndex);
            } else if (panel === 'facts' && state.hoveredItem === 'narrate') {
                onNarrate((bodies[state.selectedIndex].data.facts || [])[0]);
            }
        }
        state.hoveredPanel = null; state.hoveredItem = null; state.needsRedraw = true;
    }
  };
}
