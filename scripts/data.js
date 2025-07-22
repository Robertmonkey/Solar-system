// Solar system data definitions.  Each body includes physical parameters used
// for orbital calculations, visual appearance and fun facts for the UI.  Moons
// are defined within the parent planet.  See index.html of the original
// repository for the original source of these numbers.

export const solarBodies = [
    { name: 'Sun', radius: 696340, color: 0xfff000, mass: 1.989e30, funFacts: [
        "The Sun contains more than 99.8% of the mass of the solar system.",
        "Its diameter is about 109 times that of Earth.",
        "The core is over 27 million degrees Fahrenheit while the surface is about 10,000 °F.",
        "It formed around 4.6 billion years ago and will expand into a red giant in roughly five billion years.",
        "Its gravitational pull keeps all planets, asteroids and comets bound in their orbits."
    ] },
    { name: 'Mercury', radius: 2440, color: 0x9f9f9f, a: 57.9, e: 0.205, period: 88, inclination: 7.0, axialTilt: 0.03, lonAscNode: 48.3, argPeri: 29.1, meanAnomalyEpoch: 174.7, mass: 3.3011e23, funFacts: [
        "Mercury is the smallest and closest planet to the Sun.",
        "A single day on Mercury (sunrise to sunrise) lasts 176 Earth days while a year is 88 days.",
        "It is the second‑densest planet after Earth despite its small size.",
        "Mercury has a global magnetic field about one percent as strong as Earth’s.",
        "Temperatures swing from 427 °C in sunlight to –173 °C in darkness, yet water ice exists in permanently shadowed craters at its poles."
    ] },
    { name: 'Venus', radius: 6052, color: 0xdab36d, a: 108.2, e: 0.007, period: 224.7, inclination: 3.4, axialTilt: 177.4, lonAscNode: 76.7, argPeri: 54.9, meanAnomalyEpoch: 50.1, mass: 4.8675e24, funFacts: [
        "A day on Venus (243 Earth days) is longer than its 225‑day year.",
        "It rotates backwards (retrograde) compared to most planets.",
        "It is the hottest planet in the solar system at roughly 465 °C due to a runaway greenhouse effect.",
        "Surface pressure on Venus is more than 90 times Earth’s atmospheric pressure.",
        "Often called Earth’s sister planet because of its similar size and mass."
    ] },
    { name: 'Earth', radius: 6371, color: 0x4f70a3, a: 149.6, e: 0.017, period: 365.2, inclination: 0.0, axialTilt: 23.4, lonAscNode: -11.2, argPeri: 114.2, meanAnomalyEpoch: 358.6, mass: 5.97237e24, funFacts: [
        "Earth is the only planet not named after a mythological deity.",
        "It is the densest planet in the solar system.",
        "Earth’s rotation is gradually slowing by about 17 milliseconds per century.",
        "Roughly 70 percent of its surface is covered by water.",
        "Its magnetic field shields the surface from harmful solar wind and cosmic radiation."
    ], moons: [
        { name: 'Moon', radius: 1737, color: 0xcccccc, a: 0.384, e: 0.055, period: 27.3, inclination: 5.1, lonAscNode: 125.08, argPeri: 318.15, meanAnomalyEpoch: 115.36, mass: 7.342e22, funFacts: [
            "The Moon is drifting away from Earth by about 3.8 cm per year.",
            "It is the 5th largest moon in the solar system.",
            "The Moon has 'moonquakes' caused by the Earth's gravitational pull."
        ] }
    ]},
    { name: 'Mars', radius: 3390, color: 0xc1440e, a: 227.9, e: 0.094, period: 687, inclination: 1.8, axialTilt: 25.2, lonAscNode: 49.6, argPeri: 286.5, meanAnomalyEpoch: 19.4, mass: 6.4171e23, funFacts: [
        "Home to Olympus Mons, the tallest volcano and mountain in the solar system.",
        "Its red colour comes from iron oxide (rust) in the soil and rocks.",
        "Mars has the largest dust storms in the solar system, sometimes covering the entire planet.",
        "The atmosphere is less than one percent as dense as Earth’s and composed mostly of carbon dioxide.",
        "Evidence suggests Mars once had flowing liquid water and perhaps conditions suitable for life."
    ], moons: [
        { name: 'Phobos', radius: 11.2, color: 0x8f8f8f, a: 0.00937, e: 0.015, period: 0.3, inclination: 1.1, mass: 1.0659e16, funFacts: [
            "Phobos is getting closer to Mars and will either crash into it or break up into a ring in about 50 million years.",
            "It is a 'captured' asteroid, not a naturally formed moon."
        ]},
        { name: 'Deimos', radius: 6.2, color: 0xafafaf, a: 0.0234, e: 0.0002, period: 1.26, inclination: 0.9, mass: 1.4762e15, funFacts: [
            "Deimos is one of the smallest known moons in the solar system.",
            "It is covered in a thick layer of fine dust, or regolith."
        ] }
    ]},
    { name: 'Jupiter', radius: 69911, color: 0xc8ab89, a: 778.6, e: 0.049, period: 4331, inclination: 1.3, axialTilt: 3.1, lonAscNode: 100.5, argPeri: 273.8, meanAnomalyEpoch: 20.0, mass: 1.89813e27, funFacts: [
        "Jupiter is the largest planet—more than twice as massive as all the other planets combined.",
        "The Great Red Spot is a colossal storm that has raged for centuries.",
        "It has the shortest day of any planet, rotating once every 10 hours.",
        "Jupiter has at least 79 moons; its largest moon, Ganymede, is bigger than the planet Mercury.",
        "The planet’s magnetic field is the strongest of any planet in the solar system."
    ], moons: [
        { name: 'Io', radius: 1821, color: 0xf3d649, a: 0.421, e: 0.004, period: 1.77, inclination: 0.05, mass: 8.9319e22, funFacts: [
            "Io is the most volcanically active body in the solar system, with hundreds of volcanoes.",
            "Its surface is covered in sulfur in various colorful forms."
        ]},
        { name: 'Europa', radius: 1560, color: 0x8f7f70, a: 0.671, e: 0.009, period: 3.55, inclination: 0.47, mass: 4.7998e22, funFacts: [
            "Europa's icy surface may hide a global saltwater ocean underneath.",
            "Scientists believe this ocean could potentially harbor extraterrestrial life."
        ]},
        { name: 'Ganymede', radius: 2634, color: 0x9e9990, a: 1.070, e: 0.001, period: 7.15, inclination: 0.20, mass: 1.4819e23, funFacts: [
            "Ganymede is the largest moon in the solar system, bigger than the planet Mercury.",
            "It is the only moon known to have its own magnetic field."
        ]},
        { name: 'Callisto', radius: 2410, color: 0x5a5651, a: 1.882, e: 0.007, period: 16.69, inclination: 0.20, mass: 1.0759e23, funFacts: [
            "Callisto has the most heavily cratered surface of any object in the solar system.",
            "It is thought to have a 'dead' surface that hasn't changed much in 4 billion years."
        ]},
        { name: 'Himalia', radius: 85, color: 0x8b8081, a: 11.46, e: 0.16, period: 250.6, inclination: 27.5, mass: 4.2e18, funFacts: [
            "Himalia is the largest irregular moon of Jupiter.",
            "It may be the remnant of a captured asteroid."
        ] }
    ]},
    { name: 'Saturn', radius: 58232, color: 0xe3d9b1, a: 1433.5, e: 0.057, period: 10747, inclination: 2.5, axialTilt: 26.7, lonAscNode: 113.7, argPeri: 339.3, meanAnomalyEpoch: 317.0, mass: 5.6834e26, funFacts: [
        "Saturn’s rings are made of billions of particles of ice and rock and are only about 10 metres thick on average.",
        "The planet is less dense than water and would float in a bathtub large enough to hold it.",
        "Winds on Saturn can reach speeds of around 1,800 kilometres per hour.",
        "A persistent hexagonal storm rages at Saturn’s north pole.",
        "It has more than 145 known moons; Titan, the largest, has a thick nitrogen‑rich atmosphere."
    ], moons: [
        { name: 'Mimas', radius: 198, color: 0xb0b0b0, a: 0.185, e: 0.02, period: 0.9, inclination: 1.5, mass: 3.7493e19, funFacts: [
            "Mimas is famous for its massive impact crater, Herschel, which makes it resemble the Death Star.",
            "The crater is 130 km wide, almost one-third of the moon's own diameter."
        ] },
        { name: 'Enceladus', radius: 252, color: 0xe0e0e0, a: 0.238, e: 0.005, period: 1.4, inclination: 0.02, mass: 1.08022e20, funFacts: [
            "Enceladus has huge geysers at its south pole that spray water ice into space, forming Saturn's E-ring.",
            "It is one of the most promising places to search for life."
        ] },
        { name: 'Tethys', radius: 533, color: 0xd8d8d8, a: 0.294, e: 0.0, period: 1.9, inclination: 1.1, mass: 6.1745e20, funFacts: [
            "Tethys has a gigantic canyon, Ithaca Chasma, that runs three-quarters of the way around the moon.",
            "It's composed almost entirely of water ice."
        ] },
        { name: 'Dione', radius: 561, color: 0xc8c8c8, a: 0.377, e: 0.002, period: 2.7, inclination: 0.02, mass: 1.095452e21, funFacts: [
            "Dione has bright, wispy ice cliffs on its trailing hemisphere.",
            "It may have a subsurface ocean, much like Enceladus."
        ] },
        { name: 'Rhea', radius: 764, color: 0xb8b8b8, a: 0.527, e: 0.001, period: 4.5, inclination: 0.3, mass: 2.306518e21, funFacts: [
            "Rhea is the second-largest moon of Saturn.",
            "Scientists once thought Rhea might have its own faint ring system, a first for a moon."
        ] },
        { name: 'Titan', radius: 2575, color: 0xf5ad6f, a: 1.221, e: 0.029, period: 15.9, inclination: 0.33, mass: 1.3452e23, funFacts: [
            "Titan is the only moon with a thick, dense atmosphere.",
            "It has rivers, lakes, and seas of liquid methane and ethane on its surface."
        ] },
        { name: 'Hyperion', radius: 135, color: 0xa08c78, a: 1.481, e: 0.1, period: 21.3, inclination: 0.43, mass: 5.585e18, funFacts: [
            "Hyperion is one of the largest irregularly shaped moons.",
            "It tumbles chaotically through its orbit, with no stable rotation axis."
        ] },
        { name: 'Iapetus', radius: 735, color: 0x909090, a: 3.560, e: 0.028, period: 79.3, inclination: 15.4, mass: 1.805635e21, funFacts: [
            "Iapetus is a 'two-faced' moon, with one bright hemisphere and one dark one.",
            "It also has a mysterious, massive equatorial ridge."
        ] },
        { name: 'Phoebe', radius: 106.5, color: 0x5a5a5a, a: 12.952, e: 0.159, period: -550, inclination: 175.3, mass: 8.292e18, funFacts: [
            "Phoebe orbits Saturn in a retrograde (backwards) direction.",
            "It is thought to be a captured Kuiper Belt Object."
        ] }
    ]},
    { name: 'Uranus', radius: 25362, color: 0xafdbd3, a: 2872.5, e: 0.046, period: 30589, inclination: 0.8, axialTilt: 97.8, lonAscNode: 74.0, argPeri: 98.9, meanAnomalyEpoch: 142.2, mass: 8.681e25, funFacts: [
        "Uranus is tilted on its side by about 98°, likely the result of a giant impact in its distant past.",
        "Its seasons each last more than 20 Earth years because it takes 84 years to orbit the Sun.",
        "It is the coldest planet in the solar system, with temperatures dropping below −200 °C.",
        "Discovered by William Herschel in 1781, it was the first planet found with a telescope.",
        "It has faint dark rings and moons named after characters from Shakespeare and Alexander Pope."
    ], moons: [
        { name: 'Puck', radius: 81, color: 0x707070, a: 0.086, e: 0.0001, period: 0.76, inclination: 0.32, mass: 2.9e18, funFacts: [
            "Puck was the first inner moon of Uranus to be discovered by Voyager 2.",
            "Its surface is dark and covered with craters."
        ] },
        { name: 'Miranda', radius: 236, color: 0xc0c0c0, a: 0.129, e: 0.001, period: 1.4, inclination: 4.2, mass: 6.59e19, funFacts: [
            "Miranda has one of the most bizarre and varied landscapes in the solar system.",
            "It features enormous canyons, terraced layers, and a patchwork of different surfaces."
        ] },
        { name: 'Ariel', radius: 579, color: 0xd0d0d0, a: 0.191, e: 0.001, period: 2.5, inclination: 0.3, mass: 1.353e21, funFacts: [
            "Ariel has the brightest surface of Uranus's major moons.",
            "Its surface is marked by extensive fault valleys and canyons."
        ] },
        { name: 'Umbriel', radius: 585, color: 0x888888, a: 0.266, e: 0.004, period: 4.1, inclination: 0.3, mass: 1.172e21, funFacts: [
            "Umbriel is the darkest of Uranus's large moons.",
            "Its most prominent feature is a bright, mysterious ring on its equator called the 'Wunda crater'."
        ] },
        { name: 'Titania', radius: 788, color: 0xb0a090, a: 0.436, e: 0.002, period: 8.7, inclination: 0.1, mass: 3.527e21, funFacts: [
            "Titania is the largest moon of Uranus.",
            "It has a network of huge canyons and fault lines, suggesting past geological activity."
        ] },
        { name: 'Oberon', radius: 761, color: 0x908080, a: 0.583, e: 0.001, period: 13.5, inclination: 0.1, mass: 3.014e21, funFacts: [
            "Oberon is the outermost large moon of Uranus.",
            "Its old, icy surface is heavily cratered and shows little sign of internal activity."
        ] }
    ]},
    { name: 'Neptune', radius: 24622, color: 0x3d5a9c, a: 4495.1, e: 0.011, period: 59800, inclination: 1.8, axialTilt: 28.3, lonAscNode: 131.8, argPeri: 276.3, meanAnomalyEpoch: 256.2, mass: 1.02413e26, funFacts: [
        "Neptune was predicted by mathematicians before it was observed through a telescope.",
        "It has the strongest winds in the solar system, topping 2,100 kilometres per hour.",
        "A Neptunian year lasts nearly 165 Earth years.",
        "Neptune radiates more heat than it receives from the Sun.",
        "Its largest moon, Triton, has nitrogen geysers and orbits the planet retrograde to its rotation."
    ], moons: [
        { name: 'Proteus', radius: 210, color: 0x606060, a: 0.117, e: 0.0005, period: 1.1, inclination: 0.026, mass: 5.0e19, funFacts: [
            "Proteus is one of the darkest objects in the solar system, reflecting only 6% of the light that hits it.",
            "It is irregularly shaped, about as large as a body can be before gravity pulls it into a sphere."
        ] },
        { name: 'Triton', radius: 1353, color: 0xced4da, a: 0.354, e: 0.0, period: -5.9, inclination: 157, mass: 2.14e22, funFacts: [
            "Triton is the only large moon in the solar system that orbits in the opposite direction of its planet's rotation (retrograde orbit).",
            "It has geysers that erupt nitrogen frost and is one of the coldest objects in the solar system."
        ] },
        { name: 'Nereid', radius: 170, color: 0xa0a0a0, a: 5.513, e: 0.75, period: 360, inclination: 7.2, mass: 3.1e19, funFacts: [
            "Nereid has one of the most eccentric orbits of any moon in the solar system.",
            "Its distance from Neptune varies by a factor of 7."
        ] }
    ]},
    { name: 'Ceres', type: 'Dwarf Planet', radius: 476, color: 0xaaaaaa, a: 413.7, e: 0.076, period: 1682, inclination: 10.6, axialTilt: 4, lonAscNode: 80.3, argPeri: 73.6, meanAnomalyEpoch: 149.3, mass: 9.39e20, funFacts: [
        "The largest object in the asteroid belt.",
        "The bright spots on its surface are salt deposits, likely from an ancient subsurface ocean.",
        "It is the only dwarf planet in the inner solar system."
    ] },
    { name: 'Pluto', type: 'Dwarf Planet', radius: 1188, color: 0xead9c2, a: 5906.4, e: 0.249, period: 90560, inclination: 17.2, axialTilt: 122.5, lonAscNode: 110.3, argPeri: 113.8, meanAnomalyEpoch: 14.5, mass: 1.303e22, funFacts: [
        "Its orbit is so eccentric it's sometimes closer to the Sun than Neptune.",
        "Features a massive, heart-shaped nitrogen glacier named Tombaugh Regio.",
        "Its largest moon, Charon, is so big they orbit a common point in space outside of Pluto."
    ], moons: [
        { name: 'Charon', radius: 606, color: 0xb5a99d, a: 0.0195, e: 0.0, period: 6.4, inclination: 0.00, mass: 1.586e21, funFacts: [
            "Charon is so large relative to Pluto (about half its diameter) that they are considered a binary system.",
            "It has a reddish north pole, thought to be caused by gases escaping from Pluto's atmosphere and freezing on Charon's surface."
        ] },
        { name: 'Nix', radius: 22, color: 0x909090, a: 0.048, e: 0.002, period: 24.8, inclination: 0.13, mass: 4.5e16, funFacts: [
            "Nix and Hydra were discovered in 2005 from Hubble Space Telescope images.",
            "It has a reddish hue, possibly from tholins on its surface."
        ] },
        { name: 'Hydra', radius: 26, color: 0xa0a0a0, a: 0.064, e: 0.005, period: 38.2, inclination: 0.24, mass: 4.8e16, funFacts: [
            "Hydra is Pluto's outermost known moon.",
            "It is thought to be covered in nearly pure water ice."
        ] }
    ]},
    { name: 'Haumea', type: 'Dwarf Planet', radius: 620, color: 0xd1c7b7, a: 6452, e: 0.195, period: 103363, inclination: 28.2, axialTilt: 0, lonAscNode: 122.1, argPeri: 240.2, meanAnomalyEpoch: 201.7, mass: 4.006e21, funFacts: [
        "Haumea is one of the fastest rotating large objects in our solar system, spinning once every 4 hours.",
        "Its rapid spin has elongated it into a shape resembling a flattened football.",
        "It has its own ring system."
    ] },
    { name: 'Makemake', type: 'Dwarf Planet', radius: 715, color: 0xc18d66, a: 6847, e: 0.156, period: 112897, inclination: 29.0, axialTilt: 0, lonAscNode: 79.4, argPeri: 295.2, meanAnomalyEpoch: 359.8, mass: 3.1e21, funFacts: [
        "Makemake was discovered shortly after Easter in 2005, earning it the codename 'Easterbunny'.",
        "Its surface is covered with frozen methane, ethane, and nitrogen.",
        "It has a tiny, dark moon nicknamed MK2."
    ] },
    { name: 'Eris', type: 'Dwarf Planet', radius: 1163, color: 0xcec8c8, a: 10123, e: 0.436, period: 203830, inclination: 44.0, axialTilt: 0, lonAscNode: 35.9, argPeri: 151.9, meanAnomalyEpoch: 205.9, mass: 1.66e22, funFacts: [
        "The discovery of Eris, a body more massive than Pluto, directly led to the 2006 re-definition of a planet.",
        "It is the most distant dwarf planet from the Sun for most of its orbit.",
        "Its moon is named Dysnomia, the Greek goddess of lawlessness."
    ] },
    { name: "Halley's Comet", type: 'Comet', radius: 5.5, color: 0xffffff, a: 2667, e: 0.967, period: 27740, inclination: 162.2, axialTilt: 0, lonAscNode: 58.4, argPeri: 111.3, meanAnomalyEpoch: 351.4, mass: 2.2e14, funFacts: [
        "The most famous comet, visible from Earth every 75-76 years.",
        "It is a 'periodic' comet and will next appear in mid-2061.",
        "Its tail always points away from the Sun due to solar wind."
    ] }
];

export const probes = [
    { name: 'Voyager 1', distAU: 167.3, declination: 12.1, rightAscension: 267.0, funFacts: [
        "Launched in 1977, it is the most distant human-made object from Earth.",
        "It entered interstellar space in 2012.",
        "Carries a 'Golden Record' with sounds and images of Earth."
    ] },
    { name: 'Voyager 2', distAU: 139.3, declination: -55.5, rightAscension: 299.1, funFacts: [
        "The only spacecraft to have visited all four gas giants: Jupiter, Saturn, Uranus, and Neptune.",
        "It discovered 11 new moons around Uranus and 6 around Neptune.",
        "Entered interstellar space in 2018."
    ] },
    { name: 'Pioneer 10', distAU: 139.0, declination: 25.6, rightAscension: 75.8, funFacts: [
        "The first spacecraft to traverse the asteroid belt and make direct observations of Jupiter.",
        "Its last signal was received in 2003 and it is now silent.",
        "Carries a plaque with a pictorial message from humankind."
    ] },
    { name: 'New Horizons', distAU: 60.5, declination: -21.4, rightAscension: 290.0, funFacts: [
        "Performed the first-ever flyby of the Pluto system in 2015.",
        "Visited the Kuiper Belt Object 'Arrokoth' in 2019, the most distant object ever explored up close.",
        "Travels at over 58,000 km/h."
    ] }
];
