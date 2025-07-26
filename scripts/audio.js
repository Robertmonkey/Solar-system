// This file has been simplified to use non-positional audio, which is more
// stable and less likely to cause the application to hang on load.

import * as THREE from 'three';

// Holds the browser's available text‑to‑speech voices when available.
let voices = [];
function loadVoices() { voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : []; }

/**
 * Initialize the audio system.  Attaches an AudioListener to the provided
 * camera and sets up simple audio sources for warp, beep and ambience.  The
 * passed `sounds` object should contain AudioBuffers for these keys:
 *   warp: AudioBuffer for the warp sound effect
 *   beep: AudioBuffer for the UI beep
 *   ambience: AudioBuffer for the looping ambience
 *   narrations (optional): an object mapping full narration text strings to
 *     AudioBuffers.  If provided, these clips will be played instead of
 *     synthesizing speech.
 *
 * Returns an object with playWarp(), playBeep() and speak() methods.
 */
export function initAudio(camera, sounds) {
  const listener = new THREE.AudioListener();
  camera.add(listener);

  // Preload voices if the Web Speech API is available.
  loadVoices();
  if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
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

  // A user gesture is often required to start audio.  We will start it on the
  // first beep.  Keep track so we do not restart the ambience each time.
  let hasStartedAmbience = false;

  // Helper to ensure the audio context has resumed.  Certain environments
  // suspend the audio context until a user gesture is detected.  Invoking
  // resume() just prior to playback guarantees sounds will be audible.  If
  // resume() throws or returns a promise, errors are ignored.
  function resumeAudio() {
    const context = listener.context || (listener.gain && listener.gain.context);
    if (context && typeof context.resume === 'function') {
      try { context.resume(); } catch (e) {/* ignore */}
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
      // Start ambience on the first beep attempt.
      if (!hasStartedAmbience) {
        try {
          ambience.play();
        } catch (e) {
          // If ambience fails to start due to lack of user gesture, ignore.
        }
        hasStartedAmbience = true;
      }
      if (beepSound.isPlaying) beepSound.stop();
      beepSound.play();
    },
    /**
     * Speak a line of narration.  On platforms that support the Web Speech API
     * this uses speech synthesis to generate speech.  On devices like the
     * Meta Quest browser where text‑to‑speech is unavailable, the function
     * returns without doing anything to avoid crashing the application.  You
     * may extend this method to play pre‑recorded narration clips by adding
     * them to the `sounds.narrations` object passed into initAudio and
     * looking them up by text.
     */
    speak: (text) => {
      resumeAudio();
      try {
        // If pre‑recorded narration clips are supplied under sounds.narrations,
        // play them instead of synthesizing speech.  The user can supply a
        // dictionary of AudioBuffers keyed by the exact narration text.
        if (sounds && typeof sounds.narrations === 'object' && sounds.narrations[text] instanceof AudioBuffer) {
          const narrationAudio = new THREE.Audio(listener);
          narrationAudio.setBuffer(sounds.narrations[text]);
          narrationAudio.play();
          return;
        }
        // Use the Web Speech API if available.  Some platforms (e.g. desktop
        // browsers) implement speechSynthesis; others like the Quest browser do not.
        if (typeof window !== 'undefined' && window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined') {
          // Cancel any previous utterances so they do not overlap.
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(text);
          if (voices.length === 0) loadVoices();
          utter.voice = voices.find(v => v.lang && v.lang.startsWith('en')) || voices[0] || null;
          // Lower pitch and slower rate for a “cosmic” sound.
          utter.pitch = 0.6;
          utter.rate = 0.85;
          window.speechSynthesis.speak(utter);
        } else {
          // Gracefully handle environments without speech synthesis.  We do not
          // throw an error here because that would prevent the game from
          // loading on devices like the Meta Quest.  Instead, we simply log
          // a warning so developers know why narration is not working.
          console.warn('Speech synthesis not available on this platform. Narration will be skipped.');
        }
      } catch (e) {
        // Never let an exception in speech synthesis crash the app.  Log it
        // for developers to debug but otherwise ignore it.
        console.error('Error during speech synthesis:', e);
      }
    }
  };
}
