// scripts/constants.js

// Constants used throughout the solar system VR experience

// NEW: The primary challenge of a 1:1 scale is the massive range of distances,
// which causes floating-point precision issues (z-fighting) in standard 3D
// renderers. We solve this by using a logarithmic depth buffer (enabled in main.js)
// and by carefully managing our units. We will use a true 1-to-1 scale where
// 1 world unit = 1 meter.

// MODIFIED: G is now the standard gravitational constant in meters, not kilometers.
// The value is expressed in m^3 / (kg·s²).
export const G = 6.67430e-11;

// Astronomical unit in kilometres
export const AU_KM = 149_597_870.7;

// MODIFIED: Base conversion for world units. One world unit is now 1 meter.
// To convert from the data's kilometers to our world's meters, we multiply by 1000.
export const KM_PER_WORLD_UNIT = 0.001; // 1000 meters (world units) per 1 km
export const KM_TO_WORLD_UNITS = 1000;

// MODIFIED: For a true 1:1 scale, the SIZE_MULTIPLIER must be 1. Planets will
// now have their actual size in meters. This will make them invisible from a
// distance, which we will solve with helper sprites in solarSystem.js.
export const SIZE_MULTIPLIER = 1;

// Speed of light in kilometres per second.
export const C_KMPS = 299_792.458;

// Maximum ship speed in world units per second.
// MODIFIED: With a 1:1 scale, the solar system is enormous. We must increase the
// flight speed multiplier exponentially to make travel between planets possible
// in a reasonable amount of time. This is an artistic choice for gameplay.
const FLIGHT_SPEED_MULTIPLIER = 5e7; // Was 100
export const MAX_FLIGHT_SPEED = C_KMPS * KM_TO_WORLD_UNITS * FLIGHT_SPEED_MULTIPLIER;

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
