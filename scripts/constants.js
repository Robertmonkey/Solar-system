// Constants used throughout the solar system VR experience
// Gravitational constant expressed in km^3/(kg·s²) to match the rest of the
// code which performs physics calculations using kilometres.
export const G = 6.67430e-20;
// Astronomical unit in kilometres
export const AU_KM = 149_597_870.7;

// Base conversion for world units.  One world unit corresponds to this many kilometres.
// Choosing one million kilometres per world unit allows the entire solar system to be
// represented within a reasonable scale while preserving relative proportions.  At
// this scale the Earth–Sun distance (~150 million km) is 150 world units and the
// Earth’s radius (~6,371 km) becomes ~0.0063 world units.  The SIZE_MULTIPLIER
// defined below enlarges bodies to make them visible at VR scale.
// Conversion from kilometres to internal world units
export const KM_PER_WORLD_UNIT = 1e6;
export const KM_TO_WORLD_UNITS = 1 / KM_PER_WORLD_UNIT;

// Body radii are multiplied by this factor when converted to world units so they
// remain visible at the KM_PER_WORLD_UNIT scale.  Without a size multiplier the
// planets would be tiny points and impossible to appreciate in VR.  Adjust this
// value to trade realism for visibility.
export const SIZE_MULTIPLIER = 1_000;

// Speed of light in kilometres per second.  Used to map the throttle slider to a
// physically meaningful maximum.  Travelling at c takes ~8 minutes to reach
// Earth from the Sun at this world scale.
export const C_KMPS = 299_792.458;

// Maximum ship speed in world units per second.  We use the speed of light
// converted to the internal scaling so the throttle value maps directly to a
// meaningful velocity.
export const MAX_FLIGHT_SPEED = C_KMPS * KM_TO_WORLD_UNITS;

// Conversion from miles per hour to kilometres per second.  The throttle slider
// uses an exponential mapping between 1 mph and c.
export const MPH_TO_KMPS = 1.60934 / 3600;

// Time conversion helpers
export const TIME_BASE_SECONDS_PER_DAY = 86_400;
export const SEC_TO_DAYS = 1 / TIME_BASE_SECONDS_PER_DAY;

// Simulation time multiplier (modifiable)
let timeMultiplier = 50;
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
