/*
 * ui.js (Refactored)
 *
 * This module builds and updates the 2D user interface on the cockpit panels.
 * Features:
 * - Panel 1: Warp destination list.
 * - Panel 2: Solar system map and information display for the closest body.
 * - Panel 3: Controls for ship speed, probe parameters (mass, launch speed),
 * and simulation time scale.
 * - Handles pointer interactions and updates internal state.
 */

import * as THREE from 'three';
import { solarBodies } from './data.js';
import { C_KMPS, MPH_TO_KMPS } from './constants.js';

// Pre-load a background image for the UI panels.
const bgImage = new Image();
bgImage.src = './textures/ui.png'; // A subtle nebula/tech background

export function createUI(panels, onWarpSelect, onSpeedChange, onLaunchProbe) {
  const canvasSize = { width: 512, height: 256 };
  const contexts = panels.map(p => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = 4;
    p.material.map = texture;
    p.material.needsUpdate = true;
    return canvas.getContext('2d');
  });

  // --- UI State ---
  let state = {
    warpTargetIndex: 2, // Default: Earth
    infoBodyIndex: 2,   // Body to show info for (updated to closest)
    funFactIndex: 0,
    speedFraction: 0.1, // Ship travel speed
    timeScale: 1.0,     // Simulation speed (orbital mechanics)
    probeMass: 1000,    // in kg
    probeLaunchSpeed: 0.1, // as fraction of light speed
    needsRedraw: true,
  };

  const warpTargets = solarBodies.map((b, idx) => ({ name: b.name, index: idx }));

  // --- Drawing Helpers ---
  function drawBackground(ctx) {
    if (bgImage.complete && bgImage.naturalWidth > 0) {
      ctx.drawImage(bgImage, 0, 0, canvasSize.width, canvasSize.height);
    } else {
      ctx.fillStyle = '#101820';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    }
  }

  function speedToString(f) {
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

  function drawSlider(ctx, label, value, y, x, w) {
    ctx.fillStyle = '#cccccc';
    ctx.font = '18px Orbitron';
    ctx.fillText(label, x, y);
    ctx.fillStyle = '#444444';
    ctx.fillRect(x, y + 10, w, 8);
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(x, y + 10, w * value, 8);
    ctx.beginPath();
    ctx.arc(x + w * value, y + 14, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  // --- Panel Drawing Functions ---

  function drawWarpPanel(ctx) {
    drawBackground(ctx);
    ctx.font = 'bold 24px Orbitron';
    ctx.fillStyle = '#aaddff';
    ctx.fillText('WARP NAVIGATION', 20, 30);
    const lineHeight = 22;
    warpTargets.forEach((target, i) => {
      const y = 60 + i * lineHeight;
      if (i === state.warpTargetIndex) {
        ctx.fillStyle = 'rgba(100, 150, 255, 0.5)';
        ctx.fillRect(10, y - 18, canvasSize.width - 20, lineHeight);
      }
      ctx.fillStyle = (i === state.warpTargetIndex) ? '#ffffff' : '#bbddff';
      ctx.font = '18px Orbitron';
      ctx.fillText(target.name, 20, y);
    });
  }

  function drawMapPanel(ctx, bodyPositions) {
    drawBackground(ctx);
    // Top: Map View
    const mapCenterX = 128, mapCenterY = 128, mapRadius = 110;
    ctx.save();
    ctx.translate(mapCenterX, mapCenterY);
    const maxDist = bodyPositions.reduce((max, p) => Math.max(max, p.length()), 0);
    const scale = maxDist > 0 ? mapRadius / maxDist : 1;
    bodyPositions.forEach((pos, i) => {
      const x = pos.x * scale;
      const z = pos.z * scale; // Y is up, so we use Z for top-down
      ctx.beginPath();
      ctx.arc(x, z, i === state.infoBodyIndex ? 4 : 2, 0, 2 * Math.PI);
      ctx.fillStyle = i === state.infoBodyIndex ? '#ff6699' : '#66ccff';
      ctx.fill();
    });
    ctx.restore();

    // Right: Info View
    const infoX = 266;
    const body = solarBodies[state.infoBodyIndex];
    if (!body) return;
    ctx.font = 'bold 22px Orbitron';
    ctx.fillStyle = '#aaddff';
    ctx.fillText(body.name.toUpperCase(), infoX, 40);
    ctx.font = '14px Orbitron';
    ctx.fillStyle = '#cccccc';
    const fact = body.funFacts ? body.funFacts[state.funFactIndex % body.funFacts.length] : 'No data available.';
    // Text wrapping
    let line = '', y = 70;
    const words = fact.split(' ');
    for(let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      if (ctx.measureText(testLine).width > canvasSize.width - infoX - 10 && n > 0) {
        ctx.fillText(line, infoX, y);
        line = words[n] + ' ';
        y += 18;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, infoX, y);
  }

  function drawControlPanel(ctx) {
    drawBackground(ctx);
    ctx.font = 'bold 24px Orbitron';
    ctx.fillStyle = '#aaddff';
    ctx.fillText('SYSTEMS CONTROL', 20, 30);
    
    // Ship Speed
    drawSlider(ctx, `SHIP SPEED: ${speedToString(state.speedFraction)}`, state.speedFraction, 60, 20, 472);
    // Time Scale
    drawSlider(ctx, `TIME SCALE: ${state.timeScale.toFixed(1)}x`, (state.timeScale - 0.1) / 49.9, 110, 20, 230);
    // Probe Mass
    const massValue = Math.round(10 + Math.pow(state.probeMass, 2) * (1e6 - 10));
    drawSlider(ctx, `PROBE MASS: ${massValue} kg`, state.probeMass, 160, 20, 230);
    // Probe Speed
    drawSlider(ctx, `LAUNCH SPEED: ${(state.probeLaunchSpeed*100).toFixed(1)}% c`, state.probeLaunchSpeed, 210, 20, 230);
    
    // Launch Button
    ctx.fillStyle = '#cc3333';
    ctx.fillRect(300, 160, 192, 70);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText('LAUNCH', 396, 205);
    ctx.textAlign = 'left';
  }

  function update(bodyPositions, closestBodyIndex) {
    if (closestBodyIndex !== -1 && state.infoBodyIndex !== closestBodyIndex) {
      state.infoBodyIndex = closestBodyIndex;
      state.funFactIndex = 0;
      state.needsRedraw = true;
    }
    if(state.needsRedraw) {
        drawWarpPanel(contexts[0]);
        drawMapPanel(contexts[1], bodyPositions);
        drawControlPanel(contexts[2]);
        panels.forEach(p => p.material.map.needsUpdate = true);
        state.needsRedraw = false;
    }
  }

  function handlePointer(panelIndex, uv) {
    const x = uv.u * canvasSize.width;
    const y = (1 - uv.v) * canvasSize.height;

    if (panelIndex === 0) { // Warp Panel
      const lineHeight = 22;
      const idx = Math.floor((y - 60 + lineHeight / 2) / lineHeight);
      if (idx >= 0 && idx < warpTargets.length) {
        if (state.warpTargetIndex !== idx) {
            state.warpTargetIndex = idx;
            state.funFactIndex = 0;
            onWarpSelect(idx);
            state.needsRedraw = true;
        }
      }
    } else if (panelIndex === 1) { // Map/Info Panel
        state.funFactIndex++;
        state.needsRedraw = true;
    } else if (panelIndex === 2) { // Control Panel
      const sliderWidth = 230;
      if (y >= 60 && y < 100) { // Ship speed slider
        state.speedFraction = THREE.MathUtils.clamp((x - 20) / 472, 0, 1);
      } else if (y >= 110 && y < 150) { // Time scale
        state.timeScale = 0.1 + THREE.MathUtils.clamp((x - 20) / sliderWidth, 0, 1) * 49.9;
      } else if (y >= 160 && y < 200) { // Probe Mass
        state.probeMass = THREE.MathUtils.clamp((x - 20) / sliderWidth, 0, 1);
      } else if (y >= 210 && y < 250) { // Probe Speed
        state.probeLaunchSpeed = THREE.MathUtils.clamp((x - 20) / sliderWidth, 0, 1);
      }
      if (x > 300 && y > 160) { // Launch button
         onLaunchProbe();
      }
      state.needsRedraw = true;
    }
  }

  // Initial Draw
  update(solarBodies.map(() => new THREE.Vector3()), state.infoBodyIndex);

  return {
    update,
    handlePointer,
    handleProbeLaunch: onLaunchProbe,
    get speedFraction() { return state.speedFraction; },
    set speedFraction(f) { if (state.speedFraction !== f) { state.speedFraction = f; state.needsRedraw = true; }},
    get timeScale() { return state.timeScale; },
    get probeMass() { return 10 + Math.pow(state.probeMass, 2) * (1e6 - 10); },
    get probeLaunchSpeed() { return state.probeLaunchSpeed * C_KMPS; }
  };
}
