/*
 * ui.js
 *
 * A revamped UI system designed for the lectern cockpit. This module draws
 * three separate panels and handles the new gesture-based interactions
 * for tapping buttons and moving sliders.
 */

import * as THREE from 'three';
import { COLORS, FONT_FAMILY } from './constants.js';

export function createUI(bodies, callbacks = {}) {
  const {
    onWarp = () => {},
    onProbeChange = () => {},
    onTimeChange = () => {},
    onNarrate = () => {}
  } = callbacks;

  // Internal state
  let selectedIndex = 0;
  let probeMass = 0.5;
  let probeVelocity = 0.5;
  let timeValue = 0.2; // Start at a low time warp
  let hoverIndex = -1;
  let activeSlider = null; // 'mass', 'velocity', 'time'

  const WARP_SIZE = 0.8;
  const PROBE_SIZE = 0.8;
  const FACTS_WIDTH = 1.2;
  const FACTS_HEIGHT = 0.6;

  function makeCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    return { canvas, ctx };
  }

  const warp = makeCanvas(512, 1024);
  const probe = makeCanvas(512, 512);
  const facts = makeCanvas(1024, 512);

  const warpTexture = new THREE.CanvasTexture(warp.canvas);
  const probeTexture = new THREE.CanvasTexture(probe.canvas);
  const factsTexture = new THREE.CanvasTexture(facts.canvas);

  const warpMesh = new THREE.Mesh(new THREE.PlaneGeometry(WARP_SIZE, WARP_SIZE * 2), new THREE.MeshBasicMaterial({ map: warpTexture, transparent: true, side: THREE.DoubleSide }));
  const probeMesh = new THREE.Mesh(new THREE.PlaneGeometry(PROBE_SIZE, PROBE_SIZE), new THREE.MeshBasicMaterial({ map: probeTexture, transparent: true, side: THREE.DoubleSide }));
  const factsMesh = new THREE.Mesh(new THREE.PlaneGeometry(FACTS_WIDTH, FACTS_HEIGHT), new THREE.MeshBasicMaterial({ map: factsTexture, transparent: true, side: THREE.DoubleSide }));

  warpMesh.name = 'WarpPanel';
  probeMesh.name = 'ProbePanel';
  factsMesh.name = 'FactsPanel';
  
  const uiState = { needsRedraw: true };

  function drawWarp() {
    const ctx = warp.ctx;
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COLORS.uiBackground;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = `bold 48px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('WARP TARGETS', width / 2, 50);

    const count = bodies.length;
    const rowH = (height - 80) / count;
    ctx.font = `32px ${FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < count; i++) {
      const y = 80 + i * rowH;
      if (i === hoverIndex) {
        ctx.fillStyle = COLORS.uiRowHighlight;
        ctx.fillRect(10, y, width - 20, rowH);
        ctx.fillStyle = COLORS.textInvert;
      } else if (i === selectedIndex) {
        ctx.strokeStyle = COLORS.uiHighlight;
        ctx.lineWidth = 4;
        ctx.strokeRect(10, y, width - 20, rowH);
        ctx.fillStyle = COLORS.textPrimary;
      } else {
        ctx.fillStyle = COLORS.textSecondary;
      }
      ctx.fillText(bodies[i].data.name, 30, y + rowH / 2);
    }
    warpTexture.needsUpdate = true;
  }

  function drawSlider(ctx, label, x, y, w, h, value, orientation = 'vertical') {
    ctx.fillStyle = COLORS.sliderTrack;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLORS.uiHighlight;
    if (orientation === 'vertical') {
        const knobH = 15;
        const knobY = y + (1 - value) * (h - knobH);
        ctx.fillRect(x - 5, knobY, w + 10, knobH);
    } else { // horizontal
        const knobW = 15;
        const knobX = x + value * (w - knobW);
        ctx.fillRect(knobX, y - 5, knobW, h + 10);
    }
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = `24px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h + 25);
  }

  function drawProbe() {
    const ctx = probe.ctx;
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COLORS.uiBackground;
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = `bold 48px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('CONTROLS', width / 2, 50);

    drawSlider(ctx, 'Probe Mass', width * 0.15, 120, 50, height - 200, probeMass);
    drawSlider(ctx, 'Probe Velocity', width * 0.45, 120, 50, height - 200, probeVelocity);
    drawSlider(ctx, 'Time Warp', width * 0.75, 120, 50, height - 200, timeValue);
    
    probeTexture.needsUpdate = true;
  }

  function drawFacts() {
    const ctx = facts.ctx;
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COLORS.uiBackground;
    ctx.fillRect(0, 0, width, height);

    const body = bodies[selectedIndex].data;
    ctx.font = `bold 48px ${FONT_FAMILY}`;
    ctx.fillStyle = COLORS.textPrimary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(body.name, 20, 20);

    const factsList = body.facts || [];
    const fact = factsList[0] || 'No data available.';
    ctx.font = `32px ${FONT_FAMILY}`;
    ctx.fillStyle = COLORS.textSecondary;
    // Simple word wrap
    const words = fact.split(' ');
    let line = '';
    let y = 100;
    for (const word of words) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > width - 40 && line.length > 0) {
            ctx.fillText(line, 20, y);
            line = word + ' ';
            y += 40;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, 20, y);

    // Narrate button
    const btnX = width - 270, btnY = height - 100, btnW = 250, btnH = 80;
    ctx.fillStyle = (hoverIndex === -2) ? COLORS.uiRowHighlight : COLORS.uiHighlight;
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.fillStyle = COLORS.textInvert;
    ctx.font = `bold 32px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NARRATE', btnX + btnW / 2, btnY + btnH / 2);

    factsTexture.needsUpdate = true;
  }

  function handlePointer(panel, uv, isSelect) {
    let needsRedraw = false;
    
    if (panel === 'clear') {
        if(hoverIndex !== -1) {
            hoverIndex = -1;
            needsRedraw = true;
        }
        activeSlider = null;
        return uiState.needsRedraw = needsRedraw;
    }
      
    if (panel === 'warp') {
      const index = Math.floor(((1 - uv.y) * warp.canvas.height - 80) / ((warp.canvas.height - 80) / bodies.length));
      if (index >= 0 && index < bodies.length) {
        if (isSelect) {
            onWarp(index);
        } else if (hoverIndex !== index) {
            hoverIndex = index;
            needsRedraw = true;
        }
      }
    } else if (panel === 'probe') {
        const sliderHit = (x, w) => uv.x > x && uv.x < x + w;
        let sliderChanged = false;

        if (isSelect) {
            if (sliderHit(0.15, 0.2)) activeSlider = 'mass';
            else if (sliderHit(0.45, 0.2)) activeSlider = 'velocity';
            else if (sliderHit(0.75, 0.2)) activeSlider = 'time';
        }

        if(activeSlider) {
            const val = THREE.MathUtils.clamp(1 - (uv.y - 0.2) / 0.7, 0, 1);
            if(activeSlider === 'mass') { probeMass = val; sliderChanged = true; }
            if(activeSlider === 'velocity') { probeVelocity = val; sliderChanged = true; }
            if(activeSlider === 'time') { timeValue = val; onTimeChange(val); needsRedraw = true; }
            if (sliderChanged) onProbeChange({ mass: probeMass, velocity: probeVelocity });
            needsRedraw = true;
        }

        if (!isSelect) activeSlider = null;

    } else if (panel === 'facts') {
        const btnHit = uv.x > 0.7 && uv.y < 0.3;
        const newHover = btnHit ? -2 : -1;
        if (hoverIndex !== newHover) {
            hoverIndex = newHover;
            needsRedraw = true;
        }
        if (isSelect && btnHit) {
            onNarrate((bodies[selectedIndex].data.facts || [])[0] || 'No fact available.');
        }
    }
    uiState.needsRedraw = needsRedraw;
  }
  
  function update() {
    if (uiState.needsRedraw) {
        drawWarp();
        drawProbe();
        drawFacts();
        uiState.needsRedraw = false;
    }
  }

  onTimeChange(timeValue); // Set initial time warp

  return {
    warpMesh, probeMesh, factsMesh, handlePointer, update,
    setSelectedIndex: index => {
      if (index >= 0 && index < bodies.length && selectedIndex !== index) {
        selectedIndex = index;
        uiState.needsRedraw = true;
      }
    },
  };
}
