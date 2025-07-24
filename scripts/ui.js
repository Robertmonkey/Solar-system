/*
 * ui.js
 *
 * A revamped UI system designed for the lectern cockpit.  This module draws
 * three separate panels: a warp menu, a probe control panel and a
 * fun‑facts panel.  Each panel is rendered to its own canvas and mapped
 * onto a Three.js plane.  The warp menu lists all bodies vertically and
 * allows the user to warp by selecting a row with their fingertip.  The probe
 * panel provides sliders for adjusting mass, velocity and time before firing a
 * probe.  The facts panel displays basic data and fun facts about the
 * currently selected body and exposes a narrate button.
 */

import * as THREE from 'three';

/**
 * Create the UI panels.
 *
 * @param {Array} bodies Array of solar bodies returned from createSolarSystem().
 * Each element should expose a `data` field with `name`, `massKg`, `radiusKm`,
 * and `facts` properties.
 * @param {Object} callbacks Optional callbacks:
 *   - onWarp(index: number): Called when the user selects a warp target.
 *   - onProbeChange(settings: { mass: number, velocity: number }): Called when
 *       probe sliders are changed.
 *   - onTimeChange(value: number): Called when the time slider is adjusted.
 *   - onNarrate(fact: string): Called when the narrate button is pressed.
 * @returns {{ warpMesh: THREE.Mesh, probeMesh: THREE.Mesh, factsMesh: THREE.Mesh,
 *            handlePointer: Function, setSelectedIndex: Function,
 *            getSelectedIndex: Function, getProbeSettings: Function }}
 */
export function createUI(bodies, callbacks = {}) {
  const {
    onWarp = () => {},
    onProbeChange = () => {},
    onTimeChange = () => {},
    onNarrate = () => {}
  } = callbacks;

  // Internal state
  let selectedIndex = 0;
  let probeMass = 0.5;     // Range [0,1]
  let probeVelocity = 0.5; // Range [0,1]
  let timeValue = 0.5;     // Range [0,1]

  // Panel dimensions (world units).  The warp and probe panels are square while
  // the facts panel is wider to accommodate text.
  const WARP_SIZE = 1.0;
  const PROBE_SIZE = 1.0;
  const FACTS_WIDTH = 1.6;
  const FACTS_HEIGHT = 0.6;

  // Utility: create a canvas and 2D context.
  function makeCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    return { canvas, ctx };
  }

  // Create canvases.  Higher resolutions yield better text quality.
  const warp = makeCanvas(512, 512);
  const probe = makeCanvas(512, 1024); // higher resolution for controls
  const facts = makeCanvas(1024, 512); // larger facts panel resolution

  // Create textures
  const warpTexture = new THREE.CanvasTexture(warp.canvas);
  warpTexture.minFilter = THREE.LinearFilter;
  warpTexture.magFilter = THREE.LinearFilter;
  warpTexture.wrapS = THREE.ClampToEdgeWrapping;
  warpTexture.wrapT = THREE.ClampToEdgeWrapping;
  const probeTexture = new THREE.CanvasTexture(probe.canvas);
  probeTexture.minFilter = THREE.LinearFilter;
  probeTexture.magFilter = THREE.LinearFilter;
  probeTexture.wrapS = THREE.ClampToEdgeWrapping;
  probeTexture.wrapT = THREE.ClampToEdgeWrapping;
  const factsTexture = new THREE.CanvasTexture(facts.canvas);
  factsTexture.minFilter = THREE.LinearFilter;
  factsTexture.magFilter = THREE.LinearFilter;
  factsTexture.wrapS = THREE.ClampToEdgeWrapping;
  factsTexture.wrapT = THREE.ClampToEdgeWrapping;

  // Create meshes for each panel
  const warpMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(WARP_SIZE, WARP_SIZE),
    new THREE.MeshBasicMaterial({ map: warpTexture, transparent: true })
  );
  const probeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PROBE_SIZE, PROBE_SIZE),
    new THREE.MeshBasicMaterial({ map: probeTexture, transparent: true })
  );
  const factsMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(FACTS_WIDTH, FACTS_HEIGHT),
    new THREE.MeshBasicMaterial({ map: factsTexture, transparent: true })
  );

  // Track row bounds for hit detection
  const warpRowBounds = [];
  let hoverIndex = -1;

  /**
   * Draw the warp menu as a vertical list of rows. Each row spans the width of
   * the canvas. The selected or hovered row is highlighted.
   */
  function drawWarp() {
    const ctx = warp.ctx;
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
    ctx.fillRect(0, 0, width, height);

    const count = bodies.length;
    const rowH = height / count;
    ctx.font = '24px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < count; i++) {
      const y = i * rowH;
      warpRowBounds[i] = {
        start: 1 - (i + 1) / count,
        end: 1 - i / count
      };
      if (i === hoverIndex || i === selectedIndex) {
        ctx.fillStyle = 'rgba(76, 175, 80, 0.7)';
        ctx.fillRect(0, y, width, rowH);
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = '#cceeff';
      }
      ctx.fillText(bodies[i].data.name, 20, y + rowH / 2);
    }
    warpTexture.needsUpdate = true;
  }

  /**
   * Draw the probe control panel.  Two sliders allow adjustment of mass and
   * velocity.  Values are displayed numerically to aid precise tuning.
   */
  function drawProbe() {
    const ctx = probe.ctx;
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
    ctx.fillRect(0, 0, width, height);
    ctx.font = '24px Orbitron, sans-serif';
    ctx.fillStyle = '#e0f0ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Titles
    ctx.fillText('Probe Controls', width / 2, 40);
    // Mass slider background
    const sliderX = width * 0.25;
    const sliderY = height * 0.3;
    const sliderW = width * 0.1;
    const sliderH = height * 0.4;
    ctx.fillStyle = 'rgba(90, 120, 160, 0.6)';
    ctx.fillRect(sliderX - sliderW / 2, sliderY - sliderH / 2, sliderW, sliderH);
    // Mass knob
    const massY = sliderY + sliderH / 2 - probeMass * sliderH;
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(sliderX - sliderW / 2, massY - 5, sliderW, 10);
    // Mass label
    ctx.fillStyle = '#e0f0ff';
    ctx.font = '18px Orbitron, sans-serif';
    ctx.fillText(`Mass: ${(probeMass * 100).toFixed(0)}%`, sliderX, sliderY + sliderH / 2 + 30);
    // Velocity slider background
    const hSliderX = width * 0.55;
    const hSliderY = height * 0.55;
    const hSliderW = width * 0.4;
    const hSliderH = height * 0.08;
    ctx.fillStyle = 'rgba(90, 120, 160, 0.6)';
    ctx.fillRect(hSliderX - hSliderW / 2, hSliderY - hSliderH / 2, hSliderW, hSliderH);
    // Velocity knob
    const velX = hSliderX - hSliderW / 2 + probeVelocity * hSliderW;
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(velX - 5, hSliderY - hSliderH / 2, 10, hSliderH);
    // Velocity label
    ctx.fillStyle = '#e0f0ff';
    ctx.font = '18px Orbitron, sans-serif';
    ctx.fillText(`Velocity: ${(probeVelocity * 100).toFixed(0)}%`, hSliderX, hSliderY + hSliderH);

    // Time slider background (vertical on the right)
    const tSliderX = width * 0.85;
    const tSliderY = height * 0.3;
    const tSliderW = width * 0.1;
    const tSliderH = height * 0.4;
    ctx.fillStyle = 'rgba(90, 120, 160, 0.6)';
    ctx.fillRect(tSliderX - tSliderW / 2, tSliderY - tSliderH / 2, tSliderW, tSliderH);
    // Time knob
    const timeY = tSliderY + tSliderH / 2 - timeValue * tSliderH;
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(tSliderX - tSliderW / 2, timeY - 5, tSliderW, 10);
    // Time label
    ctx.fillStyle = '#e0f0ff';
    ctx.font = '18px Orbitron, sans-serif';
    ctx.fillText(`Time: ${(timeValue * 100).toFixed(0)}%`, tSliderX, tSliderY + tSliderH / 2 + 30);
    probeTexture.needsUpdate = true;
  }

  /**
   * Draw the facts panel.  Displays the name and basic data of the selected
   * body along with up to three fun facts.  A button at the bottom triggers
   * narration via the provided callback.
   */
  function drawFacts() {
    const ctx = facts.ctx;
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
    ctx.fillRect(0, 0, width, height);
    const body = bodies[selectedIndex].data;
    ctx.font = '24px Orbitron, sans-serif';
    ctx.fillStyle = '#e0f0ff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    // Header: name
    ctx.fillText(body.name, 20, 20);
    ctx.font = '18px Orbitron, sans-serif';
    // Data lines (mass and radius if available)
    let y = 60;
    if (body.massKg !== undefined) {
      ctx.fillText(`Mass: ${body.massKg.toExponential(2)} kg`, 20, y);
      y += 22;
    }
    if (body.radiusKm !== undefined) {
      ctx.fillText(`Radius: ${body.radiusKm} km`, 20, y);
      y += 22;
    }
    // Fun facts
    ctx.font = '18px Orbitron, sans-serif';
    ctx.fillStyle = '#cceeff';
    ctx.fillText('Fun Facts:', 20, y);
    y += 22;
    const maxWidth = width - 40;
    const lineHeight = 20;
    const factsList = body.facts || body.funFacts || [];
    for (let i = 0; i < Math.min(factsList.length, 3); i++) {
      const text = factsList[i];
      let line = '';
      const words = text.split(' ');
      for (let w = 0; w < words.length; w++) {
        const testLine = line + words[w] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && w > 0) {
          ctx.fillText(line.trim(), 20, y);
          line = words[w] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), 20, y);
      y += lineHeight;
    }
    // Narrate button
    const btnW = width * 0.3;
    const btnH = 50;
    const btnX = (width - btnW) / 2;
    const btnY = height - btnH - 20;
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.font = '20px Orbitron, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Narrate', btnX + btnW / 2, btnY + btnH / 2);
    factsTexture.needsUpdate = true;
  }

  // Initial draws
  drawWarp();
  drawProbe();
  drawFacts();

  /**
   * Handle pointer interaction.  Based on which panel is hit and the UV
   * coordinates, update the appropriate state and call callbacks.
   * @param {'warp'|'probe'|'facts'} panel
   * @param {{ x: number, y: number }} uv UV coordinates (0–1)
   */
  function handlePointer(panel, uv) {
    if (panel === 'warp') {
      const raw = (1 - uv.y) * bodies.length;
      let index = Math.floor(raw);
      if (index < 0) index = 0;
      if (index >= bodies.length) index = bodies.length - 1;
      hoverIndex = index;
      if (index !== selectedIndex) {
        selectedIndex = index;
        drawWarp();
        drawProbe();
        drawFacts();
        onWarp(index);
      } else {
        drawWarp();
      }
      return;
    }

    if (hoverIndex !== -1) {
      hoverIndex = -1;
      drawWarp();
    }

    if (panel === 'probe') {
      const x = uv.x;
      const y = uv.y;
      // Determine if within vertical mass slider region
      // Using same coordinates as drawProbe()
      const sliderX = 0.25;
      const sliderW = 0.1;
      const sliderY = 0.3;
      const sliderH = 0.4;
      // Check horizontal proximity
      if (Math.abs(x - sliderX) < sliderW / 2) {
        // Convert y to slider domain (0 at bottom, 1 at top)
        const top = sliderY - sliderH / 2;
        const bottom = sliderY + sliderH / 2;
        const t = THREE.MathUtils.clamp((bottom - y) / sliderH, 0, 1);
        probeMass = t;
        drawProbe();
        onProbeChange({ mass: probeMass, velocity: probeVelocity });
        return;
      }
      // Check velocity slider region
      const hSliderX = 0.55;
      const hSliderW = 0.4;
      const hSliderY = 0.55;
      const hSliderH = 0.08;
      if (Math.abs(y - hSliderY) < hSliderH / 2 && x > hSliderX - hSliderW / 2 && x < hSliderX + hSliderW / 2) {
        const t = THREE.MathUtils.clamp((x - (hSliderX - hSliderW / 2)) / hSliderW, 0, 1);
        probeVelocity = t;
        drawProbe();
        onProbeChange({ mass: probeMass, velocity: probeVelocity });
        return;
      }
      // Check time slider region
      const tSliderX = 0.85;
      const tSliderW = 0.1;
      const tSliderY = 0.3;
      const tSliderH = 0.4;
      if (Math.abs(x - tSliderX) < tSliderW / 2) {
        const top = tSliderY - tSliderH / 2;
        const bottom = tSliderY + tSliderH / 2;
        const t = THREE.MathUtils.clamp((bottom - y) / tSliderH, 0, 1);
        timeValue = t;
        drawProbe();
        onTimeChange(timeValue);
        return;
      }
    } else if (panel === 'facts') {
      // Narrate button detection
      const btnTopUV = 1 - (50 + 20) / facts.canvas.height;
      const btnBottomUV = 1 - 20 / facts.canvas.height;
      const btnLeftUV = (1 - 0.3) / 2;
      const btnRightUV = (1 + 0.3) / 2;
      if (uv.x > btnLeftUV && uv.x < btnRightUV && uv.y > btnTopUV && uv.y < btnBottomUV) {
        const data = bodies[selectedIndex].data;
        const fact = (data.facts || data.funFacts || [])[0];
        if (fact) onNarrate(fact);
      }
    }
  }

  return {
    warpMesh,
    probeMesh,
    factsMesh,
    handlePointer,
    setSelectedIndex: index => {
      if (index >= 0 && index < bodies.length) {
        selectedIndex = index;
        drawWarp();
        drawProbe();
        drawFacts();
      }
    },
    getSelectedIndex: () => selectedIndex,
    getProbeSettings: () => ({ mass: probeMass, velocity: probeVelocity })
  };
}
