/*
 * Extended data set for the solar system.  This array defines every body that
 * appears in the simulation along with its parent, scaled orbital radius
 * (orbitRadius), orbital period (in Earth days), rotation period (in Earth
 * days; negative values indicate retrograde spin), axial tilt (degrees) and
 * optional texture.  The values have been chosen to roughly preserve the
 * ratios used in the original data while adding a comprehensive set of
 * planets, moons, dwarf planets, probes and a comet.  Fun facts are
 * preserved from the user’s description wherever possible.
 */

export const bodies = [
  // The Sun is the centre of the solar system. It does not orbit another body.
  {
    name: 'Sun',
    parent: null,
    radius: 5.0,
    orbitRadius: 0.0,
    orbitPeriod: 0.0,
    rotationPeriod: 25.0,
    tilt: 7.25,
    texture: 'textures/sun.jpg',
    funFacts: [
      'The Sun accounts for 99.86% of the mass in the solar system.',
      'Its surface is about 5,500°C; its core is over 15 million °C.',
      'A solar flare can release the energy of a billion megatons of TNT.'
    ]
  },
  // Inner planets
  {
    name: 'Mercury',
    parent: 'Sun',
    radius: 1.0,
    orbitRadius: 7.0,
    orbitPeriod: 88.0,
    rotationPeriod: 58.6,
    tilt: 0.03,
    texture: 'textures/mercury.jpg',
    funFacts: [
      'A day on Mercury is longer than its year.',
      'Temperatures swing from 427°C to -173°C.',
      'It has water ice in permanently shadowed craters.'
    ]
  },
  {
    name: 'Venus',
    parent: 'Sun',
    radius: 1.2,
    orbitRadius: 10.0,
    orbitPeriod: 224.7,
    rotationPeriod: -243.0,
    tilt: 177.4,
    texture: 'textures/venus.jpg',
    funFacts: [
      'Venus rotates backwards (retrograde rotation).',
      "It's the hottest planet in the solar system (~465°C).",
      'Atmospheric pressure is over 90 times that of Earth.'
    ]
  },
  {
    name: 'Earth',
    parent: 'Sun',
    radius: 1.3,
    orbitRadius: 13.0,
    orbitPeriod: 365.25,
    rotationPeriod: 1.0,
    tilt: 23.4,
    texture: 'textures/earth.jpg',
    funFacts: [
      'Earth is the only planet not named after a deity.',
      'It is the densest planet in the Solar System.',
      "The Earth's rotation is gradually slowing."
    ]
  },
  // Moon of Earth
  {
    name: 'Moon',
    parent: 'Earth',
    radius: 0.35,
    orbitRadius: 2.5,
    orbitPeriod: 27.3,
    rotationPeriod: 27.3,
    tilt: 5.1,
    texture: 'textures/moon.jpg',
    funFacts: [
      'The Moon is drifting away from Earth by about 3.8 cm per year.',
      'It is the 5th largest moon in the solar system.',
      "The Moon has 'moonquakes' caused by the Earth's gravitational pull."
    ]
  },
  // Mars and its moons
  {
    name: 'Mars',
    parent: 'Sun',
    radius: 0.7,
    orbitRadius: 20.0,
    orbitPeriod: 687.0,
    rotationPeriod: 1.03,
    tilt: 25.2,
    texture: 'textures/mars.jpg',
    funFacts: [
      'Home to Olympus Mons, the largest volcano in the solar system.',
      'Its red color comes from iron oxide (rust).',
      'Has the largest dust storms, which can cover the entire planet.'
    ]
  },
  {
    name: 'Phobos',
    parent: 'Mars',
    radius: 0.05,
    orbitRadius: 1.0,
    orbitPeriod: 0.3,
    rotationPeriod: 0.3,
    tilt: 1.1,
    texture: null,
    funFacts: [
      'Phobos is getting closer to Mars and will either crash into it or break up into a ring in about 50 million years.',
      "It is a 'captured' asteroid, not a naturally formed moon."
    ]
  },
  {
    name: 'Deimos',
    parent: 'Mars',
    radius: 0.03,
    orbitRadius: 1.5,
    orbitPeriod: 1.26,
    rotationPeriod: 1.26,
    tilt: 0.9,
    texture: null,
    funFacts: [
      'Deimos is one of the smallest known moons in the solar system.',
      'It is covered in a thick layer of fine dust, or regolith.'
    ]
  },
  // Jupiter and its major moons
  {
    name: 'Jupiter',
    parent: 'Sun',
    radius: 3.0,
    orbitRadius: 45.0,
    orbitPeriod: 4331.0,
    rotationPeriod: 0.41,
    tilt: 3.1,
    texture: 'textures/jupiter.jpg',
    funFacts: [
      'All other planets could fit inside Jupiter.',
      'The Great Red Spot is a storm raging for hundreds of years.',
      'Has the shortest day of any planet (~10 hours).'
    ]
  },
  {
    name: 'Amalthea',
    parent: 'Jupiter',
    radius: 0.1,
    orbitRadius: 1.5,
    orbitPeriod: 0.5,
    rotationPeriod: 0.5,
    tilt: 0.37,
    texture: null,
    funFacts: [
      'Amalthea is irregularly shaped and reddish, likely from sulfur from Io.',
      'It radiates more heat than it receives from the Sun.'
    ]
  },
  {
    name: 'Io',
    parent: 'Jupiter',
    radius: 0.4,
    orbitRadius: 2.0,
    orbitPeriod: 1.77,
    rotationPeriod: 1.77,
    tilt: 0.05,
    texture: null,
    funFacts: [
      'Io is the most volcanically active body in the solar system, with hundreds of volcanoes.',
      'Its surface is covered in sulfur in various colourful forms.'
    ]
  },
  {
    name: 'Europa',
    parent: 'Jupiter',
    radius: 0.35,
    orbitRadius: 2.5,
    orbitPeriod: 3.55,
    rotationPeriod: 3.55,
    tilt: 0.47,
    texture: 'textures/europa.jpg',
    funFacts: [
      "Europa's icy surface may hide a global saltwater ocean underneath.",
      'Scientists believe this ocean could potentially harbor extraterrestrial life.'
    ]
  },
  {
    name: 'Ganymede',
    parent: 'Jupiter',
    radius: 0.6,
    orbitRadius: 3.5,
    orbitPeriod: 7.15,
    rotationPeriod: 7.15,
    tilt: 0.2,
    texture: null,
    funFacts: [
      'Ganymede is the largest moon in the solar system, bigger than the planet Mercury.',
      'It is the only moon known to have its own magnetic field.'
    ]
  },
  {
    name: 'Callisto',
    parent: 'Jupiter',
    radius: 0.55,
    orbitRadius: 4.5,
    orbitPeriod: 16.69,
    rotationPeriod: 16.69,
    tilt: 0.2,
    texture: null,
    funFacts: [
      'Callisto has the most heavily cratered surface of any object in the solar system.',
      "It is thought to have a 'dead' surface that hasn't changed much in 4 billion years."
    ]
  },
  {
    name: 'Himalia',
    parent: 'Jupiter',
    radius: 0.1,
    orbitRadius: 10.0,
    orbitPeriod: 250.6,
    rotationPeriod: 250.6,
    tilt: 27.5,
    texture: null,
    funFacts: [
      'Himalia is the largest irregular moon of Jupiter.',
      'It may be the remnant of a captured asteroid.'
    ]
  },
  // Saturn and its moons
  {
    name: 'Saturn',
    parent: 'Sun',
    radius: 2.5,
    orbitRadius: 70.0,
    orbitPeriod: 10747.0,
    rotationPeriod: 0.44,
    tilt: 26.7,
    texture: 'textures/saturn.jpg',
    funFacts: [
      'Its rings are made of billions of particles of ice and rock.',
      'Saturn is less dense than water; it would float in a large enough bathtub.',
      'Winds can reach 1,800 km/h.'
    ]
  },
  {
    name: 'Mimas',
    parent: 'Saturn',
    radius: 0.1,
    orbitRadius: 2.0,
    orbitPeriod: 0.9,
    rotationPeriod: 0.9,
    tilt: 1.5,
    texture: null,
    funFacts: [
      'Mimas is famous for its massive impact crater, Herschel, which makes it resemble the Death Star.',
      'The crater is 130 km wide, almost one-third of the moon’s own diameter.'
    ]
  },
  {
    name: 'Enceladus',
    parent: 'Saturn',
    radius: 0.15,
    orbitRadius: 2.2,
    orbitPeriod: 1.4,
    rotationPeriod: 1.4,
    tilt: 0.02,
    texture: null,
    funFacts: [
      'Enceladus has huge geysers at its south pole that spray water ice into space, forming Saturn’s E-ring.',
      'It is one of the most promising places to search for life.'
    ]
  },
  {
    name: 'Tethys',
    parent: 'Saturn',
    radius: 0.17,
    orbitRadius: 2.6,
    orbitPeriod: 1.9,
    rotationPeriod: 1.9,
    tilt: 1.1,
    texture: null,
    funFacts: [
      'Tethys has a gigantic canyon, Ithaca Chasma, that runs three-quarters of the way around the moon.',
      "It's composed almost entirely of water ice."
    ]
  },
  {
    name: 'Dione',
    parent: 'Saturn',
    radius: 0.18,
    orbitRadius: 3.0,
    orbitPeriod: 2.7,
    rotationPeriod: 2.7,
    tilt: 0.02,
    texture: null,
    funFacts: [
      'Dione has bright, wispy ice cliffs on its trailing hemisphere.',
      'It may have a subsurface ocean, much like Enceladus.'
    ]
  },
  {
    name: 'Rhea',
    parent: 'Saturn',
    radius: 0.25,
    orbitRadius: 3.5,
    orbitPeriod: 4.5,
    rotationPeriod: 4.5,
    tilt: 0.3,
    texture: null,
    funFacts: [
      'Rhea is the second-largest moon of Saturn.',
      'Scientists once thought Rhea might have its own faint ring system, a first for a moon.'
    ]
  },
  {
    name: 'Titan',
    parent: 'Saturn',
    radius: 0.5,
    orbitRadius: 6.0,
    orbitPeriod: 15.9,
    rotationPeriod: 15.9,
    tilt: 0.33,
    texture: 'textures/titan.jpg',
    funFacts: [
      'Titan is the only moon with a thick, dense atmosphere.',
      'It has rivers, lakes, and seas of liquid methane and ethane on its surface.'
    ]
  },
  {
    name: 'Hyperion',
    parent: 'Saturn',
    radius: 0.12,
    orbitRadius: 4.0,
    orbitPeriod: 21.3,
    rotationPeriod: 21.3,
    tilt: 0.43,
    texture: null,
    funFacts: [
      'Hyperion is one of the largest irregularly shaped moons.',
      'It tumbles chaotically through its orbit, with no stable rotation axis.'
    ]
  },
  {
    name: 'Iapetus',
    parent: 'Saturn',
    radius: 0.4,
    orbitRadius: 8.0,
    orbitPeriod: 79.3,
    rotationPeriod: 79.3,
    tilt: 15.4,
    texture: null,
    funFacts: [
      "Iapetus is a 'two-faced' moon, with one bright hemisphere and one dark one.",
      'It also has a mysterious, massive equatorial ridge.'
    ]
  },
  {
    name: 'Phoebe',
    parent: 'Saturn',
    radius: 0.15,
    orbitRadius: 12.0,
    orbitPeriod: 550.0,
    rotationPeriod: 9.0,
    tilt: 175.3,
    texture: null,
    funFacts: [
      'Phoebe orbits Saturn in a retrograde (backwards) direction.',
      'It is thought to be a captured Kuiper Belt Object.'
    ]
  },
  // Uranus and its moons
  {
    name: 'Uranus',
    parent: 'Sun',
    radius: 2.0,
    orbitRadius: 100.0,
    orbitPeriod: 30589.0,
    rotationPeriod: -0.72,
    tilt: 97.8,
    texture: 'textures/uranus.jpg',
    funFacts: [
      'Uranus is tilted on its side, likely due to a massive collision in its past.',
      'Its seasons last for over 20 years each.',
      'It is the coldest planet in the solar system.'
    ]
  },
  {
    name: 'Puck',
    parent: 'Uranus',
    radius: 0.08,
    orbitRadius: 1.5,
    orbitPeriod: 0.76,
    rotationPeriod: 0.76,
    tilt: 0.32,
    texture: null,
    funFacts: [
      'Puck was the first inner moon of Uranus to be discovered by Voyager 2.',
      "Its surface is dark and covered with craters."
    ]
  },
  {
    name: 'Miranda',
    parent: 'Uranus',
    radius: 0.12,
    orbitRadius: 1.9,
    orbitPeriod: 1.4,
    rotationPeriod: 1.4,
    tilt: 4.2,
    texture: null,
    funFacts: [
      'Miranda has one of the most bizarre and varied landscapes in the solar system.',
      'It features enormous canyons, terraced layers, and a patchwork of different surfaces.'
    ]
  },
  {
    name: 'Ariel',
    parent: 'Uranus',
    radius: 0.25,
    orbitRadius: 2.5,
    orbitPeriod: 2.5,
    rotationPeriod: 2.5,
    tilt: 0.3,
    texture: null,
    funFacts: [
      'Ariel has the brightest surface of Uranus’s major moons.',
      'Its surface is marked by extensive fault valleys and canyons.'
    ]
  },
  {
    name: 'Umbriel',
    parent: 'Uranus',
    radius: 0.27,
    orbitRadius: 3.0,
    orbitPeriod: 4.1,
    rotationPeriod: 4.1,
    tilt: 0.3,
    texture: null,
    funFacts: [
      'Umbriel is the darkest of Uranus’s large moons.',
      "Its most prominent feature is a bright, mysterious ring on its equator called the 'Wunda crater'."
    ]
  },
  {
    name: 'Titania',
    parent: 'Uranus',
    radius: 0.35,
    orbitRadius: 3.7,
    orbitPeriod: 8.7,
    rotationPeriod: 8.7,
    tilt: 0.1,
    texture: null,
    funFacts: [
      'Titania is the largest moon of Uranus.',
      'It has a network of huge canyons and fault lines, suggesting past geological activity.'
    ]
  },
  {
    name: 'Oberon',
    parent: 'Uranus',
    radius: 0.32,
    orbitRadius: 4.3,
    orbitPeriod: 13.5,
    rotationPeriod: 13.5,
    tilt: 0.1,
    texture: null,
    funFacts: [
      'Oberon is the outermost large moon of Uranus.',
      'Its old, icy surface is heavily cratered and shows little sign of internal activity.'
    ]
  },
  // Neptune and its moons
  {
    name: 'Neptune',
    parent: 'Sun',
    radius: 1.9,
    orbitRadius: 150.0,
    orbitPeriod: 59800.0,
    rotationPeriod: 0.67,
    tilt: 28.3,
    texture: 'textures/neptune.jpg',
    funFacts: [
      'Discovered by mathematical prediction before it was directly observed.',
      'Has the strongest winds in the solar system, reaching 2,100 km/h.',
      'A year on Neptune is almost 165 Earth years.'
    ]
  },
  {
    name: 'Proteus',
    parent: 'Neptune',
    radius: 0.2,
    orbitRadius: 1.5,
    orbitPeriod: 1.1,
    rotationPeriod: 1.1,
    tilt: 0.026,
    texture: null,
    funFacts: [
      'Proteus is one of the darkest objects in the solar system, reflecting only 6% of the light that hits it.',
      'It is irregularly shaped, about as large as a body can be before gravity pulls it into a sphere.'
    ]
  },
  {
    name: 'Triton',
    parent: 'Neptune',
    radius: 0.5,
    orbitRadius: 2.5,
    orbitPeriod: 5.9,
    rotationPeriod: -5.9,
    tilt: 157.0,
    texture: null,
    funFacts: [
      'Triton is the only large moon in the solar system that orbits in the opposite direction of its planet’s rotation (retrograde orbit).',
      'It has geysers that erupt nitrogen frost and is one of the coldest objects in the solar system.'
    ]
  },
  {
    name: 'Nereid',
    parent: 'Neptune',
    radius: 0.15,
    orbitRadius: 8.0,
    orbitPeriod: 360.0,
    rotationPeriod: 360.0,
    tilt: 7.2,
    texture: null,
    funFacts: [
      'Nereid has one of the most eccentric orbits of any moon in the solar system.',
      'Its distance from Neptune varies by a factor of 7.'
    ]
  },
  // Pluto and its moons (dwarf planet)
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
      'Its orbit is so eccentric it’s sometimes closer to the Sun than Neptune.',
      'Features a massive, heart-shaped nitrogen glacier named Tombaugh Regio.',
      'Its largest moon, Charon, is so big they orbit a common point in space outside of Pluto.'
    ]
  },
  {
    name: 'Charon',
    parent: 'Pluto',
    radius: 0.2,
    orbitRadius: 1.5,
    orbitPeriod: 6.4,
    rotationPeriod: 6.4,
    tilt: 0.00,
    texture: null,
    funFacts: [
      'Charon is so large relative to Pluto (about half its diameter) that they are considered a binary system.',
      'It has a reddish north pole, thought to be caused by gases escaping from Pluto’s atmosphere and freezing on Charon’s surface.'
    ]
  },
  {
    name: 'Styx',
    parent: 'Pluto',
    radius: 0.04,
    orbitRadius: 2.0,
    orbitPeriod: 20.2,
    rotationPeriod: 20.2,
    tilt: 0.13,
    texture: null,
    funFacts: [
      'Styx is the innermost of Pluto’s four small moons.',
      'It is named after the mythological river that forms the boundary between Earth and the Underworld.'
    ]
  },
  {
    name: 'Nix',
    parent: 'Pluto',
    radius: 0.06,
    orbitRadius: 2.5,
    orbitPeriod: 24.8,
    rotationPeriod: 24.8,
    tilt: 0.13,
    texture: null,
    funFacts: [
      'Nix and Hydra were discovered in 2005 from Hubble Space Telescope images.',
      'It has a reddish hue, possibly from tholins on its surface.'
    ]
  },
  {
    name: 'Kerberos',
    parent: 'Pluto',
    radius: 0.05,
    orbitRadius: 3.0,
    orbitPeriod: 32.0,
    rotationPeriod: 32.0,
    tilt: 0.29,
    texture: null,
    funFacts: [
      'Kerberos has a double-lobed shape, like a contact binary.',
      'It is named after Cerberus, the three-headed dog that guards the gates of Hades.'
    ]
  },
  {
    name: 'Hydra',
    parent: 'Pluto',
    radius: 0.07,
    orbitRadius: 4.0,
    orbitPeriod: 38.2,
    rotationPeriod: 38.2,
    tilt: 0.24,
    texture: null,
    funFacts: [
      'Hydra is Pluto’s outermost known moon.',
      'It is thought to be covered in nearly pure water ice.'
    ]
  },
  // Additional dwarf planets
  {
    name: 'Ceres',
    parent: 'Sun',
    radius: 0.3,
    orbitRadius: 30.0,
    orbitPeriod: 1682.0,
    rotationPeriod: 0.38,
    tilt: 4.0,
    texture: null,
    funFacts: [
      'The largest object in the asteroid belt.',
      'The bright spots on its surface are salt deposits, likely from an ancient subsurface ocean.',
      'It is the only dwarf planet in the inner solar system.'
    ]
  },
  {
    name: 'Haumea',
    parent: 'Sun',
    radius: 0.35,
    orbitRadius: 220.0,
    orbitPeriod: 103363.0,
    rotationPeriod: 0.17,
    tilt: 0.0,
    texture: null,
    funFacts: [
      'Haumea is one of the fastest rotating large objects in our solar system, spinning once every 4 hours.',
      'Its rapid spin has elongated it into a shape resembling a flattened football.',
      'It has its own ring system.'
    ]
  },
  {
    name: "Hi'iaka",
    parent: 'Haumea',
    radius: 0.05,
    orbitRadius: 3.0,
    orbitPeriod: 49.0,
    rotationPeriod: 49.0,
    tilt: 0.0,
    texture: null,
    funFacts: [
      "Hiʻiaka is the larger of Haumea’s two moons.",
      'It is named after a Hawaiian goddess, one of the daughters of Haumea.'
    ]
  },
  {
    name: 'Namaka',
    parent: 'Haumea',
    radius: 0.04,
    orbitRadius: 4.5,
    orbitPeriod: 18.3,
    rotationPeriod: 18.3,
    tilt: 0.0,
    texture: null,
    funFacts: [
      'Namaka is the smaller and inner moon of Haumea.',
      'It likely formed from the debris of the collision that created the Haumea family.'
    ]
  },
  {
    name: 'Makemake',
    parent: 'Sun',
    radius: 0.35,
    orbitRadius: 230.0,
    orbitPeriod: 112897.0,
    rotationPeriod: 0.5,
    tilt: 0.0,
    texture: null,
    funFacts: [
      "Makemake was discovered shortly after Easter in 2005, earning it the codename 'Easterbunny'.",
      'Its surface is covered with frozen methane, ethane, and nitrogen.',
      'It has a tiny, dark moon nicknamed MK2.'
    ]
  },
  {
    name: 'MK2',
    parent: 'Makemake',
    radius: 0.05,
    orbitRadius: 2.5,
    orbitPeriod: 12.4,
    rotationPeriod: 12.4,
    tilt: 0.0,
    texture: null,
    funFacts: [
      'MK2 is the only known moon of Makemake.',
      'It is extremely dark compared to the bright surface of Makemake.'
    ]
  },
  {
    name: 'Eris',
    parent: 'Sun',
    radius: 0.4,
    orbitRadius: 240.0,
    orbitPeriod: 203830.0,
    rotationPeriod: 1.08,
    tilt: 44.0,
    texture: null,
    funFacts: [
      'The discovery of Eris, a body more massive than Pluto, directly led to the 2006 re-definition of a planet.',
      'It is the most distant dwarf planet from the Sun for most of its orbit.',
      'Its moon is named Dysnomia, the Greek goddess of lawlessness.'
    ]
  },
  {
    name: 'Dysnomia',
    parent: 'Eris',
    radius: 0.05,
    orbitRadius: 2.5,
    orbitPeriod: 16.0,
    rotationPeriod: 16.0,
    tilt: 0.0,
    texture: null,
    funFacts: [
      'Dysnomia is the only known moon of Eris.',
      'It orbits Eris roughly every 16 days.'
    ]
  },
  // Comet
  {
    name: "Halley's Comet",
    parent: 'Sun',
    radius: 0.1,
    orbitRadius: 250.0,
    orbitPeriod: 27740.0,
    rotationPeriod: 7.15,
    tilt: 162.2,
    texture: null,
    funFacts: [
      'The most famous comet, visible from Earth every 75–76 years.',
      'It is a periodic comet and will next appear in mid-2061.',
      'Its tail always points away from the Sun due to solar wind.'
    ]
  },
  // Deep-space probes
  {
    name: 'Voyager 1',
    parent: 'Sun',
    radius: 0.3,
    orbitRadius: 250.0,
    orbitPeriod: 365.25,
    rotationPeriod: 0.0,
    tilt: 12.1,
    texture: null,
    funFacts: [
      'Launched in 1977, it is the most distant human-made object from Earth.',
      'It entered interstellar space in 2012.',
      "Carries a 'Golden Record' with sounds and images of Earth."
    ]
  },
  {
    name: 'Voyager 2',
    parent: 'Sun',
    radius: 0.3,
    orbitRadius: 230.0,
    orbitPeriod: 365.25,
    rotationPeriod: 0.0,
    tilt: -55.5,
    texture: null,
    funFacts: [
      'The only spacecraft to have visited all four gas giants: Jupiter, Saturn, Uranus, and Neptune.',
      'It discovered 11 new moons around Uranus and 6 around Neptune.',
      'Entered interstellar space in 2018.'
    ]
  },
  {
    name: 'Pioneer 10',
    parent: 'Sun',
    radius: 0.3,
    orbitRadius: 240.0,
    orbitPeriod: 365.25,
    rotationPeriod: 0.0,
    tilt: 25.6,
    texture: null,
    funFacts: [
      'The first spacecraft to traverse the asteroid belt and make direct observations of Jupiter.',
      'Its last signal was received in 2003 and it is now silent.',
      'Carries a plaque with a pictorial message from humankind.'
    ]
  },
  {
    name: 'New Horizons',
    parent: 'Sun',
    radius: 0.3,
    orbitRadius: 255.0,
    orbitPeriod: 365.25,
    rotationPeriod: 0.0,
    tilt: -21.4,
    texture: null,
    funFacts: [
      'Performed the first-ever flyby of the Pluto system in 2015.',
      "Visited the Kuiper Belt Object 'Arrokoth' in 2019, the most distant object ever explored up close.",
      'Travels at over 58,000 km/h.'
    ]
  }
];
