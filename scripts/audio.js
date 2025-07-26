// This file has been simplified to use non-positional audio, which is more
// stable and less likely to cause the application to hang on load.

import * as THREE from 'three';

let voices = [];
function loadVoices() { voices = window.speechSynthesis.getVoices(); }

export function initAudio(camera, sounds) {
  const listener = new THREE.AudioListener();
  camera.add(listener);

  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  // --- FIX: Using simpler, more stable non-positional audio ---
  const warpSound = new THREE.Audio(listener);
  warpSound.setBuffer(sounds.warp);

  const beepSound = new THREE.Audio(listener);
  beepSound.setBuffer(sounds.beep);

  const ambience = new THREE.Audio(listener);
  ambience.setBuffer(sounds.ambience);
  ambience.setLoop(true);
  ambience.setVolume(0.5);
  // A user gesture is often required to start audio. We will start it on the first beep.
  let hasStartedAmbience = false;

  return {
    playWarp: () => { if (warpSound.isPlaying) warpSound.stop(); warpSound.play(); },
    playBeep: () => { 
        if (!hasStartedAmbience) {
            ambience.play();
            hasStartedAmbience = true;
        }
        if (beepSound.isPlaying) beepSound.stop(); 
        beepSound.play(); 
    },
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
