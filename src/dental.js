import { toothNumber } from "./content.js";

export const dentalSources = [
  [
    "Permanent tooth eruption (ADA)",
    "https://www.mouthhealthy.org/-/media/project/ada-organization/ada/mouthhealthy/files/activity-sheets/adapermanentteethdev_eng.pdf",
  ],
  ["Root morphology", "https://www.ncbi.nlm.nih.gov/books/NBK589696/"],
  [
    "Permanent dentition & variation",
    "https://www.ncbi.nlm.nih.gov/books/NBK570590/",
  ],
  [
    "Anterior pulp-space anatomy",
    "https://www.ncbi.nlm.nih.gov/books/NBK618377/",
  ],
  [
    "Tooth tissues & periodontium",
    "https://www.ncbi.nlm.nih.gov/books/NBK279619/",
  ],
  [
    "Posterior crown morphology",
    "https://ecampusontario.pressbooks.pub/oralfacialonline/chapter/tooth-morphology-part-a/",
  ],
  [
    "Anterior crown morphology",
    "https://www.dentalcare.com/en-us/ce-courses/ce500/types-of-teeth-and-their-functions",
  ],
  [
    "Primary dentition anatomy",
    "https://www.ncbi.nlm.nih.gov/books/NBK573074/",
  ],
  [
    "Primary tooth eruption and shedding (ADA)",
    "https://www.ada.org/-/media/project/ada-organization/ada/mouthhealthy/files/activity-sheets/adaprimarytoothdev_eng.pdf",
  ],
];

// Typical patterns are learning references, not measurements of the mesh or patient predictions.
const profiles = {
  upper: [
    [
      "Central incisor",
      "7–8",
      "Usually one",
      "A broad incisal edge cuts food. Identify the labial surface, palatal fossa, marginal ridges, and cervical cingulum.",
    ],
    [
      "Lateral incisor",
      "8–9",
      "Usually one",
      "Smaller than the central incisor, with an incisal edge and palatal cingulum. Compare its more rounded crown outline.",
    ],
    [
      "Canine",
      "11–12",
      "Usually one; long root",
      "A single pointed cusp replaces the incisal edge. Identify cusp slopes, a labial ridge, and the palatal cingulum.",
    ],
    [
      "First premolar",
      "10–11",
      "Often two; one-root variants",
      "Buccal and palatal cusps flank a central groove. A mesial marginal groove is a useful landmark.",
    ],
    [
      "Second premolar",
      "10–12",
      "Usually one",
      "Two cusps are more similar in height; supplemental grooves can diversify the occlusal surface.",
    ],
    [
      "First molar",
      "6–7",
      "Usually three",
      "Four major cusps surround the occlusal table. An oblique ridge links mesiopalatal and distobuccal regions; a Carabelli feature may occur.",
    ],
    [
      "Second molar",
      "12–13",
      "Usually three; fusion possible",
      "The distopalatal cusp may be reduced. Compare its occlusal outline and closer root arrangement with the first molar.",
    ],
    [
      "Third molar",
      "17–21",
      "Highly variable",
      "Crown and root form vary considerably. This tooth has no mesh in the reference.",
    ],
  ],
  lower: [
    [
      "Central incisor",
      "6–7",
      "Usually one",
      "A small, relatively symmetric anterior crown has an incisal edge and subtle lingual anatomy. Compare the paired midline teeth.",
    ],
    [
      "Lateral incisor",
      "7–8",
      "Usually one",
      "Compare its incisal edge and lingual surface with the central incisor. Both share a single-rooted external form.",
    ],
    [
      "Canine",
      "9–10",
      "Usually one; bifurcation possible",
      "A pointed cusp and long root distinguish the canine from adjacent incisors. Compare the lingual contours with the maxillary canine.",
    ],
    [
      "First premolar",
      "10–12",
      "Usually one",
      "A large buccal cusp contrasts with a small lingual cusp. Identify the mesiolingual groove.",
    ],
    [
      "Second premolar",
      "11–12",
      "Usually one",
      "Two- and three-cusp forms occur. Groove patterns can resemble H, U, or Y.",
    ],
    [
      "First molar",
      "6–7",
      "Usually two: mesial and distal",
      "Typically five cusps: mesiobuccal, distobuccal, distal, mesiolingual, and distolingual. Compare the mesial and distal roots.",
    ],
    [
      "Second molar",
      "11–13",
      "Usually two: mesial and distal",
      "Typically four cusps with intersecting grooves. Compare the crown symmetry and root divergence with the first molar.",
    ],
    [
      "Third molar",
      "17–21",
      "Variable; often two",
      "Study its expected position distal to the second molar. No mesh is provided.",
    ],
  ],
};

const primaryNames = [
  "Central incisor",
  "Lateral incisor",
  "Canine",
  "First molar",
  "Second molar",
];
const primaryTiming = {
  upper: [
    ["8–12", "6–7"],
    ["9–13", "7–8"],
    ["16–22", "10–12"],
    ["13–19", "9–11"],
    ["25–33", "10–12"],
  ],
  lower: [
    ["6–10", "6–7"],
    ["10–16", "7–8"],
    ["17–23", "9–12"],
    ["14–18", "9–11"],
    ["23–31", "10–12"],
  ],
};

export function dentalProfile(fdi) {
  const quadrant = Math.floor(fdi / 10),
    position = fdi % 10;
  if (
    !Number.isInteger(fdi) ||
    quadrant < 1 ||
    quadrant > 8 ||
    position < 1 ||
    position > (quadrant > 4 ? 5 : 8)
  )
    return null;
  if (quadrant > 4) {
    const upper = quadrant < 7,
      right = quadrant === 5 || quadrant === 8;
    const name = primaryNames[position - 1];
    const [eruption, shed] =
      primaryTiming[upper ? "upper" : "lower"][position - 1];
    const index =
      quadrant === 5
        ? 5 - position
        : quadrant === 6
          ? 4 + position
          : quadrant === 7
            ? 15 - position
            : 14 + position;
    return {
      fdi,
      quadrant,
      position,
      primary: true,
      upper,
      right,
      name,
      eruption,
      unit: "months",
      shed,
      universal: String.fromCharCode(65 + index),
      roots:
        position < 4 ? "Usually one" : upper ? "Usually three" : "Usually two",
      morphology:
        position < 4
          ? "A smaller anterior crown with a proportionally larger pulp space than its permanent counterpart."
          : "Primary molars have bulbous crowns, relatively thin hard tissues, and divergent roots. Their successors are premolars, not permanent molars.",
      fullName: `Primary ${upper ? "maxillary" : "mandibular"} ${right ? "right" : "left"} ${name.toLowerCase()}`,
    };
  }
  const upper = quadrant < 3,
    right = quadrant === 1 || quadrant === 4;
  const [name, eruption, roots, morphology] =
    profiles[upper ? "upper" : "lower"][position - 1];
  const universal =
    quadrant === 1
      ? 9 - position
      : quadrant === 2
        ? 8 + position
        : quadrant === 3
          ? 25 - position
          : 24 + position;
  return {
    fdi,
    universal,
    name,
    eruption,
    roots,
    morphology,
    quadrant,
    position,
    upper,
    right,
    primary: false,
    unit: "years",
    fullName: `${upper ? "Maxillary" : "Mandibular"} ${right ? "right" : "left"} ${name.toLowerCase()}`,
  };
}

export function partForTooth(parts, fdi) {
  return parts.find((p) => toothNumber(p.name) === fdi);
}

export const dentalSections = {
  tissues: [
    [
      "Enamel",
      "The mineralized covering of the anatomical crown. It protects the underlying dentin.",
    ],
    [
      "Dentin",
      "Forms most of the tooth and surrounds the pulp. Dentinal tubules connect its outer regions with the pulp interface.",
    ],
    [
      "Pulp",
      "Vascular, innervated soft tissue within the chamber and root canal system.",
    ],
    [
      "Cementum & periodontal ligament",
      "Cementum covers the root. The periodontal ligament links the root to surrounding alveolar bone.",
    ],
    [
      "Cervical region",
      "The cementoenamel junction marks the boundary of anatomical crown and root.",
    ],
  ],
  surfaces: [
    ["Mesial / distal", "Toward / away from the midline of the dental arch."],
    ["Labial / buccal", "Facing the lips / facing the cheek."],
    ["Palatal / lingual", "Facing the palate in the upper arch / the tongue."],
    [
      "Incisal / occlusal",
      "The cutting edge of anterior teeth / the chewing surface of posterior teeth.",
    ],
  ],
};

export function specialtyNotes(tooth) {
  return [
    [
      "Restorative dentistry",
      `Study the ${tooth.position < 4 ? "incisal or cusp outline and proximal contours" : "occlusal relief and proximal contours"}. Compare the opposite-side tooth. Consider which features a restoration would need to reproduce.`,
    ],
    [
      "Endodontics",
      `${tooth.upper && tooth.position < 4 ? "Anterior pulp spaces can be simple or branched." : "Root count and canal count are not interchangeable."} Review internal-anatomy references alongside the external root form. The mesh contains no segmented canals or pulp chamber.`,
    ],
    [
      "Orthodontics",
      `Locate this tooth in its quadrant and compare its position with its neighbors. The typical eruption window is ${tooth.eruption} ${tooth.unit}; individual timing varies. Static alignment here does not establish an occlusal diagnosis.`,
    ],
    [
      "Oral surgery",
      `${tooth.upper && tooth.position > 3 ? "Review the relationship of posterior maxillary roots to the maxillary sinus." : !tooth.upper && tooth.position > 3 ? "Review mandibular canal relationships when studying posterior teeth." : "Inspect the root length, contour, and curvature from multiple views."} Surface geometry alone cannot establish patient-specific surgical relationships.`,
    ],
    [
      "Periodontics",
      "Identify the cervical region and root surfaces. Compare single-rooted and multirooted forms; periodontal attachment and pocket depth are not represented.",
    ],
  ];
}
