/*
 * audio.js
 *
 * Provides audio feedback for the VR experience. Sound effects are
 * loaded and attached to a positional source so they emanate from the
 * cockpit dashboard. A simple text‑to‑speech helper is also exposed so
 * the UI can read fun facts aloud.
 */

// Use the same Three.js instance as the rest of the app via import map.
// The previous hard-coded version pulled in a second copy of the library,
// causing class mismatches when objects were shared across modules.
import * as THREE from 'three';

export async function initAudio(camera, sourceObject) {
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

  // Use positional audio so sounds originate from their source object.
  const warpSound = new THREE.PositionalAudio(listener);
  warpSound.setBuffer(warpBuf);
  warpSound.setRefDistance(2);
  sourceObject.add(warpSound);

  const beepSound = new THREE.PositionalAudio(listener);
  beepSound.setBuffer(beepBuf);
  beepSound.setRefDistance(2);
  sourceObject.add(beepSound);

  const ambience = new THREE.Audio(listener);
  ambience.setBuffer(ambienceBuf);
  ambience.setLoop(true);
  ambience.setVolume(0.5);
  ambience.play();

  return {
    playWarp() { warpSound.isPlaying && warpSound.stop(); warpSound.play(); },
    playBeep() { beepSound.isPlaying && beepSound.stop(); beepSound.play(); },
    speak(text) {
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }
    }
  };
}