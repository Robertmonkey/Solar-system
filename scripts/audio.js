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

  // A user gesture is often required to start audio. We will start it on the
  // first beep.  Keep track so we do not restart the ambience each time.
  let hasStartedAmbience = false;

  // Helper to ensure the browser audio context has resumed.  Certain
  // environments suspend the audio context until a user gesture is
  // detected.  Invoking resume() just prior to playback guarantees
  // sounds will be audible.  If resume() returns a promise we
  // silently ignore any errors.
  function resumeAudio() {
    const context = listener.context || listener.gain?.context;
    if (context && typeof context.resume === 'function') {
      try {
        context.resume();
      } catch (e) {
        // Ignore errors; the context may already be running or resume
        // may fail silently in some browsers.
      }
    }
  }

  return {
    playWarp: () => {
      resumeAudio();
      if (warpSound.isPlaying) warpSound.stop();
      warpSound.play();
    },
    playBeep: () => {
      resumeAudio();
      if (!hasStartedAmbience) {
        try {
          ambience.play();
        } catch (e) {
          // If ambience fails to start (e.g. because of user gesture
          // restrictions) ignore and try again later when beep plays.
        }
        hasStartedAmbience = true;
      }
      if (beepSound.isPlaying) beepSound.stop();
      beepSound.play();
    },
    speak: (text) => {
      resumeAudio();
      if ('speechSynthesis' in window) {
        // Cancel any previous utterances so they do not overlap.
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        if (voices.length === 0) loadVoices();
        utter.voice = voices.find(v => v.lang && v.lang.startsWith('en')) || voices[0] || null;
        utter.pitch = 0.6;
        utter.rate = 0.85;
        window.speechSynthesis.speak(utter);
      }
    }
  };
}
