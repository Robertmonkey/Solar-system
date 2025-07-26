// Constants used throughout the solar system VR experience
export const G = 6.67430e-11; // Gravitational constant in m^3 / (kg·s²)
export const AU_KM = 149_597_870.7;

// Base conversion: 1 world unit = 1 meter.
export const KM_PER_WORLD_UNIT = 0.001;
export const KM_TO_WORLD_UNITS = 1000;

// True 1:1 scale for celestial bodies.
export const SIZE_MULTIPLIER = 1;

// Speed of light in kilometres per second.
export const C_KMPS = 299_792.458;

// MODIFIED: Maximum ship speed is now capped at the speed of light (c).
// The FLIGHT_SPEED_MULTIPLIER has been removed. Use the in-game Time Warp
// slider to achieve faster-than-light *travel times*.
export const MAX_FLIGHT_SPEED = C_KMPS * KM_TO_WORLD_UNITS;

// Conversion from miles per hour to kilometres per second.
export const MPH_TO_KMPS = 1.60934 / 3600;

// Time conversion helpers
export const TIME_BASE_SECONDS_PER_DAY = 86_400;
export const SEC_TO_DAYS = 1 / TIME_BASE_SECONDS_PER_DAY;

// Simulation time multiplier (modifiable)
let timeMultiplier = 500000;
export function getTimeMultiplier() {
  return timeMultiplier;
}
export function setTimeMultiplier(value) {
  timeMultiplier = value;
}

// Simple colour palette for the main bodies
export const PALETTE = {
  Sun: 0xffcc00,
  Mercury: 0xb1b1b1,
  Venus: 0xeedd82,
  Earth: 0x3366cc,
  Moon: 0x999999,
  Mars: 0xcc5533,
  Jupiter: 0xddaa77,
  Saturn: 0xffddaa,
  Uranus: 0x66ccff,
  Neptune: 0x3366aa,
  Pluto: 0x9999cc
};

// Centralised colour scheme for the cockpit and UI
export const COLORS = {
  uiBackground: 'rgba(10, 10, 20, 0.95)',
  uiHighlight: '#4caf50',
  uiRowHighlight: 'rgba(76, 175, 80, 0.7)',
  textPrimary: '#e0f0ff',
  textSecondary: '#cceeff',
  textInvert: '#ffffff',
  sliderTrack: 'rgba(90, 120, 160, 0.6)',
  cockpitBase: 0xb1b1b1,
  cockpitAccent: 0x3366aa,
  cockpitEmissive: 0xffcc00,
  controlBase: 0x3366cc,
  controlEmissive: 0xffddaa
};

// Shared font family used across the UI
export const FONT_FAMILY = "'Orbitron', sans-serif";
