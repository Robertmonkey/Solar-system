// This version receives pre-loaded audio buffers from the main script.

import * as THREE from 'three';

let voices = [];
function loadVoices() { voices = window.speechSynthesis.getVoices(); }

// --- FIX: Receives a map of pre-loaded audio buffers ---
export function initAudio(camera, sourceObject, sounds) {
  const listener = new THREE.AudioListener();
  camera.add(listener);

  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  const warpSound = new THREE.PositionalAudio(listener);
  warpSound.setBuffer(sounds.warp);
  warpSound.setRefDistance(2);
  sourceObject.add(warpSound);

  const beepSound = new THREE.PositionalAudio(listener);
  beepSound.setBuffer(sounds.beep);
  beepSound.setRefDistance(2);
  sourceObject.add(beepSound);

  const ambience = new THREE.Audio(listener);
  ambience.setBuffer(sounds.ambience);
  ambience.setLoop(true);
  ambience.setVolume(0.5);
  ambience.play();

  return {
    playWarp: () => { if (warpSound.isPlaying) warpSound.stop(); warpSound.play(); },
    playBeep: () => { if (beepSound.isPlaying) beepSound.stop(); beepSound.play(); },
    speak: (text) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        if (voices.length === 0) loadVoices();
        utter.voice = voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
        utter.pitch = 0.6; utter.rate = 0.85;
        window.speechSynthesis.speak(utter);
      }
    }
  };
}
