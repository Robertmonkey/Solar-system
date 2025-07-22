/*
 * audio.js
 *
 * Provides simple audio feedback for the VR experience.  For the
 * purposes of this refactoring the audio system is left as a stub
 * because the original sound assets are not present in this project.
 * You can extend this module to load actual audio files using
 * THREE.AudioLoader and play them on user interactions such as warp
 * events or probe launches.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';

export async function initAudio(camera) {
  // Attach an audio listener so positional audio works in VR.
  const listener = new THREE.AudioListener();
  camera.add(listener);

  const loader = new THREE.AudioLoader();

  // Load all three sound effects in parallel.
  const [warpBuf, beepBuf, ambienceBuf] = await Promise.all([
    loader.loadAsync('./sounds/warp.mp3'),
    loader.loadAsync('./sounds/beep.mp3'),
    loader.loadAsync('./sounds/ambience.mp3')
  ]);

  const warpSound = new THREE.Audio(listener);
  warpSound.setBuffer(warpBuf);

  const beepSound = new THREE.Audio(listener);
  beepSound.setBuffer(beepBuf);

  const ambience = new THREE.Audio(listener);
  ambience.setBuffer(ambienceBuf);
  ambience.setLoop(true);
  ambience.setVolume(0.5);
  ambience.play();

  return {
    playWarp() { warpSound.isPlaying && warpSound.stop(); warpSound.play(); },
    playBeep() { beepSound.isPlaying && beepSound.stop(); beepSound.play(); }
  };
}