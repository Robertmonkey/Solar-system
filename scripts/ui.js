// Simple UI system for the VR cockpit. This module draws three panels: a
// warp menu on the left, a settings menu on the right and a fun facts panel
// along the bottom. The panels are drawn onto canvases and converted to
// textures for use in Three.js. The UI exposes callbacks for user actions
// such as warping, toggling labels, toggling autopilot and narrating facts.

import * as THREE from 'three';

// Create the UI. `bodies` is an array of solar bodies returned from
// createSolarSystem. `callbacks` is an object with optional functions:
//   onWarp(index)       – called when the user selects a warp target.
//   onToggleLabels()    – called when the user toggles labels.
//   onToggleAutopilot() – called when the user toggles autopilot mode.
//   onNarrate(fact)     – called when the user presses the narrate button.
export function createUI(bodies, callbacks = {}) {
  const {
    onWarp = () => {},
    onToggleLabels = () => {},
    onToggleAutopilot = () => {},
    onNarrate = () => {}
  } = callbacks;

  // Keep track of which body is currently selected for warping so that we
  // can highlight it in the menu and update the facts panel.
  let selectedIndex = 0;

  // Dimensions of the panels in world units. These can be adjusted to fit
  // your cockpit geometry. The aspect ratios of the canvases below should
  // match these values.
  const LEFT_WIDTH = 0.7;
  const LEFT_HEIGHT = 1.5;
  const RIGHT_WIDTH = 0.7;
  const RIGHT_HEIGHT = 1.5;
  const BOTTOM_WIDTH = 1.4;
  const BOTTOM_HEIGHT = 0.6;

  // Utility to create a canvas and 2D context with given pixel dimensions.
  function makeCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    // Improve text rendering quality on high DPI displays.
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    return { canvas, ctx };
  }

  // Create canvases for each panel. The resolution is arbitrary but should
  // maintain a reasonable aspect ratio relative to the panel size.
  const left = makeCanvas(256, 512);
  const right = makeCanvas(256, 512);
  const bottom = makeCanvas(512, 256);

  // Create textures from the canvases. We enable transparency so the panels
  // blend nicely into the cockpit. Set min/mag filters to linear for smooth
  // scaling.
  const leftTexture = new THREE.CanvasTexture(left.canvas);
  leftTexture.minFilter = THREE.LinearFilter;
  leftTexture.magFilter = THREE.LinearFilter;
  leftTexture.wrapS = THREE.ClampToEdgeWrapping;
  leftTexture.wrapT = THREE.ClampToEdgeWrapping;

  const rightTexture = new THREE.CanvasTexture(right.canvas);
  rightTexture.minFilter = THREE.LinearFilter;
  rightTexture.magFilter = THREE.LinearFilter;
  rightTexture.wrapS = THREE.ClampToEdgeWrapping;
  rightTexture.wrapT = THREE.ClampToEdgeWrapping;

  const bottomTexture = new THREE.CanvasTexture(bottom.canvas);
  bottomTexture.minFilter = THREE.LinearFilter;
  bottomTexture.magFilter = THREE.LinearFilter;
  bottomTexture.wrapS = THREE.ClampToEdgeWrapping;
  bottomTexture.wrapT = THREE.ClampToEdgeWrapping;

  // Create planes for the panels. These meshes can be positioned and
  // oriented anywhere in your cockpit. They are returned via the UI
  // object so that you can add them to the scene.
  const leftMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(LEFT_WIDTH, LEFT_HEIGHT),
    new THREE.MeshBasicMaterial({ map: leftTexture, transparent: true })
  );
  const rightMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(RIGHT_WIDTH, RIGHT_HEIGHT),
    new THREE.MeshBasicMaterial({ map: rightTexture, transparent: true })
  );
  const bottomMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(BOTTOM_WIDTH, BOTTOM_HEIGHT),
    new THREE.MeshBasicMaterial({ map: bottomTexture, transparent: true })
  );

  // Draw the static parts of the right panel once. The right panel shows
  // toggle buttons for labels and autopilot. We draw simple boxes with
  // text inside. When toggled, we invert the colour of the box.
  let labelsEnabled = true;
  let autopilotEnabled = false;

  function drawRight() {
    const ctx = right.ctx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.font = '18px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // Draw Labels toggle
    const boxW = ctx.canvas.width * 0.8;
    const boxH = 40;
    let y = 60;
    ctx.fillStyle = labelsEnabled ? '#4caf50' : '#777';
    ctx.fillRect((ctx.canvas.width - boxW) / 2, y, boxW, boxH);
    ctx.fillStyle = '#fff';
    ctx.fillText('Show Labels', (ctx.canvas.width - boxW) / 2 + 10, y + boxH / 2);

    // Draw Autopilot toggle
    y += 60;
    ctx.fillStyle = autopilotEnabled ? '#4caf50' : '#777';
    ctx.fillRect((ctx.canvas.width - boxW) / 2, y, boxW, boxH);
    ctx.fillStyle = '#fff';
    ctx.fillText('Autopilot', (ctx.canvas.width - boxW) / 2 + 10, y + boxH / 2);

    // Update texture
    rightTexture.needsUpdate = true;
  }

  // Draw the warp target list on the left panel. The list is scaled to fit
  // all bodies; when there are many entries the text will be smaller.
  function drawLeft() {
    const ctx = left.ctx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const itemCount = bodies.length;
    const itemHeight = ctx.canvas.height / itemCount;
    const fontSize = Math.max(14, Math.floor(itemHeight * 0.5));
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    for (let i = 0; i < itemCount; i++) {
      const y = i * itemHeight;
      // Highlight the selected row
      if (i === selectedIndex) {
        ctx.fillStyle = 'rgba(76, 175, 80, 0.6)';
        ctx.fillRect(0, y, ctx.canvas.width, itemHeight);
      }
      ctx.fillStyle = '#fff';
      ctx.fillText(bodies[i].data.name, 10, y + itemHeight / 2);
    }
    leftTexture.needsUpdate = true;
  }

  // Draw the fun facts panel. We show the first few facts for the selected
  // body and draw a button that the user can press to trigger narration.
  function drawBottom() {
    const ctx = bottom.ctx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const body = bodies[selectedIndex].data;
    ctx.font = '16px sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${body.name} – Fun Facts:`, 10, 10);
    let y = 40;
    const maxWidth = ctx.canvas.width - 20;
    const lineHeight = 18;
    body.funFacts.forEach(fact => {
      // Wrap long facts into multiple lines
      const words = fact.split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, 10, y);
          line = words[n] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), 10, y);
      y += lineHeight;
    });

    // Draw narrate button
    const btnW = ctx.canvas.width * 0.3;
    const btnH = 40;
    const btnX = (ctx.canvas.width - btnW) / 2;
    const btnY = ctx.canvas.height - btnH - 20;
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '18px sans-serif';
    ctx.fillText('Narrate', btnX + btnW / 2, btnY + btnH / 2);

    bottomTexture.needsUpdate = true;
  }

  // Initial draw
  drawLeft();
  drawRight();
  drawBottom();

  // Handle pointer interactions. The caller should provide a raycaster and
  // call this function when a ray intersects the UI panels. `panel` is one
  // of 'left', 'right' or 'bottom', and `uv` is the texture coordinate of
  // the intersection point (with x and y in the range 0–1).
  function handlePointer(panel, uv) {
    if (panel === 'left') {
      const index = Math.floor(uv.y * bodies.length);
      if (index >= 0 && index < bodies.length && index !== selectedIndex) {
        selectedIndex = index;
        drawLeft();
        drawBottom();
        onWarp(index);
      }
    } else if (panel === 'right') {
      // Determine which toggle was hit based on uv.y
      if (uv.y > 0.2 && uv.y < 0.35) {
        labelsEnabled = !labelsEnabled;
        drawRight();
        onToggleLabels(labelsEnabled);
      } else if (uv.y > 0.35 && uv.y < 0.5) {
        autopilotEnabled = !autopilotEnabled;
        drawRight();
        onToggleAutopilot(autopilotEnabled);
      }
    } else if (panel === 'bottom') {
      // Check if the narrate button was pressed
      const btnTop = 1 - (40 + 20) / bottom.canvas.height;
      const btnBottom = 1 - 20 / bottom.canvas.height;
      const btnLeft = (1 - 0.3) / 2;
      const btnRight = (1 + 0.3) / 2;
      if (uv.x > btnLeft && uv.x < btnRight && uv.y > btnTop && uv.y < btnBottom) {
        const fact = bodies[selectedIndex].data.funFacts[0];
        onNarrate(fact);
      }
    }
  }

  return {
    leftMesh,
    rightMesh,
    bottomMesh,
    draw: () => {
      drawLeft();
      drawRight();
      drawBottom();
    },
    handlePointer,
    setSelectedIndex: index => {
      selectedIndex = index;
      drawLeft();
      drawBottom();
    },
    getSelectedIndex: () => selectedIndex
  };
}