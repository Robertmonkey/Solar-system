/*
 * audio.js
 *
 * Provides audio feedback for the VR experience. This version includes a
 * more robust text-to-speech implementation to ensure narration works reliably.
 */

import * as THREE from 'three';

let voices = [];
// Pre-load voices to avoid timing issues with the Speech Synthesis API
function loadVoices() {
    voices = window.speechSynthesis.getVoices();
}

export async function initAudio(camera, sourceObject) {
  const listener = new THREE.AudioListener();
  camera.add(listener);

  // Initial load of voices
  loadVoices();
  // If voices are not immediately available, they will be loaded later.
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  const loader = new THREE.AudioLoader();

  const [warpBuf, beepBuf, ambienceBuf] = await Promise.all([
    loader.loadAsync('./sounds/warp.mp3'),
    loader.loadAsync('./sounds/beep.mp3'),
    loader.loadAsync('./sounds/ambience.mp3')
  ]);

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
    playWarp() { if (warpSound.isPlaying) warpSound.stop(); warpSound.play(); },
    playBeep() { if (beepSound.isPlaying) beepSound.stop(); beepSound.play(); },
    speak(text) {
      if ('speechSynthesis' in window) {
        // Stop any currently speaking utterance
        window.speechSynthesis.cancel();
        
        const utter = new SpeechSynthesisUtterance(text);
        // --- FIX: Use pre-loaded voices array ---
        if (voices.length === 0) {
            // Attempt to load voices again if they weren't ready initially
            loadVoices();
        }
        utter.voice = voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
        utter.pitch = 0.6;
        utter.rate = 0.85;
        window.speechSynthesis.speak(utter);
      }
    }
  };
}
