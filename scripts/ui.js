/*
 * ui.js
 *
 * This module builds and updates the 2D user interface that appears on
 * the cockpit desk.  Each panel is backed by an HTML Canvas which is
 * rendered into a Three.js CanvasTexture.  The UI is kept simple
 * enough to be legible in VR: large fonts, high contrast and clear
 * highlighting.  Users can select a warp destination, view a map of
 * the solar system with current positions, read fun facts about the
 * selected body, adjust their travel speed via a slider and launch a
 * probe.  Interaction callbacks can be supplied for warp changes,
 * speed adjustments and probe launches.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';
import { solarBodies } from './data.js';
import { KM_PER_WORLD_UNIT, C_KMPS, MPH_TO_KMPS } from './constants.js';

// Background nebula image used for all UI panels
const bgImage = new Image();
bgImage.src = './textures/ui.png';

/**
 * Create the UI associated with the three cockpit panels.
 *
 * @param {Array<THREE.Mesh>} panels array of Plane meshes created in cockpit.js
 * @param {function(number):void} onWarpSelect callback receiving index of solarBodies
 * @param {function(number):void} onSpeedChange callback receiving new speed fraction (0–1)
 * @param {function():void} onLaunchProbe callback when the launch button is pressed
 * @returns {Object} UI controller with update() and handlePointer() methods
 */
export function createUI(panels, onWarpSelect = () => {}, onSpeedChange = () => {}, onLaunchProbe = () => {}) {
  // Create canvases and textures for each panel.
  const canvasSize = { width: 512, height: 256 };
  const canvases = panels.map(() => {
    const c = document.createElement('canvas');
    c.width = canvasSize.width;
    c.height = canvasSize.height;
    return c;
  });
  const textures = canvases.map((canvas, i) => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    panels[i].material.map = tex;
    panels[i].material.needsUpdate = true;
    return tex;
  });

  // State variables.
  let selectedWarpIndex = 2; // default warp target: Earth
  let selectedFunFactIndex = 0; // index into funFacts array for info panel
  let speedFraction = 0.1; // slider value between 0 and 1

  // Precompute list of warpable bodies (top-level planets/dwarf planets and the Sun).
  const warpTargets = solarBodies.map((b, idx) => ({ name: b.name, index: idx }));

  /**
   * Convert speed fraction to a human‑readable string.  We map the
   * slider exponentially between 1 mph and the speed of light.  The
   * conversion constants are defined in constants.js.  For speeds
   * below 1,000 mph we show mph; above that we show multiples of c.
   *
   * @param {number} f speed fraction (0–1)
   * @returns {string} formatted speed
   */
  function speedToString(f) {
    // Map 0–1 -> log scale: 0 → log10(1 mph), 1 → log10(c mph).
    const minMph = 1;
    const maxMph = C_KMPS * 1000 * 3600 / 1000 * 0.621371; // convert c to mph
    const logMin = Math.log10(minMph);
    const logMax = Math.log10(maxMph);
    const mph = Math.pow(10, logMin + f * (logMax - logMin));
    if (mph < 1e6) {
      return `${Math.round(mph).toLocaleString()} mph`;
    }
    // Convert mph to fraction of c.
    const kmps = mph * MPH_TO_KMPS;
    const fractionOfC = kmps / C_KMPS;
    return `${fractionOfC.toFixed(4)} c`;
  }

  // Draw nebula background image if loaded
  function drawBackground(ctx) {
    if (bgImage.complete && bgImage.naturalWidth > 0) {
      ctx.drawImage(bgImage, 0, 0, canvasSize.width, canvasSize.height);
    } else {
      ctx.fillStyle = '#101010';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    }
  }

  /**
   * Draw the warp selection list on the first panel.
   */
  function drawWarpPanel(ctx) {
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    drawBackground(ctx);
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Warp To:', 20, 40);
    ctx.font = '20px sans-serif';
    const startY = 70;
    const lineHeight = 26;
    warpTargets.forEach((target, i) => {
      const y = startY + i * lineHeight;
      if (i === selectedWarpIndex) {
        ctx.fillStyle = '#6633cc';
        ctx.fillRect(15, y - 18, canvasSize.width - 30, lineHeight);
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = '#ddddff';
      }
      ctx.fillText(target.name, 25, y);
    });
    ctx.fillStyle = '#777777';
    ctx.font = '16px sans-serif';
    ctx.fillText('Tap a body to warp', 20, canvasSize.height - 20);
  }

  /**
   * Draw the map and info panel.  The upper half is a simple
   * top‑down map of the major bodies, scaled to fit.  The lower half
   * displays the name of the selected target and cycles through its
   * fun facts.  bodyPositions should be an array of THREE.Vector3 in
   * world units corresponding to solarBodies order.
   */
  function drawMapPanel(ctx, bodyPositions) {
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    // Background
    drawBackground(ctx);
    // Map area (top half)
    const mapHeight = canvasSize.height * 0.55;
    ctx.save();
    ctx.translate(canvasSize.width / 2, mapHeight / 2);
    // Determine a scale factor so that outermost orbit fits.  The
    // farthest body is Neptune at ~4495 units from the Sun.  We'll use
    // its distance as the max radius and map it to 90% of half the
    // panel width.
    const maxDist = Math.max(...bodyPositions.map(p => p.length()));
    const scale = (Math.min(canvasSize.width, mapHeight) * 0.45) / (maxDist || 1);
    // Draw orbits and positions
    for (let i = 0; i < bodyPositions.length; i++) {
      const pos = bodyPositions[i];
      const x = pos.x * scale;
      const y = pos.z * scale; // top‑down uses x/z plane
      // Orbit circle for the first eight planets only
      if (i > 0) {
        ctx.strokeStyle = 'rgba(100,100,100,0.5)';
        ctx.lineWidth = 1;
        const r = bodyPositions[i].length() * scale;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, 2 * Math.PI);
        ctx.stroke();
      }
      // Body marker
      ctx.beginPath();
      ctx.fillStyle = (i === selectedWarpIndex ? '#ff6699' : '#66ccff');
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
    // Info area (bottom half)
    const infoTop = mapHeight + 5;
    ctx.fillStyle = '#202020';
    ctx.fillRect(0, infoTop, canvasSize.width, canvasSize.height - infoTop);
    const body = solarBodies[selectedWarpIndex];
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px sans-serif';
    ctx.fillText(body.name, 20, infoTop + 30);
    ctx.font = '16px sans-serif';
    const fact = body.funFacts ? body.funFacts[selectedFunFactIndex % body.funFacts.length] : '';
    // Wrap text onto multiple lines.
    const maxWidth = canvasSize.width - 40;
    let words = fact.split(' ');
    let line = '';
    let y = infoTop + 60;
    ctx.fillStyle = '#cccccc';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, 20, y);
        line = words[n] + ' ';
        y += 20;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 20, y);
    ctx.fillStyle = '#777777';
    ctx.font = '14px sans-serif';
    ctx.fillText('Tap info to cycle facts', 20, canvasSize.height - 10);
  }

  /**
   * Draw the speed slider and probe controls.
   */
  function drawSpeedPanel(ctx) {
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    drawBackground(ctx);
    // Slider label and value
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px sans-serif';
    ctx.fillText('Speed', 20, 40);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#ffffaa';
    ctx.fillText(speedToString(speedFraction), 120, 40);
    // Slider bar
    const sliderX = 30;
    const sliderY = 80;
    const sliderW = canvasSize.width - 60;
    const sliderH = 10;
    ctx.fillStyle = '#444444';
    ctx.fillRect(sliderX, sliderY, sliderW, sliderH);
    // Slider knob
    const knobX = sliderX + sliderW * speedFraction;
    const knobR = 8;
    ctx.beginPath();
    ctx.arc(knobX, sliderY + sliderH / 2, knobR, 0, 2 * Math.PI);
    ctx.fillStyle = '#ff66cc';
    ctx.fill();
    // Launch probe button
    const btnX = (canvasSize.width - 160) / 2;
    const btnY = 140;
    const btnW = 160;
    const btnH = 40;
    ctx.fillStyle = '#6633cc';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText('Launch Probe', btnX + 14, btnY + 26);
    // Instruction
    ctx.fillStyle = '#777777';
    ctx.font = '14px sans-serif';
    ctx.fillText('Drag slider to change speed', 20, canvasSize.height - 40);
    ctx.fillText('Tap button to launch probe', 20, canvasSize.height - 20);
  }

  // Initial draw
  drawWarpPanel(canvases[0].getContext('2d'));
  drawMapPanel(canvases[1].getContext('2d'), solarBodies.map(() => new THREE.Vector3()));
  drawSpeedPanel(canvases[2].getContext('2d'));
  textures.forEach(tex => tex.needsUpdate = true);

  /**
   * Update the UI each frame.  Provide the latest positions of solar
   * bodies so the map can reflect their motion.  Also update based
   * on current selected warp target and speed fraction.
   *
   * @param {Array<THREE.Vector3>} bodyPositions positions of top-level solar bodies in world units
   */
  function update(bodyPositions) {
    drawWarpPanel(canvases[0].getContext('2d'));
    drawMapPanel(canvases[1].getContext('2d'), bodyPositions);
    drawSpeedPanel(canvases[2].getContext('2d'));
    textures.forEach(tex => tex.needsUpdate = true);
  }

  /**
   * Handle a pointer event on one of the panels.  The caller must
   * determine which panel was hit and provide the UV coordinates of
   * the intersection (range 0–1 in both axes).  Based on the panel
   * index and UV the UI state is updated and callbacks are invoked.
   *
   * @param {number} panelIndex 0,1,2 for left, centre, right
   * @param {{u:number,v:number}} uv UV coordinates of the pointer on the panel
   */
  function handlePointer(panelIndex, uv) {
    // Convert UV (0 at bottom left) to canvas coordinates (0,0 at top left)
    const x = uv.u * canvasSize.width;
    const y = (1 - uv.v) * canvasSize.height;
    if (panelIndex === 0) {
      // Warp panel: detect which row was clicked.
      const startY = 70;
      const lineHeight = 26;
      const idx = Math.floor((y - startY + lineHeight / 2) / lineHeight);
      if (idx >= 0 && idx < warpTargets.length) {
        selectedWarpIndex = idx;
        selectedFunFactIndex = 0;
        onWarpSelect(idx);
      }
    } else if (panelIndex === 1) {
      // Info panel: tapping anywhere cycles fun facts.
      selectedFunFactIndex++;
    } else if (panelIndex === 2) {
      // Speed/probe panel.
      const sliderY = 80;
      const sliderHeight = 10;
      const sliderX = 30;
      const sliderW = canvasSize.width - 60;
      if (y >= sliderY - 10 && y <= sliderY + sliderHeight + 10) {
        // Adjust speed fraction based on x coordinate.
        let f = (x - sliderX) / sliderW;
        f = Math.min(1, Math.max(0, f));
        speedFraction = f;
        onSpeedChange(f);
      }
      // Launch probe button detection
      const btnX = (canvasSize.width - 160) / 2;
      const btnY = 140;
      const btnW = 160;
      const btnH = 40;
      if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
        onLaunchProbe();
      }
    }
  }

  return {
    update,
    handlePointer,
    get selectedWarpIndex() { return selectedWarpIndex; },
    get speedFraction() { return speedFraction; },
    set speedFraction(f) { speedFraction = f; }
  };
}