/*
 * audio.js
 *
 * Provides immersive, positional audio feedback for the VR experience,
 * along with a robust text-to-speech implementation.
 */
import * as THREE from 'three';

// This holds the browser's available text-to-speech voices.
let voices = [];
function loadVoices() {
  voices = window.speechSynthesis.getVoices();
}

export function initAudio(camera, sourceObject, sounds) {
  const listener = new THREE.AudioListener();
  camera.add(listener);

  // Load voices for narration when the page loads and when they change.
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  // --- POSITIONAL AUDIO SETUP ---
  // Warp and Beep sounds are now PositionalAudio, making them 3D.
  // They are attached to a source object (like the cockpit) to give them a location.

  const warpSound = new THREE.PositionalAudio(listener);
  warpSound.setBuffer(sounds.warp);
  warpSound.setRefDistance(10); // The distance at which the sound starts to fall off.
  warpSound.setRolloffFactor(2); // How quickly the sound falls off.
  sourceObject.add(warpSound);

  const beepSound = new THREE.PositionalAudio(listener);
  beepSound.setBuffer(sounds.beep);
  beepSound.setRefDistance(5);
  sourceObject.add(beepSound);

  // Ambience remains non-positional as it's background sound.
  const ambience = new THREE.Audio(listener);
  ambience.setBuffer(sounds.ambience);
  ambience.setLoop(true);
  ambience.setVolume(0.4);

  // --- AUDIO CONTEXT MANAGEMENT ---
  // This helper function is crucial. It ensures the browser's audio engine
  // is running before we attempt to play any sound.
  const resumeContext = () => {
    const context = listener.context;
    if (context.state === 'suspended') {
      context.resume();
    }
  };

  return {
    // This function will be called once, after the first user gesture.
    startAmbience: () => {
      resumeContext();
      if (!ambience.isPlaying) {
        ambience.play();
      }
    },
    playWarp: () => {
      resumeContext();
      if (warpSound.isPlaying) warpSound.stop();
      warpSound.play();
    },
    playBeep: () => {
      resumeContext();
      if (beepSound.isPlaying) beepSound.stop();
      beepSound.play();
    },
    speak: (text) => {
      resumeContext();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        if (voices.length === 0) loadVoices(); // Reload if empty
        utter.voice = voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
        utter.pitch = 0.7;
        utter.rate = 0.9;
        window.speechSynthesis.speak(utter);
      }
    }
  };
}
