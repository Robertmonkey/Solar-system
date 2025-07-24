export const bodies = [
  {
    name: 'Sun',
    parent: null,
    radiusKm: 696340,
    massKg: 1.9885e30,
    semiMajorAxisAU: 0,
    eccentricity: 0,
    orbitalPeriodDays: 0,
    axialTiltDeg: 7.25,
    rotationPeriodHours: 609.12,
    texture: 'textures/sun.jpg',
    facts: [
      'Contains 99.8% of all mass in the solar system.',
      'Nuclear fusion in its core converts 4 million tons of matter into energy every second.'
    ]
  },
  {
    name: 'Mercury',
    parent: 'Sun',
    radiusKm: 2439.7,
    massKg: 3.301e23,
    semiMajorAxisAU: 0.387,
    eccentricity: 0.2056,
    orbitalPeriodDays: 87.969,
    axialTiltDeg: 0.034,
    rotationPeriodHours: 1407.6,
    texture: 'textures/mercury.jpg',
    facts: [
      'A day on Mercury lasts longer than its year.',
      'Temperatures vary from -180°C to 430°C.',
      'Water ice hides in permanently shadowed craters.'
    ]
  },
  {
    name: 'Venus',
    parent: 'Sun',
    radiusKm: 6051.8,
    massKg: 4.867e24,
    semiMajorAxisAU: 0.723,
    eccentricity: 0.0067,
    orbitalPeriodDays: 224.701,
    axialTiltDeg: 177.36,
    rotationPeriodHours: -5832.5,
    texture: 'textures/venus_surface.jpg',
    facts: [
      'Venus rotates backwards compared to most planets.',
      'Its surface pressure is about 90 times that of Earth.',
      'The thick atmosphere traps heat in a runaway greenhouse effect.'
    ]
  },
  {
    name: 'Earth',
    parent: 'Sun',
    radiusKm: 6371,
    massKg: 5.972e24,
    semiMajorAxisAU: 1,
    eccentricity: 0.0167,
    orbitalPeriodDays: 365.256,
    axialTiltDeg: 23.44,
    rotationPeriodHours: 23.934,
    texture: 'textures/earth_daymap.jpg',
    facts: [
      'The only known world with liquid water on the surface.',
      'About 8 minutes of sunlight travel time away from the Sun.'
    ]
  },
  {
    name: 'Moon',
    parent: 'Earth',
    radiusKm: 1737.4,
    massKg: 7.342e22,
    semiMajorAxisAU: 0.00257,
    eccentricity: 0.0549,
    orbitalPeriodDays: 27.3217,
    axialTiltDeg: 6.68,
    rotationPeriodHours: 655.7,
    texture: 'textures/moon.jpg',
    facts: [
      'The Moon always shows the same face to Earth.',
      'It is slowly moving away at about 3.8 cm per year.'
    ]
  },
  {
    name: 'Mars',
    parent: 'Sun',
    radiusKm: 3389.5,
    massKg: 6.417e23,
    semiMajorAxisAU: 1.524,
    eccentricity: 0.0934,
    orbitalPeriodDays: 686.98,
    axialTiltDeg: 25.19,
    rotationPeriodHours: 24.623,
    texture: 'textures/mars.jpg',
    facts: [
      'Home to Olympus Mons, the largest volcano in the solar system.',
      'Has seasons similar to Earth due to its axial tilt.'
    ]
  },
  {
    name: 'Jupiter',
    parent: 'Sun',
    radiusKm: 69911,
    massKg: 1.898e27,
    semiMajorAxisAU: 5.204,
    eccentricity: 0.0489,
    orbitalPeriodDays: 4332.59,
    axialTiltDeg: 3.13,
    rotationPeriodHours: 9.93,
    texture: 'textures/jupiter.jpg',
    facts: [
      'Jupiter has a storm called the Great Red Spot that has raged for centuries.',
      'It is more than twice as massive as all other planets combined.'
    ]
  },
  {
    name: 'Saturn',
    parent: 'Sun',
    radiusKm: 58232,
    massKg: 5.683e26,
    semiMajorAxisAU: 9.537,
    eccentricity: 0.0565,
    orbitalPeriodDays: 10759.22,
    axialTiltDeg: 26.73,
    rotationPeriodHours: 10.7,
    texture: 'textures/saturn.jpg',
    facts: [
      'Saturn is the least dense planet; it would float in water.',
      'Its rings are made mostly of ice particles.'
    ]
  },
  {
    name: 'Uranus',
    parent: 'Sun',
    radiusKm: 25362,
    massKg: 8.681e25,
    semiMajorAxisAU: 19.191,
    eccentricity: 0.046,
    orbitalPeriodDays: 30685,
    axialTiltDeg: 97.77,
    rotationPeriodHours: -17.24,
    texture: 'textures/uranus.jpg',
    facts: [
      'Uranus rolls around the Sun on its side.',
      'It has the coldest atmosphere of any planet.'
    ]
  },
  {
    name: 'Neptune',
    parent: 'Sun',
    radiusKm: 24622,
    massKg: 1.024e26,
    semiMajorAxisAU: 30.07,
    eccentricity: 0.009,
    orbitalPeriodDays: 60190,
    axialTiltDeg: 28.32,
    rotationPeriodHours: 16.11,
    texture: 'textures/neptune.jpg',
    facts: [
      'Neptune was the first planet found through mathematical prediction.',
      'Supersonic winds blow through its atmosphere.'
    ]
  },
  {
    name: 'Pluto',
    parent: 'Sun',
    radiusKm: 1188.3,
    massKg: 1.309e22,
    semiMajorAxisAU: 39.482,
    eccentricity: 0.2488,
    orbitalPeriodDays: 90560,
    axialTiltDeg: 119.61,
    rotationPeriodHours: -153.3,
    texture: null,
    facts: [
      'Pluto is now classified as a dwarf planet.',
      'Its orbit is highly eccentric and inclined.'
    ]
  }
];
