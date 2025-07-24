// Constants used throughout the solar system VR experience
// Gravitational constant expressed in km^3/(kg·s²) to match the rest of the
// code which performs physics calculations using kilometres.
export const G = 6.67430e-20;
export const AU_IN_KM = 149_597_870.7; // astronomical unit in kilometres

// Base conversion for world units.  One world unit corresponds to this many kilometres.
// Choosing one million kilometres per world unit allows the entire solar system to be
// represented within a reasonable scale while preserving relative proportions.  At
// this scale the Earth–Sun distance (~150 million km) is 150 world units and the
// Earth’s radius (~6,371 km) becomes ~0.0063 world units.  The SIZE_MULTIPLIER
// defined below enlarges bodies to make them visible at VR scale.
export const KM_PER_WORLD_UNIT = 1e6;

// Body radii are multiplied by this factor when converted to world units so they
// remain visible at the KM_PER_WORLD_UNIT scale.  Without a size multiplier the
// planets would be tiny points and impossible to appreciate in VR.  Adjust this
// value to trade realism for visibility.
export const SIZE_MULTIPLIER = 1_000;

// Speed of light in kilometres per second.  Used to map the throttle slider to a
// physically meaningful maximum.  Travelling at c takes ~8 minutes to reach
// Earth from the Sun at this world scale.
export const C_KMPS = 299_792.458;

// Conversion from miles per hour to kilometres per second.  The throttle slider
// uses an exponential mapping between 1 mph and c.
export const MPH_TO_KMPS = 1.60934 / 3600;

// --- Visual Palette ---
// Colours used throughout the cockpit and UI.  These provide a consistent
// cosmic aesthetic and centralise tweaks in one place.  Each entry defines the
// base colour as well as the emissive colour used for subtle glow effects.
export const PALETTE = {
  base: 0x1a1a20,       // dark metal surfaces
  accent: 0x224466,     // glowing rim and desk edges
  control: 0x00aaff,    // joystick shafts and similar details
  highlight: 0xffaa00,  // throttle lever
  danger: 0xff2222      // fire button and warnings
};

export const EMISSIVE = {
  accent: 0x112244,
  control: 0x001133,
  highlight: 0x331100,
  danger: 0x330000
};
