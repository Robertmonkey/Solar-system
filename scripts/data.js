// Data for solar system bodies, including planets, moons and probes.
// Each entry contains physical parameters and fun facts used by the UI.

export const bodies = [
  // The Sun is the centre of the solar system. It does not orbit another body.
  {
    name: 'Sun',
    parent: null,
    radius: 5.0,      // scaled radius used for rendering
    orbitRadius: 0.0, // sun is at origin
    orbitPeriod: 0.0,
    rotationPeriod: 25.0,
    tilt: 7.25,
    texture: 'textures/sun.jpg',
    funFacts: [
      'The Sun contains more than 99% of the mass of the entire Solar System.',
      'It takes about eight minutes for light from the Sun to reach Earth.'
    ]
  },
  // Mercury
  {
    name: 'Mercury',
    parent: 'Sun',
    radius: 1.0,
    orbitRadius: 7.0,
    orbitPeriod: 88.0,
    rotationPeriod: 58.6,
    tilt: 0.0,
    texture: 'textures/mercury.jpg',
    funFacts: [
      'Mercury is the smallest planet in the solar system.',
      'A year on Mercury is just 88 Earth days.'
    ]
  },
  // Venus
  {
    name: 'Venus',
    parent: 'Sun',
    radius: 1.2,
    orbitRadius: 10.0,
    orbitPeriod: 224.7,
    rotationPeriod: -243.0, // retrograde rotation
    tilt: 177.4,
    texture: 'textures/venus.jpg',
    funFacts: [
      'Venus rotates backwards relative to most planets.',
      'It has a thick atmosphere that traps heat causing a runaway greenhouse effect.'
    ]
  },
  // Earth
  {
    name: 'Earth',
    parent: 'Sun',
    radius: 1.3,
    orbitRadius: 13.0,
    orbitPeriod: 365.25,
    rotationPeriod: 1.0,
    tilt: 23.5,
    texture: 'textures/earth.jpg',
    funFacts: [
      'Earth is the only known planet to support life.',
      '70% of Earth’s surface is covered by water.'
    ]
  },
  // Earth’s Moon
  {
    name: 'Moon',
    parent: 'Earth',
    radius: 0.35,
    orbitRadius: 2.5,
    orbitPeriod: 27.3,
    rotationPeriod: 27.3,
    tilt: 6.7,
    texture: 'textures/moon.jpg',
    funFacts: [
      'The Moon always shows the same face to the Earth.',
      'Footprints on the Moon will remain for millions of years due to the lack of atmosphere.'
    ]
  },
  // Mars
  {
    name: 'Mars',
    parent: 'Sun',
    radius: 0.7,
    orbitRadius: 20.0,
    orbitPeriod: 687.0,
    rotationPeriod: 1.03,
    tilt: 25.0,
    texture: 'textures/mars.jpg',
    funFacts: [
      'Mars has the largest volcano in the solar system, Olympus Mons.',
      'A Martian day is only slightly longer than an Earth day.'
    ]
  },
  // Jupiter
  {
    name: 'Jupiter',
    parent: 'Sun',
    radius: 3.0,
    orbitRadius: 45.0,
    orbitPeriod: 4332.0,
    rotationPeriod: 0.41,
    tilt: 3.1,
    texture: 'textures/jupiter.jpg',
    funFacts: [
      'Jupiter is the largest planet in the solar system.',
      'A day on Jupiter lasts just under 10 hours.'
    ]
  },
  // Europa – moon of Jupiter
  {
    name: 'Europa',
    parent: 'Jupiter',
    radius: 0.35,
    orbitRadius: 5.0,
    orbitPeriod: 3.55,
    rotationPeriod: 3.55,
    tilt: 0.1,
    texture: 'textures/europa.jpg',
    funFacts: [
      'Europa is thought to have a subsurface ocean beneath its icy crust.',
      'It is one of the smoothest objects in the solar system.'
    ]
  },
  // Saturn
  {
    name: 'Saturn',
    parent: 'Sun',
    radius: 2.5,
    orbitRadius: 70.0,
    orbitPeriod: 10759.0,
    rotationPeriod: 0.44,
    tilt: 26.7,
    texture: 'textures/saturn.jpg',
    funFacts: [
      'Saturn is known for its beautiful ring system.',
      'It is less dense than water – it would float in a large enough bathtub.'
    ]
  },
  // Titan – moon of Saturn
  {
    name: 'Titan',
    parent: 'Saturn',
    radius: 0.5,
    orbitRadius: 6.0,
    orbitPeriod: 15.9,
    rotationPeriod: 15.9,
    tilt: 0.3,
    texture: 'textures/titan.jpg',
    funFacts: [
      'Titan is the only moon known to have a dense atmosphere.',
      'It has lakes of liquid methane on its surface.'
    ]
  },
  // Uranus
  {
    name: 'Uranus',
    parent: 'Sun',
    radius: 2.0,
    orbitRadius: 100.0,
    orbitPeriod: 30687.0,
    rotationPeriod: -0.72, // retrograde rotation
    tilt: 97.8,
    texture: 'textures/uranus.jpg',
    funFacts: [
      'Uranus rotates on its side, making its seasons extreme.',
      'It was the first planet discovered with a telescope.'
    ]
  },
  // Neptune
  {
    name: 'Neptune',
    parent: 'Sun',
    radius: 1.9,
    orbitRadius: 150.0,
    orbitPeriod: 60190.0,
    rotationPeriod: 0.67,
    tilt: 28.3,
    texture: 'textures/neptune.jpg',
    funFacts: [
      'Neptune has the strongest winds in the solar system.',
      'It was discovered through mathematical prediction before being observed.'
    ]
  },
  // Pluto (dwarf planet)
  {
    name: 'Pluto',
    parent: 'Sun',
    radius: 0.4,
    orbitRadius: 200.0,
    orbitPeriod: 90560.0,
    rotationPeriod: -6.39,
    tilt: 122.5,
    texture: 'textures/pluto.jpg',
    funFacts: [
      'Pluto was reclassified as a dwarf planet in 2006.',
      'It has a heart-shaped glacier on its surface.'
    ]
  },
  // Voyager 1 probe
  {
    name: 'Voyager 1',
    parent: 'Sun',
    radius: 0.3,
    orbitRadius: 250.0,
    orbitPeriod: 365.25, // treat as 1 Earth year for convenience
    rotationPeriod: 0.0,
    tilt: 0.0,
    texture: null,
    funFacts: [
      'Voyager 1 is the farthest human‑made object from Earth.',
      'It carries a golden record containing sounds and images representing life on Earth.'
    ]
  },
  // Voyager 2 probe
  {
    name: 'Voyager 2',
    parent: 'Sun',
    radius: 0.3,
    orbitRadius: 230.0,
    orbitPeriod: 365.25,
    rotationPeriod: 0.0,
    tilt: 0.0,
    texture: null,
    funFacts: [
      'Voyager 2 is the only spacecraft to have visited both Uranus and Neptune.',
      'It is also heading toward interstellar space like its twin, Voyager 1.'
    ]
  }
];