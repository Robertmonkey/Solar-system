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

  function drawPanelBackground(ctx, title) {
    const { width, height } = ctx.canvas;
    ctx.fillStyle = COLORS.uiBackground;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = `bold 48px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(title, width / 2, 20);
  }
  
  function drawSlider(ctx, label, x, y, w, h, value, item) {
    // Highlight
    if (state.hoveredPanel === 'probe' && state.hoveredItem === item) {
        ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
        ctx.fillRect(x-10, y-10, w+20, h+20);
    }
    // Track
    ctx.fillStyle = COLORS.sliderTrack;
    ctx.fillRect(x, y, w, h);
    // Knob
    ctx.fillStyle = COLORS.uiHighlight;
    const knobH = 15;
    const knobY = y + (1 - value) * (h - knobH); // Inverted logic here
    ctx.fillRect(x - 5, knobY, w + 10, knobH);
    // Label
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = `24px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h + 25);
  }

  function draw() {
    // --- Warp Panel ---
    const warpCtx = panels.warp.ctx;
    drawPanelBackground(warpCtx, 'WARP TARGETS');
    const rowH = (1024 - 80) / bodies.length;
    bodies.forEach((body, i) => {
        const yPos = 80 + i * rowH;
        if (state.hoveredPanel === 'warp' && state.hoveredItem === i) {
            warpCtx.fillStyle = COLORS.uiRowHighlight;
            warpCtx.fillRect(10, yPos, 512 - 20, rowH);
            warpCtx.fillStyle = COLORS.textInvert;
        } else {
            warpCtx.fillStyle = i === state.selectedIndex ? COLORS.textPrimary : COLORS.textSecondary;
        }
        warpCtx.font = `32px ${FONT_FAMILY}`;
        warpCtx.textAlign = 'left';
        warpCtx.textBaseline = 'middle';
        warpCtx.fillText(body.data.name, 30, yPos + rowH / 2);
    });
    panels.warp.texture.needsUpdate = true;
    
    // --- Probe Panel ---
    const probeCtx = panels.probe.ctx;
    drawPanelBackground(probeCtx, 'CONTROLS');
    drawSlider(probeCtx, 'Probe Mass', 512 * 0.2, 120, 50, 512 - 200, state.probeMass, 'mass');
    drawSlider(probeCtx, 'Probe Velocity', 512 * 0.5, 120, 50, 512 - 200, state.probeVelocity, 'velocity');
    drawSlider(probeCtx, 'Time Warp', 512 * 0.8, 120, 50, 512 - 200, state.timeValue, 'time');
    panels.probe.texture.needsUpdate = true;
    
    // --- Facts Panel ---
    const factsCtx = panels.facts.ctx;
    const body = bodies[state.selectedIndex].data;
    drawPanelBackground(factsCtx, body.name);
    
    // Draw fun fact text
    const fact = (body.facts || [])[0] || 'No data available.';
    factsCtx.font = `32px ${FONT_FAMILY}`;
    factsCtx.fillStyle = COLORS.textSecondary;
    factsCtx.textAlign = 'left';
    factsCtx.textBaseline = 'top';
    const words = fact.split(' ');
    let line = '';
    let y = 100;
    for (const word of words) {
        const testLine = line + word + ' ';
        if (factsCtx.measureText(testLine).width > 1024 - 40 && line.length > 0) {
            factsCtx.fillText(line, 20, y);
            line = word + ' ';
            y += 40;
        } else {
            line = testLine;
        }
    }
    factsCtx.fillText(line, 20, y);
    
    // Draw narrate button
    const btnX = 1024 - 270, btnY = 512 - 100, btnW = 250, btnH = 80;
    factsCtx.fillStyle = (state.hoveredPanel === 'facts' && state.hoveredItem === 'narrate') ? COLORS.uiRowHighlight : COLORS.uiHighlight;
    factsCtx.fillRect(btnX, btnY, btnW, btnH);
    factsCtx.fillStyle = COLORS.textInvert;
    factsCtx.font = `bold 32px ${FONT_FAMILY}`;
    factsCtx.textAlign = 'center';
    factsCtx.textBaseline = 'middle';
    factsCtx.fillText('NARRATE', btnX + btnW / 2, btnY + btnH / 2);
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
            if (localPos.x > -0.3 && localPos.x < -0.1) { state.probeMass = val; newHoverItem = 'mass'; onProbeChange(state); }
            else if (localPos.x > 0 && localPos.x < 0.2) { state.probeVelocity = val; newHoverItem = 'velocity'; onProbeChange(state); }
            else if (localPos.x > 0.3 && localPos.x < 0.5) { state.timeValue = val; newHoverItem = 'time'; onTimeChange(val); }
            needsRedraw = true;
        } else if (panel === 'warp') {
            const index = Math.floor((1 - localPos.y / 1.6 - 0.05) * bodies.length);
            if(index >=0 && index < bodies.length) newHoverItem = index;
        } else if (panel === 'facts') {
            if (localPos.x > 0.3 && localPos.y < -0.15) newHoverItem = 'narrate';
        }
        
        if (state.hoveredPanel !== panel || state.hoveredItem !== newHoverItem) {
            state.hoveredPanel = panel;
            state.hoveredItem = newHoverItem;
            needsRedraw = true;
        }
        if (needsRedraw) state.needsRedraw = true;
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
        state.hoveredPanel = null;
        state.hoveredItem = null;
        state.needsRedraw = true;
    }
  };
}
