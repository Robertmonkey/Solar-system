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
// Inverse conversion: multiply kilometres by this factor to obtain world units.
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

// Conversion from miles per hour to kilometres per second.  The throttle slider
// uses an exponential mapping between 1 mph and c.
export const MPH_TO_KMPS = 1.60934 / 3600;
