/*
 * ui.js (Refactored for Single Dashboard)
 *
 * This module builds and updates the UI on a single, large dashboard panel.
 * - Draws all UI components (warp, map, info, controls) onto one canvas.
 * - NEW: Uses the provided 'ui.png' nebula texture as a background.
 * - NEW: The material for the dashboard panel uses Additive Blending, making
 * the UI text and elements glow for a high-tech, readable look.
 */

import * as THREE from 'three';
import { solarBodies } from './data.js';
import { C_KMPS, MPH_TO_KMPS } from './constants.js';

// Pre-load the nebula background image for the UI panels.
const bgImage = new Image();
bgImage.src = './textures/ui.png';

export function createUI(dashboardPanel, onWarpSelect, onSpeedChange, onLaunchProbe, onToggleAutopilot, onToggleLabels, onFunFact) {
  // NEW: Using a larger canvas for the single dashboard layout
  const canvasSize = { width: 1024, height: 512 };
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;
  const context = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  texture.anisotropy = 4;
  
  // NEW: Make the UI glow by using Additive Blending.
  // The black parts of the canvas will be transparent, and bright
  // parts will "add" light to the scene.
  dashboardPanel.material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
  });

  // --- UI State ---
  let state = {
    warpTargetIndex: 2, // Default: Earth
    infoBodyIndex: 2,   // Body to show info for
    funFactIndex: 0,
    speedFraction: 0.1, // Ship travel speed
    timeScale: 1.0,     // Simulation speed
    probeMassFraction: 0.1, // 0-1 fraction for mass slider
    probeSpeedFraction: 0.1, // 0-1 fraction for speed slider
    autopilot: false,
    labels: true,
    needsRedraw: true,
  };

  // If the background image loads after initialization, trigger a redraw so it
  // becomes visible.
  bgImage.addEventListener('load', () => { state.needsRedraw = true; });

  const warpTargets = solarBodies.map((b, idx) => ({ name: b.name, index: idx }));

  // --- Drawing Helpers ---
  function drawBackground() {
    // Fill with black first to ensure glow effect works correctly
    context.fillStyle = '#000000';
    context.fillRect(0, 0, canvasSize.width, canvasSize.height);
    // Draw the nebula image with some transparency
    if (bgImage.complete && bgImage.naturalWidth > 0) {
      context.globalAlpha = 0.3; // Make the nebula subtle
      context.drawImage(bgImage, 0, 0, canvasSize.width, canvasSize.height);
      context.globalAlpha = 1.0; // Reset alpha
    }
  }
  
  function drawText(text, x, y, size = 18, color = '#aaddff', weight = 'normal') {
    context.font = `${weight} ${size}px Orbitron`;
    context.fillStyle = color;
    context.fillText(text, x, y);
  }

  // --- Main Drawing Function ---
  function drawDashboard(bodyPositions) {
    drawBackground();

    // --- Column 1: Navigation (Left) ---
    const col1X = 30;
    drawText('WARP TARGET', col1X, 40, 22, '#ffffff', 'bold');
    warpTargets.forEach((target, i) => {
      const y = 80 + i * 24;
      if (i === state.warpTargetIndex) {
        context.fillStyle = 'rgba(100, 150, 255, 0.5)';
        context.fillRect(col1X - 10, y - 18, 200, 24);
      }
      drawText(target.name, col1X, y, 16, i === state.warpTargetIndex ? '#ffffff' : '#bbddff');
    });

    // --- Column 2: Map and Info (Center) ---
    const col2X = 280;
    drawText('SYSTEM STATUS', col2X, 40, 22, '#ffffff', 'bold');
    const body = solarBodies[state.infoBodyIndex] || solarBodies[0];
    drawText(body.name.toUpperCase(), col2X, 70, 20, '#ffffaa');
    
    // The 2D map was replaced by a 3D orrery rendered separately.

    // Info Text
    const fact = body.funFacts ? body.funFacts[state.funFactIndex % body.funFacts.length] : 'No data.';
    context.fillStyle = '#cccccc';
    context.font = '14px Orbitron';
    // word wrap
    let line = '', y = 360, textX = col2X;
    const words = fact.split(' ');
    for (const word of words) {
        const testLine = line + word + ' ';
        if (context.measureText(testLine).width > 420 && line.length > 0) {
            context.fillText(line, textX, y);
            line = word + ' ';
            y += 20;
        } else {
            line = testLine;
        }
    }
    context.fillText(line, textX, y);
    drawText('Touch info panel to cycle facts', textX, canvasSize.height - 20, 12, '#888888');

    // --- Column 3: Ship Systems (Right) ---
    const col3X = 720;
    drawText('SYSTEMS CONTROL', col3X, 40, 22, '#ffffff', 'bold');

    const sliderWidth = 280;
    // Ship Speed
    drawText(`SHIP SPEED: ${speedFractionToString(state.speedFraction)}`, col3X, 90, 16);
    context.fillStyle = '#333344';
    context.fillRect(col3X, 110, sliderWidth, 8);
    context.fillStyle = '#ffaa00';
    context.fillRect(col3X, 110, sliderWidth * state.speedFraction, 8);
    
    // Time Scale
    drawText(`TIME WARP: ${state.timeScale.toFixed(1)}x`, col3X, 150, 16);
    context.fillStyle = '#333344';
    context.fillRect(col3X, 170, sliderWidth, 8);
    context.fillStyle = '#aaccff';
    context.fillRect(col3X, 170, sliderWidth * ((state.timeScale - 0.1) / 49.9), 8);

    // Probe Mass & Speed
    const probeMass = 10 + Math.pow(state.probeMassFraction, 3) * 1e6;
    drawText(`PROBE MASS: ${probeMass.toFixed(0)} kg`, col3X, 210, 16);
    context.fillStyle = '#333344';
    context.fillRect(col3X, 230, sliderWidth, 8);
    context.fillStyle = '#ff8888';
    context.fillRect(col3X, 230, sliderWidth * state.probeMassFraction, 8);

    const probeSpeed = state.probeSpeedFraction * 100;
    drawText(`LAUNCH VELOCITY: ${probeSpeed.toFixed(1)}% c`, col3X, 270, 16);
    context.fillStyle = '#333344';
    context.fillRect(col3X, 290, sliderWidth, 8);
    context.fillStyle = '#ff8888';
    context.fillRect(col3X, 290, sliderWidth * state.probeSpeedFraction, 8);

    // Autopilot Toggle
    drawText('AUTOPILOT', col3X, 330, 16);
    context.fillStyle = state.autopilot ? '#226622' : '#662222';
    context.fillRect(col3X, 350, 120, 24);
    drawText(state.autopilot ? 'ON' : 'OFF', col3X + 10, 368, 16, '#ffffff');

    // Labels Toggle
    drawText('LABELS', col3X, 390, 16);
    context.fillStyle = state.labels ? '#226622' : '#662222';
    context.fillRect(col3X, 410, 120, 24);
    drawText(state.labels ? 'ON' : 'OFF', col3X + 10, 428, 16, '#ffffff');

    texture.needsUpdate = true;
    state.needsRedraw = false;
  }

  function speedFractionToString(f) {
      if (f === 0) return "STOPPED";
      const minMph = 1;
      const c_in_mph = C_KMPS / MPH_TO_KMPS;
      const logMin = Math.log(minMph);
      const logMax = Math.log(c_in_mph);
      const mph = Math.exp(logMin + f * (logMax - logMin));
      if (mph < 1000) return `${mph.toFixed(0)} mph`;
      if (mph < 1e6) return `${(mph/1000).toFixed(1)}k mph`;
      const fractionOfC = mph / c_in_mph;
      return `${fractionOfC.toFixed(4)} c`;
  }

  function update(bodyPositions, closestBodyIndex) {
    if (closestBodyIndex !== -1 && state.infoBodyIndex !== closestBodyIndex) {
      state.infoBodyIndex = closestBodyIndex;
      state.funFactIndex = 0;
      state.needsRedraw = true;
    }
    if(state.needsRedraw) {
        drawDashboard(bodyPositions);
    }
  }

  function handlePointer(uv) {
    state.needsRedraw = true;
    const x = uv.u * canvasSize.width;
    const y = (1 - uv.v) * canvasSize.height;

    // Column 1: Warp List
    if (x > 20 && x < 230) {
      const lineHeight = 24;
      const idx = Math.floor((y - 80 + lineHeight / 2) / lineHeight);
      if (idx >= 0 && idx < warpTargets.length) {
        state.warpTargetIndex = idx;
        state.funFactIndex = 0;
        onWarpSelect(idx);
      }
    } 
    // Column 2: Info
    else if (x > 280 && x < 700) {
        state.funFactIndex++;
        if (onFunFact) {
          const body = solarBodies[state.infoBodyIndex] || solarBodies[0];
          const facts = body.funFacts || [];
          if (facts.length > 0) {
            const fact = facts[state.funFactIndex % facts.length];
            onFunFact(fact);
          }
        }
    }
    // Column 3: Sliders
    else if (x > 720 && x < 1000) {
        const sliderX = 720;
        const sliderW = 280;
        const fraction = THREE.MathUtils.clamp((x - sliderX) / sliderW, 0, 1);
        if (y > 100 && y < 140) state.speedFraction = fraction;
        else if (y > 160 && y < 200) state.timeScale = 0.1 + fraction * 49.9;
        else if (y > 220 && y < 260) state.probeMassFraction = fraction;
        else if (y > 280 && y < 320) state.probeSpeedFraction = fraction;
        else if (y > 340 && y < 374) {
            state.autopilot = !state.autopilot;
            if (onToggleAutopilot) onToggleAutopilot(state.autopilot);
        }
        else if (y > 400 && y < 434) {
            state.labels = !state.labels;
            if (onToggleLabels) onToggleLabels(state.labels);
        }
    }
  }

  // Initial Draw
  update(solarBodies.map(() => new THREE.Vector3()), state.infoBodyIndex);

  return {
    update,
    handlePointer,
    selectWarpTarget(index) {
      if (index >= 0 && index < warpTargets.length) {
        state.warpTargetIndex = index;
        state.infoBodyIndex = index;
        state.funFactIndex = 0;
        if (onWarpSelect) onWarpSelect(index);
        state.needsRedraw = true;
      }
    },
    get speedFraction() { return state.speedFraction; },
    set speedFraction(f) { if (state.speedFraction !== f) { state.speedFraction = f; state.needsRedraw = true; }},
    get timeScale() { return state.timeScale; },
    get probeMass() { return 10 + Math.pow(state.probeMassFraction, 3) * 1e6; },
    get probeLaunchSpeed() { return state.probeSpeedFraction * C_KMPS; },
    get autopilot() { return state.autopilot; },
    get warpTargetIndex() { return state.warpTargetIndex; },
    get labelsVisible() { return state.labels; }
  };
}
