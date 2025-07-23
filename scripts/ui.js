/*
 * ui.js (Command Centre Panels)
 *
 * Provides the cockpit user interface using two separate dashboard panels. The
 * left panel shows navigation controls and planetary information while the right
 * panel exposes ship systems. Each panel is drawn on its own canvas with a
 * nebula background and additive blending to create a glowing Star Trek style.
 */

import * as THREE from 'three';
import { solarBodies } from './data.js';
import { C_KMPS, MPH_TO_KMPS } from './constants.js';

const bgImage = new Image();
bgImage.src = './textures/ui.png';

// The UI now spans three panels: left (navigation), right (ship systems) and a
// new facts panel dedicated to trivia and planetary statistics.
export function createUI(leftPanel, rightPanel, factsPanel,
  onWarpSelect, onSpeedChange, onLaunchProbe,
  onToggleAutopilot, onToggleLabels, onFunFact, onNarrate) {
  const size = { width: 512, height: 512 };

  function makeCanvas() {
    const c = document.createElement('canvas');
    c.width = size.width;
    c.height = size.height;
    return c;
  }

  const leftCanvas = makeCanvas();
  const leftCtx = leftCanvas.getContext('2d');
  const leftTex = new THREE.CanvasTexture(leftCanvas);
  leftTex.colorSpace = THREE.SRGBColorSpace;
  leftTex.anisotropy = 4;
  leftPanel.material = new THREE.MeshBasicMaterial({
    map: leftTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const rightCanvas = makeCanvas();
  const rightCtx = rightCanvas.getContext('2d');
  const rightTex = new THREE.CanvasTexture(rightCanvas);
  rightTex.colorSpace = THREE.SRGBColorSpace;
  rightTex.anisotropy = 4;
  rightPanel.material = new THREE.MeshBasicMaterial({
    map: rightTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const factsCanvas = makeCanvas();
  const factsCtx = factsCanvas.getContext('2d');
  const factsTex = new THREE.CanvasTexture(factsCanvas);
  factsTex.colorSpace = THREE.SRGBColorSpace;
  factsTex.anisotropy = 4;
  factsPanel.material = new THREE.MeshBasicMaterial({
    map: factsTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const state = {
    warpTargetIndex: 2,
    infoBodyIndex: 2,
    funFactIndex: 0,
    speedFraction: 0.1,
    timeScale: 1.0,
    probeMassFraction: 0.1,
    probeSpeedFraction: 0.1,
    autopilot: false,
    labels: true,
    needsRedraw: true,
  };

  bgImage.addEventListener('load', () => { state.needsRedraw = true; });

  const warpTargets = solarBodies.map((b, i) => ({ name: b.name, index: i }));

  function drawBg(ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size.width, size.height);
    if (bgImage.complete && bgImage.naturalWidth > 0) {
      ctx.globalAlpha = 0.3;
      ctx.drawImage(bgImage, 0, 0, size.width, size.height);
      ctx.globalAlpha = 1.0;
    }
  }

  function text(ctx, str, x, y, s = 18, col = '#aaddff', weight = 'normal') {
    ctx.font = `${weight} ${s}px Orbitron`;
    ctx.fillStyle = col;
    ctx.fillText(str, x, y);
  }

  function drawLeft(bodyPositions) {
    drawBg(leftCtx);
    const x0 = 30;
    text(leftCtx, 'WARP TARGET', x0, 40, 22, '#ffffff', 'bold');
    const lineHeight = 20;
    const maxItems = Math.floor((size.height - 80) / lineHeight) - 2;
    warpTargets.slice(0, maxItems).forEach((t, i) => {
      const y = 80 + i * lineHeight;
      if (i === state.warpTargetIndex) {
        leftCtx.fillStyle = 'rgba(100,150,255,0.5)';
        leftCtx.fillRect(x0 - 10, y - 16, 200, lineHeight);
      }
      text(leftCtx, t.name, x0, y, 14, i === state.warpTargetIndex ? '#ffffff' : '#bbddff');
    });

    leftTex.needsUpdate = true;
  }

  function drawRight() {
    drawBg(rightCtx);
    const x0 = 40;
    text(rightCtx, 'SYSTEMS', x0, 40, 22, '#ffffff', 'bold');
    const w = 280;
    text(rightCtx, `SHIP SPEED: ${speedToStr(state.speedFraction)}`, x0, 90, 16);
    rightCtx.fillStyle = '#333344';
    rightCtx.fillRect(x0, 110, w, 8);
    rightCtx.fillStyle = '#ffaa00';
    rightCtx.fillRect(x0, 110, w * state.speedFraction, 8);

    text(rightCtx, `TIME WARP: ${state.timeScale.toFixed(1)}x`, x0, 150, 16);
    rightCtx.fillStyle = '#333344';
    rightCtx.fillRect(x0, 170, w, 8);
    rightCtx.fillStyle = '#aaccff';
    rightCtx.fillRect(x0, 170, w * ((state.timeScale - 0.1) / 49.9), 8);

    const probeMass = 10 + Math.pow(state.probeMassFraction, 3) * 1e6;
    text(rightCtx, `PROBE MASS: ${probeMass.toFixed(0)} kg`, x0, 210, 16);
    rightCtx.fillStyle = '#333344';
    rightCtx.fillRect(x0, 230, w, 8);
    rightCtx.fillStyle = '#ff8888';
    rightCtx.fillRect(x0, 230, w * state.probeMassFraction, 8);

    const probeSpeed = state.probeSpeedFraction * 100;
    text(rightCtx, `LAUNCH VELOCITY: ${probeSpeed.toFixed(1)}% c`, x0, 270, 16);
    rightCtx.fillStyle = '#333344';
    rightCtx.fillRect(x0, 290, w, 8);
    rightCtx.fillStyle = '#ff8888';
    rightCtx.fillRect(x0, 290, w * state.probeSpeedFraction, 8);

    text(rightCtx, 'AUTOPILOT', x0, 330, 16);
    rightCtx.fillStyle = state.autopilot ? '#226622' : '#662222';
    rightCtx.fillRect(x0, 350, 120, 24);
    text(rightCtx, state.autopilot ? 'ON' : 'OFF', x0 + 10, 368, 16, '#ffffff');

    text(rightCtx, 'LABELS', x0, 390, 16);
    rightCtx.fillStyle = state.labels ? '#226622' : '#662222';
    rightCtx.fillRect(x0, 410, 120, 24);
    text(rightCtx, state.labels ? 'ON' : 'OFF', x0 + 10, 428, 16, '#ffffff');

    text(rightCtx, 'LAUNCH PROBE', x0, 460, 16);
    rightCtx.fillStyle = '#333344';
    rightCtx.fillRect(x0, 480, 160, 24);
    text(rightCtx, 'FIRE', x0 + 10, 498, 16, '#ffffff');

    rightTex.needsUpdate = true;
  }

  function drawFacts() {
    drawBg(factsCtx);
    const body = solarBodies[state.infoBodyIndex] || solarBodies[0];
    const x0 = 30;
    text(factsCtx, body.name.toUpperCase(), x0, 40, 22, '#ffffff', 'bold');

    // Body representation
    if (body.color) {
      factsCtx.fillStyle = '#' + body.color.toString(16).padStart(6, '0');
      factsCtx.beginPath();
      factsCtx.arc(x0 + 40, 100, 30, 0, Math.PI * 2);
      factsCtx.fill();
    }

    text(factsCtx, `RADIUS: ${body.radius} km`, x0, 150, 16);
    if (body.mass) text(factsCtx, `MASS: ${body.mass.toExponential(2)} kg`, x0, 176, 16);

    const fact = body.funFacts ? body.funFacts[state.funFactIndex % body.funFacts.length] : 'No data.';
    factsCtx.fillStyle = '#cccccc';
    factsCtx.font = '14px Orbitron';
    let line = '', y = 220;
    const words = fact.split(' ');
    for (const w of words) {
      const test = line + w + ' ';
      if (factsCtx.measureText(test).width > 440 && line) {
        factsCtx.fillText(line, x0, y);
        line = w + ' ';
        y += 20;
      } else {
        line = test;
      }
    }
    factsCtx.fillText(line, x0, y);

    factsCtx.fillStyle = '#333344';
    factsCtx.fillRect(x0, size.height - 60, 160, 30);
    text(factsCtx, 'NARRATE', x0 + 10, size.height - 40, 16, '#ffffff');

    factsTex.needsUpdate = true;
  }

  function speedToStr(f) {
    if (f === 0) return 'STOPPED';
    const minMph = 1;
    const cMph = C_KMPS / MPH_TO_KMPS;
    const logMin = Math.log(minMph);
    const logMax = Math.log(cMph);
    const mph = Math.exp(logMin + f * (logMax - logMin));
    if (mph < 1000) return `${mph.toFixed(0)} mph`;
    if (mph < 1e6) return `${(mph / 1000).toFixed(1)}k mph`;
    const fracC = mph / cMph;
    return `${fracC.toFixed(4)} c`;
  }

  function update(bodyPositions, closestIndex) {
    if (closestIndex !== -1 && state.infoBodyIndex !== closestIndex) {
      state.infoBodyIndex = closestIndex;
      state.funFactIndex = 0;
      state.needsRedraw = true;
    }
    if (state.needsRedraw) {
      drawLeft(bodyPositions);
      drawRight();
      drawFacts();
      state.needsRedraw = false;
    }
  }

  function handlePointer(panel, uv) {
    state.needsRedraw = true;
    const x = uv.x * size.width;
    const y = (1 - uv.y) * size.height;

    if (panel === 'left') {
      if (x > 20 && x < 230) {
        const lineHeight = 20;
        const idx = Math.floor((y - 80 + lineHeight / 2) / lineHeight);
        if (idx >= 0 && idx < warpTargets.length) {
          state.warpTargetIndex = idx;
          state.funFactIndex = 0;
          onWarpSelect && onWarpSelect(idx);
        }
      }
    } else if (panel === 'right') {
      const sliderX = 40;
      const sliderW = 280;
      const f = THREE.MathUtils.clamp((x - sliderX) / sliderW, 0, 1);
      if (y > 100 && y < 140) state.speedFraction = f;
      else if (y > 160 && y < 200) state.timeScale = 0.1 + f * 49.9;
      else if (y > 220 && y < 260) state.probeMassFraction = f;
      else if (y > 280 && y < 320) state.probeSpeedFraction = f;
      else if (y > 340 && y < 374) {
        state.autopilot = !state.autopilot;
        onToggleAutopilot && onToggleAutopilot(state.autopilot);
      } else if (y > 400 && y < 434) {
        state.labels = !state.labels;
        onToggleLabels && onToggleLabels(state.labels);
      } else if (y > 460 && y < 494) {
         onLaunchProbe && onLaunchProbe();
      }
    } else if (panel === 'facts') {
      if (y > size.height - 60) {
        const body = solarBodies[state.infoBodyIndex] || solarBodies[0];
        const facts = body.funFacts || [];
        const fact = facts[state.funFactIndex % facts.length];
        onNarrate && onNarrate(fact);
      } else {
        state.funFactIndex++;
        if (onFunFact) {
          const body = solarBodies[state.infoBodyIndex] || solarBodies[0];
          const facts = body.funFacts || [];
          if (facts.length) onFunFact(facts[state.funFactIndex % facts.length]);
        }
      }
    }
  }

  update(solarBodies.map(() => new THREE.Vector3()), state.infoBodyIndex);

  return {
    update,
    handlePointer,
    selectWarpTarget(i) {
      if (i >= 0 && i < warpTargets.length) {
        state.warpTargetIndex = i;
        state.infoBodyIndex = i;
        state.funFactIndex = 0;
        onWarpSelect && onWarpSelect(i);
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
    get labelsVisible() { return state.labels; },
  };
}
