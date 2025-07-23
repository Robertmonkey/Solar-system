/*
 * ui.js (Enhanced Command Centre Panels)
 *
 * This module defines the virtual dashboard used within the Solar System VR
 * experience.  In response to user feedback the UI has been reorganised into
 * three distinct panels: a navigation panel on the left for selecting warp
 * targets, a systems panel on the right for controlling ship functions and
 * launching probes, and a dedicated facts panel below the display for
 * reading trivia and statistics about the currently targeted body.  Each
 * panel is rendered to its own CanvasTexture and composited with additive
 * blending to create a luminous, futuristic appearance.  The systems panel
 * now offers a separate probe configuration menu accessible via a large
 * button; probe mass and launch speed sliders are hidden until needed.
 * Additional information such as orbital period, distance from the Sun and
 * approximate orbital velocity are presented on the facts panel alongside
 * the existing radius and mass lines.  All interactive elements may be
 * activated simply by touching them with your index finger—no pinch or
 * trigger gesture is required.
 */

import * as THREE from 'three';
import { solarBodies } from './data.js';
import { C_KMPS, MPH_TO_KMPS } from './constants.js';

// Nebula background for panels (imported image lives in textures/ui.png).
const bgImage = new Image();
bgImage.src = './textures/ui.png';

/**
 * Create the cockpit UI.  Three Meshes should be provided corresponding to
 * the left (navigation), right (systems) and facts panels; the returned
 * object exposes methods for updating and handling pointer events.  Callbacks
 * supplied via parameters are invoked when the user selects a warp target,
 * adjusts the ship speed/time warp, launches a probe, toggles autopilot or
 * labels, cycles through fun facts or requests narration.
 *
 * @param {THREE.Mesh} leftPanel The left panel mesh for the warp target list.
 * @param {THREE.Mesh} rightPanel The right panel mesh for ship systems.
 * @param {THREE.Mesh} factsPanel The lower panel mesh for body facts.
 * @param {Function} onWarpSelect Called when a new warp target is selected.
 * @param {Function} onSpeedChange Called when ship speed or time warp changes.
 * @param {Function} onLaunchProbe Called when the user taps the launch probe control.
 * @param {Function} onToggleAutopilot Called when autopilot is toggled.
 * @param {Function} onToggleLabels Called when planet labels are toggled.
 * @param {Function} onFunFact Called when the fun fact is cycled.
 * @param {Function} onNarrate Called when the narrate button is pressed.
 */
export function createUI(
  leftPanel,
  rightPanel,
  factsPanel,
  onWarpSelect,
  onSpeedChange,
  onLaunchProbe,
  onToggleAutopilot,
  onToggleLabels,
  onFunFact,
  onNarrate
) {
  // Canvas dimensions; square textures provide sufficient resolution
  const size = { width: 512, height: 512 };

  function makeCanvas() {
    const c = document.createElement('canvas');
    c.width = size.width;
    c.height = size.height;
    return c;
  }

  // Set up canvas, context and texture for the left panel
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

  // Set up canvas, context and texture for the right panel
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

  // Set up canvas, context and texture for the facts panel
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

  // Internal UI state.  warpTargetIndex selects which solar body is active,
  // infoBodyIndex controls which body is displayed on the facts panel and fun
  // fact index is used for cycling trivia.  Additional state tracks the
  // slider fractions for ship speed/time warp and probe options, boolean
  // toggles and whether the probe menu is open.
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
    showProbeMenu: false,
  };

  // Mark UI dirty when background loads
  bgImage.addEventListener('load', () => {
    state.needsRedraw = true;
  });

  // Precompute warp target list.  Each entry contains the body name and index.
  const warpTargets = solarBodies.map((b, i) => ({ name: b.name, index: i }));

  /**
   * Draw the nebula background on the provided context.  If the background
   * image has loaded, draw it at a reduced opacity for a subtle effect.
   * @param {CanvasRenderingContext2D} ctx
   */
  function drawBg(ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size.width, size.height);
    if (bgImage.complete && bgImage.naturalWidth > 0) {
      ctx.globalAlpha = 0.35;
      ctx.drawImage(bgImage, 0, 0, size.width, size.height);
      ctx.globalAlpha = 1.0;
    }
  }

  /**
   * Helper for drawing text.  Uses the Orbitron font for a sci‑fi look.
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} str
   * @param {number} x
   * @param {number} y
   * @param {number} s Font size
   * @param {string} col Colour
   * @param {string} weight Font weight
   */
  function text(ctx, str, x, y, s = 18, col = '#aaddff', weight = 'normal') {
    ctx.font = `${weight} ${s}px Orbitron`;
    ctx.fillStyle = col;
    ctx.fillText(str, x, y);
  }

  /**
   * Draw the left panel containing the list of warp targets.  The currently
   * selected target is highlighted.  To conserve vertical space only a
   * subset of bodies may be displayed; the remainder are truncated.
   * @param {THREE.Vector3[]} bodyPositions Unused but kept for compatibility.
   */
  function drawLeft(bodyPositions) {
    drawBg(leftCtx);
    const x0 = 30;
    text(leftCtx, 'WARP TARGET', x0, 40, 22, '#ffffff', 'bold');
    const lineHeight = 22;
    // Determine how many items fit on the panel (subtracting header and margin)
    const maxItems = Math.floor((size.height - 80) / lineHeight) - 2;
    warpTargets.slice(0, maxItems).forEach((t, i) => {
      const y = 80 + i * lineHeight;
      if (i === state.warpTargetIndex) {
        // Blue highlight behind the selected target
        leftCtx.fillStyle = 'rgba(80,120,255,0.6)';
        leftCtx.fillRect(x0 - 10, y - 16, 240, lineHeight);
      }
      text(leftCtx, t.name, x0, y, 16, i === state.warpTargetIndex ? '#ffffff' : '#bbddff');
    });
    leftTex.needsUpdate = true;
  }

  /**
   * Draw the right panel.  Depending on `state.showProbeMenu` either the
   * main systems controls or the probe configuration menu will be rendered.
   */
  function drawRight() {
    drawBg(rightCtx);
    const x0 = 40;
    if (!state.showProbeMenu) {
      // Main systems menu
      text(rightCtx, 'SYSTEMS', x0, 40, 22, '#ffffff', 'bold');
      // Probe options button
      rightCtx.fillStyle = '#223355';
      rightCtx.fillRect(x0, 80, 200, 32);
      text(rightCtx, 'PROBE OPTIONS', x0 + 10, 103, 16, '#88bbff');

      // Autopilot toggle
      text(rightCtx, 'AUTOPILOT', x0, 150, 16);
      rightCtx.fillStyle = state.autopilot ? '#226622' : '#662222';
      rightCtx.fillRect(x0, 165, 120, 28);
      text(rightCtx, state.autopilot ? 'ON' : 'OFF', x0 + 10, 185, 16, '#ffffff');

      // Labels toggle
      text(rightCtx, 'LABELS', x0, 220, 16);
      rightCtx.fillStyle = state.labels ? '#226622' : '#662222';
      rightCtx.fillRect(x0, 235, 120, 28);
      text(rightCtx, state.labels ? 'ON' : 'OFF', x0 + 10, 255, 16, '#ffffff');

      // Launch probe button
      text(rightCtx, 'LAUNCH PROBE', x0, 290, 16);
      rightCtx.fillStyle = '#663333';
      rightCtx.fillRect(x0, 305, 160, 32);
      text(rightCtx, 'FIRE', x0 + 10, 327, 16, '#ffffff');

    } else {
      // Probe configuration menu
      text(rightCtx, 'PROBE OPTIONS', x0, 40, 22, '#ffffff', 'bold');
      const w = 280;
      // Probe mass slider
      const probeMass = 10 + Math.pow(state.probeMassFraction, 3) * 1e6;
      text(rightCtx, `MASS: ${probeMass.toFixed(0)} kg`, x0, 90, 16);
      rightCtx.fillStyle = '#223355';
      rightCtx.fillRect(x0, 105, w, 8);
      rightCtx.fillStyle = '#ff8888';
      rightCtx.fillRect(x0, 105, w * state.probeMassFraction, 8);
      // Probe speed slider
      const probeSpeed = state.probeSpeedFraction * 100;
      text(rightCtx, `VELOCITY: ${probeSpeed.toFixed(1)}% c`, x0, 140, 16);
      rightCtx.fillStyle = '#223355';
      rightCtx.fillRect(x0, 155, w, 8);
      rightCtx.fillStyle = '#ff8888';
      rightCtx.fillRect(x0, 155, w * state.probeSpeedFraction, 8);
      // Back button
      rightCtx.fillStyle = '#223355';
      rightCtx.fillRect(x0, 200, 120, 32);
      text(rightCtx, 'BACK', x0 + 10, 224, 16, '#88bbff');
    }
    rightTex.needsUpdate = true;
  }

  /**
   * Draw the facts panel.  Displays statistics and trivia for the currently
   * selected body.  Additional lines show distance, orbital period and
   * approximate orbital velocity when available.
   */
  function drawFacts() {
    drawBg(factsCtx);
    const body = solarBodies[state.infoBodyIndex] || solarBodies[0];
    const x0 = 30;
    text(factsCtx, body.name.toUpperCase(), x0, 40, 22, '#ffffff', 'bold');

    // Body colour indicator (small circle)
    if (body.color) {
      factsCtx.fillStyle = '#' + body.color.toString(16).padStart(6, '0');
      factsCtx.beginPath();
      factsCtx.arc(x0 + 40, 100, 30, 0, Math.PI * 2);
      factsCtx.fill();
    }

    // Core stats
    text(factsCtx, `RADIUS: ${body.radius} km`, x0, 150, 16);
    if (body.mass) text(factsCtx, `MASS: ${body.mass.toExponential(2)} kg`, x0, 176, 16);
    if (body.a) text(factsCtx, `DISTANCE: ${(body.a).toFixed(1)} million km`, x0, 202, 16);
    if (body.period) text(factsCtx, `PERIOD: ${body.period} days`, x0, 228, 16);
    // Approximate orbital velocity: v = 2πa / (period * day)
    if (body.a && body.period) {
      const v = (2 * Math.PI * body.a * 1e6) / (body.period * 86400); // km/s
      text(factsCtx, `VELOCITY: ${v.toFixed(2)} km/s`, x0, 254, 16);
    }

    // Fun fact text wrapping
    const fact = body.funFacts ? body.funFacts[state.funFactIndex % body.funFacts.length] : 'No data.';
    factsCtx.fillStyle = '#cccccc';
    factsCtx.font = '14px Orbitron';
    let line = '';
    let y = 300;
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

    // Button at bottom for narration or cycling facts
    factsCtx.fillStyle = '#223355';
    factsCtx.fillRect(x0, size.height - 60, 180, 32);
    text(factsCtx, 'NARRATE', x0 + 10, size.height - 36, 16, '#88bbff');

    factsTex.needsUpdate = true;
  }

  /**
   * Convert the ship speed fraction into a human‑readable string.  Speeds
   * progress logarithmically from 1 mph up to the speed of light.  Values
   * below 1000 mph, between 1000 mph and 1 million mph, and above display
   * differently.
   * @param {number} f Fraction between 0 and 1
   */
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

  /**
   * Update all three panels if the state has changed.  This function is
   * intended to be called once per frame from the main animation loop.
   * @param {THREE.Vector3[]} bodyPositions The current positions of solar bodies.
   * @param {number} closestIndex Index of the nearest body for the facts panel.
   */
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

  /**
   * Handle pointer events from the dashboard panels.  The `panel` argument
   * specifies which CanvasTexture (left, right or facts) is being touched
   * and `uv` contains the normalised texture coordinates of the hit point.
   * Coordinates are flipped vertically to align with canvas space.  This
   * function modifies state and invokes callbacks accordingly.
   * @param {string} panel Which panel was touched: 'left', 'right' or 'facts'.
   * @param {THREE.Vector2} uv UV coordinates (0..1) of the hit point.
   */
  function handlePointer(panel, uv) {
    state.needsRedraw = true;
    const x = uv.x * size.width;
    // Flip Y coordinate: three.js sets (0,0) at bottom left; canvas uses (0,0) at top
    const y = (1 - uv.y) * size.height;

    if (panel === 'left') {
      // Determine which warp target was touched
      if (x > 20 && x < 260) {
        const lineHeight = 22;
        const idx = Math.floor((y - 80 + lineHeight / 2) / lineHeight);
        if (idx >= 0 && idx < warpTargets.length) {
          state.warpTargetIndex = idx;
          state.infoBodyIndex = idx;
          state.funFactIndex = 0;
          onWarpSelect && onWarpSelect(idx);
        }
      }
    } else if (panel === 'right') {
      if (!state.showProbeMenu) {
        // Main systems interactions
        // Probe options button
        if (y > 80 && y < 112 && x > 40 && x < 240) {
          state.showProbeMenu = true;
          return;
        }
        // Autopilot toggle
        if (y > 165 && y < 193 && x > 40 && x < 160) {
          state.autopilot = !state.autopilot;
          onToggleAutopilot && onToggleAutopilot(state.autopilot);
          return;
        }
        // Labels toggle
        if (y > 235 && y < 263 && x > 40 && x < 160) {
          state.labels = !state.labels;
          onToggleLabels && onToggleLabels(state.labels);
          return;
        }
        // Launch probe button
        if (y > 305 && y < 337 && x > 40 && x < 200) {
          onLaunchProbe && onLaunchProbe();
          return;
        }
      } else {
        // Probe menu interactions
        const sliderX = 40;
        const sliderW = 280;
        // Probe mass slider (105..113)
        if (y > 105 && y < 113) {
          const f = THREE.MathUtils.clamp((x - sliderX) / sliderW, 0, 1);
          state.probeMassFraction = f;
          return;
        }
        // Probe speed slider (155..163)
        if (y > 155 && y < 163) {
          const f = THREE.MathUtils.clamp((x - sliderX) / sliderW, 0, 1);
          state.probeSpeedFraction = f;
          return;
        }
        // Back button (200..232)
        if (y > 200 && y < 232 && x > 40 && x < 160) {
          state.showProbeMenu = false;
          return;
        }
      }
    } else if (panel === 'facts') {
      // Narration and fun fact cycling
      if (y > size.height - 60) {
        // Narrate current fun fact
        const body = solarBodies[state.infoBodyIndex] || solarBodies[0];
        const facts = body.funFacts || [];
        const fact = facts[state.funFactIndex % facts.length];
        onNarrate && onNarrate(fact);
      } else {
        // Advance to next fun fact
        state.funFactIndex++;
        if (onFunFact) {
          const body = solarBodies[state.infoBodyIndex] || solarBodies[0];
          const facts = body.funFacts || [];
          if (facts.length) onFunFact(facts[state.funFactIndex % facts.length]);
        }
      }
    }
  }

  // Kick off an initial draw to populate all panels
  update(solarBodies.map(() => new THREE.Vector3()), state.infoBodyIndex);

  return {
    update,
    handlePointer,
    /**
     * Programmatically select a warp target.  This updates both the warp
     * target index and the facts panel index so the target’s info is shown.
     * @param {number} i Index into solarBodies
     */
    selectWarpTarget(i) {
      if (i >= 0 && i < warpTargets.length) {
        state.warpTargetIndex = i;
        state.infoBodyIndex = i;
        state.funFactIndex = 0;
        onWarpSelect && onWarpSelect(i);
        state.needsRedraw = true;
      }
    },
    // Expose reactive properties used by the controls system to animate the
    // throttle and joystick; assigning speedFraction marks the UI dirty.
    get speedFraction() { return state.speedFraction; },
    set speedFraction(f) {
      if (state.speedFraction !== f) {
        state.speedFraction = f;
        state.needsRedraw = true;
        onSpeedChange && onSpeedChange(f, state.timeScale);
      }
    },
    get timeScale() { return state.timeScale; },
    set timeScale(t) {
      if (state.timeScale !== t) {
        state.timeScale = t;
        state.needsRedraw = true;
        onSpeedChange && onSpeedChange(state.speedFraction, t);
      }
    },
    get probeMass() {
      return 10 + Math.pow(state.probeMassFraction, 3) * 1e6;
    },
    get probeLaunchSpeed() {
      return state.probeSpeedFraction * C_KMPS;
    },
    get autopilot() { return state.autopilot; },
    get warpTargetIndex() { return state.warpTargetIndex; },
    get labelsVisible() { return state.labels; },
  };
}
