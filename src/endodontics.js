export const endoSources = {
  primary: [
    "Primary tooth tissues and development",
    "https://www.ncbi.nlm.nih.gov/books/NBK573074/",
  ],
  anterior: [
    "Anterior pulp-space anatomy",
    "https://www.ncbi.nlm.nih.gov/books/NBK618377/",
  ],
  mb2: [
    "AAE: canal complexity and MB2",
    "https://www.aae.org/specialty/technology-in-endodontics-a-double-edged-sword/",
  ],
  upperPremolar: [
    "Maxillary premolars: CBCT study",
    "https://pmc.ncbi.nlm.nih.gov/articles/PMC6114071/",
  ],
  lowerPremolar: [
    "Mandibular premolars: systematic review",
    "https://pmc.ncbi.nlm.nih.gov/articles/PMC3881342/",
  ],
  lowerMolar: [
    "Mandibular first molars: anatomical study",
    "https://pmc.ncbi.nlm.nih.gov/articles/PMC3263621/",
  ],
  secondMolar: [
    "Mandibular second molars: systematic review",
    "https://pubmed.ncbi.nlm.nih.gov/35282577/",
  ],
  cShape: [
    "C-shaped canal systems: review",
    "https://pubmed.ncbi.nlm.nih.gov/24483229/",
  ],
  standards: [
    "AAE treatment standards: anatomical considerations",
    "https://www.aae.org/specialty/wp-content/uploads/sites/2/2018/04/TreatmentStandards_WhitePaper_v1.pdf",
  ],
};

const upper = [
  {
    canals: "Usually 1",
    roots: ["Single root"],
    map: ["Main"],
    chamber:
      "The coronal pulp space narrows into the root canal. Its size changes with age and dentin deposition.",
    variant:
      "Accessory branches, apical ramifications, and unusual curvatures remain possible.",
    source: "anterior",
  },
  {
    canals: "Usually 1",
    roots: ["Single root"],
    map: ["Main"],
    chamber:
      "Follow the chamber-to-canal transition within a relatively narrow anterior tooth.",
    variant:
      "Do not infer internal curvature or an uncomplicated canal from a small external crown.",
    source: "anterior",
  },
  {
    canals: "Usually 1",
    roots: ["Single root"],
    map: ["Main"],
    chamber:
      "The pulp chamber continues into a long root canal; internal dimensions are not uniform along its course.",
    variant:
      "Canal shape, curvature, and accessory anatomy vary. The apex and canal exit need not coincide.",
    source: "anterior",
  },
  {
    canals: "Commonly 2",
    roots: ["Buccal", "Palatal"],
    map: ["B", "P"],
    chamber:
      "Buccal and palatal canals can be present even within a single external root.",
    variant:
      "One-, two-, and three-canal configurations are reported. Root count alone cannot predict canal count.",
    source: "upperPremolar",
  },
  {
    canals: "Often 1 or 2",
    roots: ["Usually single; division possible"],
    map: ["B", "P"],
    chamber:
      "A canal can remain single, divide, or rejoin; the illustrated two-canal arrangement is one teaching example.",
    variant:
      "Do not interpret one apical canal as proof that the entire canal system is single.",
    source: "upperPremolar",
  },
  {
    canals: "Commonly 3 or 4; anticipate MB2",
    roots: ["Mesiobuccal", "Distobuccal", "Palatal"],
    map: ["MB1", "MB2", "DB", "P"],
    chamber:
      "MB1 and MB2 belong to the mesiobuccal root; DB and P correspond to distobuccal and palatal roots.",
    variant:
      "MB2 is common, not an exceptional finding. Canals may merge and have interconnections.",
    source: "mb2",
  },
  {
    canals: "Commonly 3 or 4",
    roots: ["Mesiobuccal", "Distobuccal", "Palatal"],
    map: ["MB1", "MB2", "DB", "P"],
    chamber:
      "The illustrated arrangement shows two mesiobuccal canals. Actual chamber and root form are variable.",
    variant:
      "Root fusion, communicating canals, and complex configurations may be present.",
    source: "mb2",
  },
  {
    canals: "Highly variable",
    roots: ["Variable; fusion possible"],
    map: [],
    chamber:
      "A single standard chamber or orifice map would misrepresent third-molar variability.",
    variant:
      "Use tooth-specific evidence; this atlas intentionally provides no universal canal map for third molars.",
    source: "standards",
  },
];
const lower = [
  {
    canals: "1 or 2 within a usual single root",
    roots: ["Single root"],
    map: ["B", "L"],
    chamber:
      "A second lingual canal can coexist with a buccal canal in a narrow root. The two may join.",
    variant:
      "The two-canal diagram highlights an important variant, not the configuration of every incisor.",
    source: "mb2",
  },
  {
    canals: "1 or 2 within a usual single root",
    roots: ["Single root"],
    map: ["B", "L"],
    chamber:
      "Consider the buccolingual dimension of the pulp space, including a possible second canal.",
    variant:
      "A single root or a single canal exit does not exclude two canals along part of the root.",
    source: "anterior",
  },
  {
    canals: "Usually 1; 2 possible",
    roots: ["Usually single"],
    map: ["Main"],
    chamber:
      "The chamber narrows into the root; internal branching and additional canals can occur.",
    variant:
      "The illustrated single canal is a teaching baseline, not a guarantee of simple anatomy.",
    source: "anterior",
  },
  {
    canals: "Often 1; division is important",
    roots: ["Usually single"],
    map: ["B", "L"],
    chamber:
      "A canal may divide within the root. A coronal single canal does not establish a single apical pathway.",
    variant:
      "Bifurcation, additional foramina, and C-shaped configurations have been reported.",
    source: "lowerPremolar",
  },
  {
    canals: "Often 1; additional canals possible",
    roots: ["Usually single"],
    map: ["Main"],
    chamber:
      "The illustrated single pathway is a common starting pattern for study.",
    variant:
      "Root and canal complexity varies; additional canals and divisions remain possible.",
    source: "lowerPremolar",
  },
  {
    canals: "Commonly 3 or 4",
    roots: ["Mesial", "Distal"],
    map: ["MB", "ML", "D"],
    chamber:
      "The mesial root commonly contains MB and ML canals; the distal root can contain one or two canals.",
    variant:
      "Isthmuses, apical deltas, and additional roots occur. The map shows a three-canal example.",
    source: "lowerMolar",
  },
  {
    canals: "Commonly 3; other patterns occur",
    roots: ["Mesial", "Distal"],
    map: ["MB", "ML", "D"],
    chamber:
      "The illustrated two-root arrangement has two mesial canals and one distal canal.",
    variant:
      "A C-shaped root canal system is an important alternative, particularly in mandibular second molars.",
    source: "secondMolar",
  },
  {
    canals: "Highly variable",
    roots: ["Variable; fusion possible"],
    map: [],
    chamber:
      "No single root or canal configuration adequately represents mandibular third molars.",
    variant:
      "Patient-specific canal form and neighboring anatomy cannot be derived from this reference.",
    source: "standards",
  },
];

export function endoProfile(tooth) {
  if (tooth.primary)
    return {
      canals:
        tooth.position < 4
          ? "Often one; variants occur"
          : "Variable, with accessory anatomy",
      roots: [tooth.roots],
      map: [],
      chamber:
        "Primary teeth have relatively large pulp spaces and thinner surrounding hard tissues. Physiological root resorption changes the anatomy as exfoliation approaches.",
      variant:
        "Permanent-tooth canal maps must not be applied directly to primary molars. Their developing successors and resorbing roots require separate study.",
      source: "primary",
    };
  return (tooth.upper ? upper : lower)[tooth.position - 1];
}

export const canalPatterns = [
  {
    name: "Type I",
    sequence: "1",
    description: "One canal from chamber to exit.",
    paths: ["M90 25V185"],
  },
  {
    name: "Type II",
    sequence: "2–1",
    description: "Two canals merge into one.",
    paths: ["M65 25V75Q65 100 90 110V185", "M115 25V75Q115 100 90 110"],
  },
  {
    name: "Type III",
    sequence: "1–2–1",
    description: "One canal divides and then rejoins.",
    paths: ["M90 25V55Q50 90 90 145V185", "M90 55Q130 90 90 145"],
  },
  {
    name: "Type IV",
    sequence: "2",
    description: "Two separate canals continue to separate exits.",
    paths: ["M65 25V185", "M115 25V185"],
  },
  {
    name: "Type V",
    sequence: "1–2",
    description: "One canal divides into two separate exits.",
    paths: ["M90 25V95Q65 115 65 140V185", "M90 95Q115 115 115 140V185"],
  },
  {
    name: "Type VI",
    sequence: "2–1–2",
    description: "Two merge, then divide again.",
    paths: [
      "M65 25V50Q65 75 90 85V115Q65 140 65 155V185",
      "M115 25V50Q115 75 90 85M90 115Q115 140 115 155V185",
    ],
  },
  {
    name: "Type VII",
    sequence: "1–2–1–2",
    description: "One divides, rejoins, and divides again.",
    paths: [
      "M90 25V45Q50 70 90 110V125Q65 150 65 165V185",
      "M90 45Q130 70 90 110M90 125Q115 150 115 165V185",
    ],
  },
  {
    name: "Type VIII",
    sequence: "3",
    description: "Three separate canals continue to separate exits.",
    paths: ["M55 25V185", "M90 25V185", "M125 25V185"],
  },
];

export const canalGlossary = [
  [
    "Pulp horns",
    "Coronal extensions of the pulp toward cusp or incisal regions.",
  ],
  [
    "Chamber floor & orifices",
    "In multirooted teeth, canal entrances are related to the chamber floor. A map is an orientation aid, not an access outline.",
  ],
  [
    "Isthmus",
    "A narrow communication between canals; it can be incompletely represented by a simple canal-count classification.",
  ],
  [
    "Lateral / accessory canals",
    "Smaller branches connecting the main pulp space with the external root surface.",
  ],
  [
    "Apical ramifications",
    "Branching near the root end. Multiple exits can occur.",
  ],
  [
    "Apical foramen",
    "An opening of the canal system at the root surface; it need not lie at the anatomical tip.",
  ],
  [
    "C-shaped system",
    "A canal arrangement with a C-like cross-section at some levels. Its configuration can change along the root.",
  ],
];
