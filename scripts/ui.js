/*
 * ui.js
 *
 * This module draws the three UI panels and provides methods for the
 * controls system to report hover and tap events, which then trigger
 * state changes and callbacks.
 */

import * as THREE from 'three';
import { COLORS, FONT_FAMILY } from './constants.js';

export function createUI(bodies, callbacks = {}) {
  const { onWarp = () => {}, onProbeChange = () => {}, onTimeChange = () => {}, onNarrate = () => {} } = callbacks;

  let selectedIndex = 0;
  let probeMass = 0.5, probeVelocity = 0.5, timeValue = 0.2;
  let hoverState = { panel: null, item: null };
  let needsRedraw = true;

  const panels = {
    warp: { canvas: document.createElement('canvas'), ctx: null, texture: null, mesh: null, height: 1.6 },
    probe: { canvas: document.createElement('canvas'), ctx: null, texture: null, mesh: null, height: 0.8 },
    facts: { canvas: document.createElement('canvas'), ctx: null, texture: null, mesh: null, height: 0.6 },
  };

  function setupPanel(name, w, h, planeW, planeH) {
    const p = panels[name];
    p.canvas.width = w;
    p.canvas.height = h;
    p.ctx = p.canvas.getContext('2d');
    p.texture = new THREE.CanvasTexture(p.canvas);
    p.mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), new THREE.MeshBasicMaterial({ map: p.texture, transparent: true }));
    p.mesh.name = name;
  }

  setupPanel('warp', 512, 1024, 0.8, panels.warp.height);
  setupPanel('probe', 512, 512, 0.8, panels.probe.height);
  setupPanel('facts', 1024, 512, 1.2, panels.facts.height);

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

  function drawWarp() {
    const { ctx, canvas } = panels.warp;
    drawPanelBackground(ctx, 'WARP TARGETS');
    const rowH = (canvas.height - 80) / bodies.length;
    bodies.forEach((body, i) => {
      const y = 80 + i * rowH;
      if (hoverState.panel === 'warp' && hoverState.item === i) {
        ctx.fillStyle = COLORS.uiRowHighlight;
        ctx.fillRect(10, y, canvas.width - 20, rowH);
        ctx.fillStyle = COLORS.textInvert;
      } else {
        ctx.fillStyle = i === selectedIndex ? COLORS.textPrimary : COLORS.textSecondary;
        if(i === selectedIndex) {
            ctx.strokeStyle = COLORS.uiHighlight;
            ctx.lineWidth = 4;
            ctx.strokeRect(10, y, canvas.width - 20, rowH);
        }
      }
      ctx.font = `32px ${FONT_FAMILY}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(body.data.name, 30, y + rowH / 2);
    });
    panels.warp.texture.needsUpdate = true;
  }

  function drawSlider(ctx, label, x, y, w, h, value, item) {
    if (hoverState.panel === 'probe' && hoverState.item === item) {
        ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
        ctx.fillRect(x-10, y-10, w+20, h+20);
    }
    ctx.fillStyle = COLORS.sliderTrack;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLORS.uiHighlight;
    const knobH = 15;
    // In canvas coordinates, Y=0 is the top. Higher Y is lower.
    // So a high `value` (1.0) should result in a low knobY.
    const knobY = y + (1 - value) * (h - knobH);
    ctx.fillRect(x - 5, knobY, w + 10, knobH);
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = `24px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h + 25);
  }

  function drawProbe() {
    const { ctx, canvas } = panels.probe;
    drawPanelBackground(ctx, 'CONTROLS');
    const sliderHeight = canvas.height - 200;
    const sliderY = 120;
    drawSlider(ctx, 'Probe Mass', canvas.width * 0.2, sliderY, 50, sliderHeight, probeMass, 'mass');
    drawSlider(ctx, 'Probe Velocity', canvas.width * 0.5, sliderY, 50, sliderHeight, probeVelocity, 'velocity');
    drawSlider(ctx, 'Time Warp', canvas.width * 0.8, sliderY, 50, sliderHeight, timeValue, 'time');
    panels.probe.texture.needsUpdate = true;
  }
  
  function drawFacts() {
    const { ctx, canvas } = panels.facts;
    const body = bodies[selectedIndex].data;
    drawPanelBackground(ctx, body.name);
    // Draw fun fact text...
    const fact = (body.facts || [])[0] || 'No data available.';
    ctx.font = `32px ${FONT_FAMILY}`;
    ctx.fillStyle = COLORS.textSecondary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    // word wrap
    const words = fact.split(' '); let line = ''; let y = 100;
    for (const word of words) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > canvas.width - 40 && line.length > 0) {
            ctx.fillText(line, 20, y); line = word + ' '; y += 40;
        } else { line = testLine; }
    }
    ctx.fillText(line, 20, y);
    // Draw narrate button
    const btnX = canvas.width - 270, btnY = canvas.height - 100, btnW = 250, btnH = 80;
    ctx.fillStyle = (hoverState.panel === 'facts' && hoverState.item === 'narrate') ? COLORS.uiRowHighlight : COLORS.uiHighlight;
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.fillStyle = COLORS.textInvert; ctx.font = `bold 32px ${FONT_FAMILY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('NARRATE', btnX + btnW / 2, btnY + btnH / 2);
    panels.facts.texture.needsUpdate = true;
  }

  function setHover(panel, localPos) {
    let newHover = { panel: null, item: null };
    if (panel && localPos) {
      switch (panel) {
        case 'warp':
            const pWarp = panels.warp;
            const yNormWarp = (localPos.y + pWarp.height / 2) / pWarp.height;
            const index = Math.floor((1 - yNormWarp) * bodies.length);
            if (index >= 0 && index < bodies.length) newHover = { panel: 'warp', item: index };
            break;
        case 'probe':
            if (localPos.x > -0.3 && localPos.x < -0.1) newHover = { panel: 'probe', item: 'mass'};
            else if (localPos.x >= 0.1 && localPos.x < 0.3) newHover = { panel: 'probe', item: 'velocity'};
            else if (localPos.x >= 0.4 && localPos.x < 0.6) newHover = { panel: 'probe', item: 'time'};
            break;
        case 'facts':
            const pFacts = panels.facts;
            // From drawFacts: btnX = 1024-270=754, btnY = 512-100=412. btnW=250, btnH=80.
            // Canvas (1024,512) to local (-0.6,0.6), (-0.3,0.3)
            const btnLocalXMin = (754 / 1024 - 0.5) * 1.2;
            const btnLocalYMax = -(412 / 512 - 0.5) * 0.6;
            if (localPos.x > btnLocalXMin && localPos.y < btnLocalYMax) {
                newHover = { panel: 'facts', item: 'narrate' };
            }
            break;
      }
    }

    if (newHover.panel !== hoverState.panel || newHover.item !== hoverState.item) {
      hoverState = newHover;
      needsRedraw = true;
    }
  }

  function handleTap(panel, localPos) {
    if (panel === 'warp') {
      // hoverState is updated just before tap, so its item is reliable
      if(hoverState.item !== null) onWarp(hoverState.item);
    } else if (panel === 'facts') {
      if (hoverState.item === 'narrate') onNarrate((bodies[selectedIndex].data.facts || [])[0]);
    } else if (panel === 'probe') {
        const p = panels.probe;
        const panelHalfHeight = p.height / 2;
        // --- FIX: Invert slider logic for intuitive controls ---
        const val = THREE.MathUtils.clamp((localPos.y + panelHalfHeight) / p.height, 0, 1);
        
        if (hoverState.item === 'mass') { probeMass = val; }
        if (hoverState.item === 'velocity') { probeVelocity = val; }
        if (hoverState.item === 'time') { timeValue = val; onTimeChange(val); }
        onProbeChange({ mass: probeMass, velocity: probeVelocity });
        needsRedraw = true;
    }
  }

  onTimeChange(timeValue); // Set initial time
  
  return {
    warpMesh: panels.warp.mesh, probeMesh: panels.probe.mesh, factsMesh: panels.facts.mesh,
    update: () => { if(needsRedraw) { drawWarp(); drawProbe(); drawFacts(); needsRedraw = false; } },
    setSelectedIndex: (i) => { if (i !== selectedIndex) { selectedIndex = i; needsRedraw = true; }},
    setHover, handleTap,
  };
}
