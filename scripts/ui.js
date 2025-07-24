/*
 * ui.js
 *
 * A revamped UI system designed for the lectern cockpit.  This module draws
 * three separate panels: a radial warp menu, a probe control panel and a
 * fun‑facts panel.  Each panel is rendered to its own canvas and mapped
 * onto a Three.js plane.  The radial menu allows the user to warp to any
 * celestial body by selecting a wedge with their fingertip.  The probe
 * panel provides sliders for adjusting mass and velocity before firing a
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
 *   - onNarrate(fact: string): Called when the narrate button is pressed.
 * @returns {{ warpMesh: THREE.Mesh, probeMesh: THREE.Mesh, factsMesh: THREE.Mesh,
 *            handlePointer: Function, setSelectedIndex: Function,
 *            getSelectedIndex: Function, getProbeSettings: Function }}
 */
export function createUI(bodies, callbacks = {}) {
  const {
    onWarp = () => {},
    onProbeChange = () => {},
    onNarrate = () => {}
  } = callbacks;

  // Internal state
  let selectedIndex = 0;
  let probeMass = 0.5;     // Range [0,1]
  let probeVelocity = 0.5; // Range [0,1]

  // Panel dimensions (world units).  The warp and probe panels are square for
  // radial/sliders; the facts panel is wider to accommodate text.
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
  const probe = makeCanvas(512, 512);
  const facts = makeCanvas(1024, 384);

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

  /**
   * Draw the radial warp menu.  Each body is represented as a wedge in a
   * circular menu.  The selected body is highlighted with a brighter fill.
   */
  function drawWarp() {
    const ctx = warp.ctx;
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    // Background with slight translucency for blending
    ctx.fillStyle = 'rgba(40, 40, 50, 0.85)';
    ctx.fillRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) * 0.9;
    const count = bodies.length;
    const twoPi = Math.PI * 2;
    // Draw sectors
    for (let i = 0; i < count; i++) {
      const startAngle = twoPi * i / count - Math.PI / 2;
      const endAngle = twoPi * (i + 1) / count - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      // Highlight the selected wedge
      if (i === selectedIndex) {
        ctx.fillStyle = 'rgba(76, 175, 80, 0.7)';
      } else {
        ctx.fillStyle = 'rgba(70, 70, 90, 0.6)';
      }
      ctx.fill();
      // Draw dividing lines
      ctx.strokeStyle = 'rgba(100, 100, 130, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.stroke();
      // Label: place text at the middle of the sector
      const midAngle = (startAngle + endAngle) / 2;
      const tx = cx + (radius * 0.6) * Math.cos(midAngle);
      const ty = cy + (radius * 0.6) * Math.sin(midAngle);
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.font = '20px Orbitron, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const name = bodies[i].data.name;
      // Shorten long names if necessary
      const label = name.length > 10 ? name.slice(0, 9) + '…' : name;
      ctx.fillText(label, 0, 0);
      ctx.restore();
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
    ctx.fillStyle = 'rgba(40, 40, 50, 0.85)';
    ctx.fillRect(0, 0, width, height);
    ctx.font = '20px Orbitron, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Titles
    ctx.fillText('Probe Controls', width / 2, 40);
    // Mass slider background
    const sliderX = width * 0.25;
    const sliderY = height * 0.3;
    const sliderW = width * 0.1;
    const sliderH = height * 0.4;
    ctx.fillStyle = 'rgba(90, 90, 120, 0.6)';
    ctx.fillRect(sliderX - sliderW / 2, sliderY - sliderH / 2, sliderW, sliderH);
    // Mass knob
    const massY = sliderY + sliderH / 2 - probeMass * sliderH;
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(sliderX - sliderW / 2, massY - 5, sliderW, 10);
    // Mass label
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Orbitron, sans-serif';
    ctx.fillText(`Mass: ${(probeMass * 100).toFixed(0)}%`, sliderX, sliderY + sliderH / 2 + 30);
    // Velocity slider background
    const hSliderX = width * 0.55;
    const hSliderY = height * 0.55;
    const hSliderW = width * 0.4;
    const hSliderH = height * 0.08;
    ctx.fillStyle = 'rgba(90, 90, 120, 0.6)';
    ctx.fillRect(hSliderX - hSliderW / 2, hSliderY - hSliderH / 2, hSliderW, hSliderH);
    // Velocity knob
    const velX = hSliderX - hSliderW / 2 + probeVelocity * hSliderW;
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(velX - 5, hSliderY - hSliderH / 2, 10, hSliderH);
    // Velocity label
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Orbitron, sans-serif';
    ctx.fillText(`Velocity: ${(probeVelocity * 100).toFixed(0)}%`, hSliderX, hSliderY + hSliderH);
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
    ctx.fillStyle = 'rgba(40, 40, 50, 0.85)';
    ctx.fillRect(0, 0, width, height);
    const body = bodies[selectedIndex].data;
    ctx.font = '24px Orbitron, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    // Header: name
    ctx.fillText(body.name, 20, 20);
    ctx.font = '16px Orbitron, sans-serif';
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
    ctx.font = '16px Orbitron, sans-serif';
    ctx.fillStyle = '#cccccc';
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
      // Convert UV to polar coordinates centred at (0.5,0.5)
      const dx = uv.x - 0.5;
      const dy = uv.y - 0.5;
      const angle = Math.atan2(dy, dx); // range -π to π
      const twoPi = Math.PI * 2;
      let normalized = angle;
      if (normalized < 0) normalized += twoPi;
      // Adjust for start angle offset (-π/2)
      normalized = (normalized + Math.PI / 2) % twoPi;
      const index = Math.floor(normalized / twoPi * bodies.length);
      if (index >= 0 && index < bodies.length && index !== selectedIndex) {
        selectedIndex = index;
        drawWarp();
        drawProbe();
        drawFacts();
        onWarp(index);
      }
    } else if (panel === 'probe') {
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
