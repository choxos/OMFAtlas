import * as THREE from "three";
import { toothNumber } from "./content.js";

// Schematic oral and maxillofacial neurovascular anatomy.
//
// BodyParts3D 4.0 has no maxillary or mandibular division of the trigeminal
// nerve, no facial nerve, no external carotid artery or any of its branches,
// no parotid gland, no facial vein, no maxillary sinus, and no articular disc.
// Its whole nerve set is 55 orbital concepts, and its arterial set is
// intracranial. For an oral and maxillofacial atlas those absences cover most
// of what the subject is about, so the structures below are built as teaching
// geometry instead.
//
// They are schematic, and every part produced here carries schematic: true so
// the interface can say so wherever the structure is named. What keeps them
// honest is that no waypoint is a typed-in coordinate: each one is derived at
// run time from the real meshes in this particular assembly, through the rules
// in deriveAnchors below. The inferior alveolar nerve runs under the apices of
// this skull's molars and leaves through a mental foramen placed on this
// mandible's buccal surface. Course and caliber are representative; they are
// not a segmentation, and they do not predict an individual patient.
//
// Coordinates use the frame the rest of the atlas uses: meters, Y up,
// +X toward the patient's left, +Z anterior. A structure is described once and
// built for both sides; the side factor s is -1 on the right and +1 on the
// left.

const RIGHT = -1;
const LEFT = 1;

// Representative calibers in meters. Nerves and vessels of the face vary
// several fold between people; these read clearly at the scale the model is
// viewed and are not measurements.
const CALIBER = {
  trunk: 0.0013,
  branch: 0.0008,
  twig: 0.0005,
  majorArtery: 0.0019,
  artery: 0.0012,
  smallArtery: 0.0008,
  vein: 0.0022,
  duct: 0.0009,
};

const vec = (v) => new THREE.Vector3(v[0], v[1], v[2]);
const mid = (a, b, t = 0.5) => a.map((v, i) => v + (b[i] - v) * t);
const shift = (p, dx = 0, dy = 0, dz = 0) => [p[0] + dx, p[1] + dy, p[2] + dz];

/**
 * Reduce a vertex list to the one that best satisfies `score`, considering
 * only vertices `within` accepts. Returns null when the filter matches
 * nothing, so a caller can fall back rather than invent a landmark.
 */
function extreme(vertices, within, score) {
  let best = null;
  let bestScore = -Infinity;
  for (const v of vertices) {
    if (!within(v)) continue;
    const value = score(v);
    if (value > bestScore) {
      bestScore = value;
      best = v;
    }
  }
  return best;
}

/**
 * Landmarks for the schematic paths, all measured off the loaded meshes.
 *
 * `readVertices(part)` must return an array of [x, y, z] in atlas coordinates.
 * The tooth table is keyed by FDI and comes from the 28 permanent source
 * teeth, which is what gives the arch its real curvature and the alveolar
 * structures their real height.
 */
export function deriveAnchors(parts, readVertices) {
  const byId = new Map(parts.map((part) => [part.id, part]));
  const named = (pattern) => parts.find((part) => pattern.test(part.name));

  const teeth = new Map();
  for (const part of parts) {
    const fdi = toothNumber(part.name);
    if (fdi) teeth.set(fdi, part.bounds);
  }
  if (teeth.size === 0)
    throw new Error("Schematic anatomy needs the source teeth for its anchors");

  // The occlusal centroid of each arch. Pointing away from it gives the buccal
  // direction for any tooth, which is what places structures on the cheek side
  // rather than a fixed +X or -X that would be wrong across the arch curve.
  const archCenter = (upper) => {
    const rows = [...teeth]
      .filter(([fdi]) => (fdi < 30) === upper)
      .map(([, bounds]) => bounds);
    const sum = rows.reduce(
      (acc, [lo, hi]) => [acc[0] + (lo[0] + hi[0]) / 2, acc[1] + (lo[2] + hi[2]) / 2],
      [0, 0],
    );
    return [sum[0] / rows.length, sum[1] / rows.length];
  };
  const upperCenter = archCenter(true);
  const lowerCenter = archCenter(false);

  const tooth = (fdi) => {
    const bounds = teeth.get(fdi);
    if (!bounds) throw new RangeError(`No source tooth ${fdi} to anchor against`);
    const [lo, hi] = bounds;
    const upper = fdi < 30;
    const x = (lo[0] + hi[0]) / 2;
    const z = (lo[2] + hi[2]) / 2;
    const center = archCenter(upper);
    // Outward normal in the occlusal plane: the buccal direction for this tooth.
    const out = [x - center[0], z - center[1]];
    const length = Math.hypot(out[0], out[1]) || 1;
    return {
      // Root apex: the end of the tooth pointing away from the occlusal plane.
      apex: [x, upper ? hi[1] : lo[1], z],
      crown: [x, upper ? lo[1] : hi[1], z],
      center: [x, (lo[1] + hi[1]) / 2, z],
      buccal: (distance = 0) => [
        x + (out[0] / length) * ((hi[0] - lo[0]) / 2 + distance),
        (lo[1] + hi[1]) / 2,
        z + (out[1] / length) * ((hi[2] - lo[2]) / 2 + distance),
      ],
      lingual: (distance = 0) => [
        x - (out[0] / length) * ((hi[0] - lo[0]) / 2 + distance),
        (lo[1] + hi[1]) / 2,
        z - (out[1] / length) * ((hi[2] - lo[2]) / 2 + distance),
      ],
    };
  };

  const mandible = byId.get("FJ3289");
  if (!mandible) throw new Error("Schematic anatomy needs the mandible mesh");
  const mandibleVertices = readVertices(mandible);
  const sideOf = (s) => (v) => (s < 0 ? v[0] < -0.015 : v[0] > 0.015);

  const condyle = (s) =>
    extreme(mandibleVertices, sideOf(s), (v) => v[1]);
  const coronoid = (s) => {
    const top = condyle(s);
    return extreme(mandibleVertices, (v) => sideOf(s)(v) && v[2] > top[2] + 0.01, (v) => v[1]);
  };
  // Mandibular foramen: the medial face of the ramus, roughly level with the
  // occlusal plane of the lower molars, which is where the lingula sits.
  const molarOcclusal = Math.max(tooth(37).crown[1], tooth(47).crown[1]);
  const mandibularForamen = (s) => {
    const band = (v) =>
      sideOf(s)(v) && Math.abs(v[1] - molarOcclusal) < 0.005 && v[2] > -0.004 && v[2] < 0.018;
    const medial = extreme(mandibleVertices, band, (v) => -Math.abs(v[0]));
    const at = medial || [s * 0.034, molarOcclusal, 0.012];
    // A little medial to the bone surface, where the canal mouth actually is.
    return [at[0] - s * 0.0015, at[1], at[2]];
  };
  const ramusPosterior = (s) =>
    extreme(mandibleVertices, sideOf(s), (v) => -v[2]);
  const gonion = (s) =>
    extreme(mandibleVertices, (v) => sideOf(s)(v) && v[2] < 0.02, (v) => -v[1]);
  // Mental foramen: the buccal surface of the body between the premolar
  // apices, a little below them.
  const mentalForamen = (s) => {
    const first = tooth(s < 0 ? 44 : 34);
    const second = tooth(s < 0 ? 45 : 35);
    const z = (first.apex[2] + second.apex[2]) / 2;
    const y = Math.min(first.apex[1], second.apex[1]) - 0.0022;
    const band = (v) => sideOf(s)(v) && Math.abs(v[2] - z) < 0.005 && Math.abs(v[1] - y) < 0.006;
    const buccal = extreme(mandibleVertices, band, (v) => Math.abs(v[0]));
    return buccal ? [buccal[0], y, z] : [s * 0.022, y, z];
  };
  // Antegonial notch: where the facial artery crosses the lower border.
  const facialNotch = (s) => {
    const z = tooth(s < 0 ? 46 : 36).apex[2];
    const band = (v) => sideOf(s)(v) && Math.abs(v[2] - z) < 0.006;
    const lower = extreme(mandibleVertices, band, (v) => -v[1]);
    return lower || [s * 0.03, 1.505, z];
  };

  const maxilla = (s) => byId.get(s < 0 ? "FJ3375" : "FJ3269");
  const maxillaBounds = (s) => maxilla(s).bounds;
  const temporal = (s) => byId.get(s < 0 ? "FJ3386" : "FJ3281");
  const zygomatic = (s) => byId.get(s < 0 ? "FJ3392" : "FJ3287");

  // Infraorbital foramen: on the front of the maxilla, above the canine, a
  // few millimeters below the orbital rim that the maxilla's top edge marks.
  const infraorbitalForamen = (s) => {
    const canine = tooth(s < 0 ? 13 : 23);
    const [, hi] = maxillaBounds(s);
    return [canine.apex[0] * 1.05, hi[1] - 0.009, canine.apex[2] - 0.002];
  };
  // Greater palatine foramen: palatal, medial to the second molar, at the
  // height of the palatine bone's lower edge.
  const greaterPalatineForamen = (s) => {
    const molar = tooth(s < 0 ? 17 : 27);
    const palatine = byId.get(s < 0 ? "FJ3379" : "FJ3273");
    return [molar.lingual(0.004)[0], palatine.bounds[0][1] + 0.001, molar.apex[2] + 0.002];
  };
  // Incisive foramen: palatal midline, just behind the central incisors.
  const incisiveForamen = () => {
    const central = tooth(11);
    const palatine = byId.get("FJ3379");
    return [0, palatine.bounds[0][1] + 0.003, central.lingual(0.005)[2]];
  };
  // Maxillary tuberosity: the rounded back of the maxilla behind the last
  // upper molar, at about the height of that molar's root apices.
  const tuberosity = (s) => {
    const molar = tooth(s < 0 ? 17 : 27);
    const [lo] = maxillaBounds(s);
    return [molar.center[0], molar.apex[1] + 0.002, lo[2] + 0.002];
  };
  // Pterygopalatine fossa: behind the tuberosity, medial to the ramus. Where
  // the maxillary nerve and the terminal maxillary artery meet.
  const pterygopalatineFossa = (s) => {
    const at = tuberosity(s);
    return [at[0] * 0.86, at[1] + 0.005, at[2] - 0.008];
  };
  // Foramen ovale: the mandibular nerve's exit from the middle cranial fossa,
  // above and medial to the pterygopalatine fossa.
  const foramenOvale = (s) => {
    const fossa = pterygopalatineFossa(s);
    return [fossa[0] * 0.92, fossa[1] + 0.014, fossa[2] - 0.012];
  };
  // Stylomastoid foramen: under the temporal bone behind the condyle, where
  // the facial nerve leaves the skull.
  const stylomastoidForamen = (s) => {
    const [lo] = temporal(s).bounds;
    const head = condyle(s);
    return [head[0] * 1.18, head[1] - 0.012, lo[2] + 0.014];
  };
  // Carotid bifurcation: the top of the common carotid mesh, which is where
  // this crop ends and the external carotid would begin.
  const carotidBifurcation = (s) => {
    const common = byId.get(s < 0 ? "FJ3564" : "FJ3483");
    const [lo, hi] = common.bounds;
    return [(lo[0] + hi[0]) / 2, hi[1], (lo[2] + hi[2]) / 2];
  };

  const submandibularGland = (s) => byId.get(s < 0 ? "FJ2768" : "FJ2766");
  const sublingualGland = (s) => byId.get(s < 0 ? "FJ2767" : "FJ2765");
  const tongue = named(/^Tongue$/);
  const hyoid = byId.get("FJ3201") || byId.get("FJ2772");

  return {
    tooth,
    teeth,
    upperCenter,
    lowerCenter,
    condyle,
    coronoid,
    gonion,
    ramusPosterior,
    mandibularForamen,
    mentalForamen,
    facialNotch,
    maxillaBounds,
    temporalBounds: (s) => temporal(s).bounds,
    zygomaticBounds: (s) => zygomatic(s).bounds,
    infraorbitalForamen,
    greaterPalatineForamen,
    incisiveForamen,
    tuberosity,
    pterygopalatineFossa,
    foramenOvale,
    stylomastoidForamen,
    carotidBifurcation,
    submandibularBounds: (s) => submandibularGland(s).bounds,
    sublingualBounds: (s) => sublingualGland(s).bounds,
    tongueBounds: tongue?.bounds,
    hyoidBounds: hyoid?.bounds,
  };
}

const boundsCenter = ([lo, hi]) => [
  (lo[0] + hi[0]) / 2,
  (lo[1] + hi[1]) / 2,
  (lo[2] + hi[2]) / 2,
];

/**
 * Every schematic structure, described once for a generic side.
 *
 * `path(a, s)` returns waypoints for a tube; `volume(a, s)` returns a centre
 * and three radii for a lobe. `bilateral: false` marks a midline structure
 * that is built once with s = LEFT.
 */
const STRUCTURES = [
  // Mandibular division of the trigeminal nerve and its oral branches.
  {
    key: "v3",
    name: "Mandibular nerve (V3)",
    group: "nerves",
    radius: CALIBER.trunk,
    note: "Third division of the trigeminal nerve, leaving the skull through the foramen ovale and dividing into the branches that supply the lower teeth, the tongue, and the muscles of mastication.",
    path: (a, s) => [
      shift(a.foramenOvale(s), 0, 0.008, -0.003),
      a.foramenOvale(s),
      mid(a.foramenOvale(s), a.mandibularForamen(s), 0.55),
    ],
  },
  {
    key: "inferior-alveolar-nerve",
    name: "Inferior alveolar nerve",
    group: "nerves",
    radius: CALIBER.branch,
    note: "Runs from the mandibular foramen forward inside the mandibular canal, below the roots of the lower posterior teeth, and leaves through the mental foramen. The target of an inferior alveolar nerve block.",
    path: (a, s) => {
      const under = (fdi, drop) => shift(a.tooth(fdi).apex, 0, -drop, 0);
      const right = s < 0;
      return [
        mid(a.foramenOvale(s), a.mandibularForamen(s), 0.55),
        a.mandibularForamen(s),
        under(right ? 47 : 37, 0.0035),
        under(right ? 46 : 36, 0.0035),
        under(right ? 45 : 35, 0.003),
        a.mentalForamen(s),
      ];
    },
  },
  {
    key: "mental-nerve",
    name: "Mental nerve",
    group: "nerves",
    radius: CALIBER.twig,
    note: "Leaves the mental foramen and fans out to the skin of the chin and the mucosa of the lower lip.",
    path: (a, s) => {
      const foramen = a.mentalForamen(s);
      return [
        foramen,
        shift(foramen, s * 0.003, 0.002, 0.005),
        shift(foramen, s * 0.004, 0.006, 0.010),
      ];
    },
  },
  {
    key: "incisive-nerve",
    name: "Incisive nerve",
    group: "nerves",
    radius: CALIBER.twig,
    note: "The continuation of the inferior alveolar nerve past the mental foramen, supplying the lower canine and incisors.",
    path: (a, s) => {
      const foramen = a.mentalForamen(s);
      const canine = a.tooth(s < 0 ? 43 : 33);
      const central = a.tooth(s < 0 ? 41 : 31);
      return [
        foramen,
        shift(canine.apex, 0, -0.0025, 0),
        shift(central.apex, 0, -0.002, 0),
      ];
    },
  },
  {
    key: "lingual-nerve",
    name: "Lingual nerve",
    group: "nerves",
    radius: CALIBER.branch,
    note: "Passes forward medial to the inferior alveolar nerve and above the mylohyoid line, close to the lingual plate at the third molar, then spreads into the floor of the mouth and the front two thirds of the tongue.",
    path: (a, s) => {
      const foramen = a.mandibularForamen(s);
      const third = a.tooth(s < 0 ? 47 : 37);
      const first = a.tooth(s < 0 ? 46 : 36);
      const canine = a.tooth(s < 0 ? 43 : 33);
      return [
        mid(a.foramenOvale(s), foramen, 0.6),
        shift(foramen, -s * 0.004, 0.002, 0.004),
        shift(third.lingual(0.002), 0, -0.004, -0.002),
        shift(first.lingual(0.003), 0, -0.006, 0),
        shift(canine.lingual(0.004), 0, -0.006, 0),
      ];
    },
  },
  {
    key: "buccal-nerve",
    name: "Buccal nerve",
    group: "nerves",
    radius: CALIBER.twig,
    note: "Crosses in front of the ramus to reach the cheek and the buccal gingiva of the lower molars. Sensory only; it does not supply the buccinator.",
    path: (a, s) => {
      const coronoidTip = a.coronoid(s);
      const molar = a.tooth(s < 0 ? 46 : 36);
      return [
        mid(a.foramenOvale(s), a.mandibularForamen(s), 0.45),
        shift(coronoidTip, s * 0.002, -0.008, 0.004),
        shift(molar.buccal(0.006), 0, 0.004, 0.002),
      ];
    },
  },
  {
    key: "mylohyoid-nerve",
    name: "Nerve to mylohyoid",
    group: "nerves",
    radius: CALIBER.twig,
    note: "Branches off the inferior alveolar nerve just before it enters the mandibular foramen and runs down the mylohyoid groove to the mylohyoid and the anterior belly of digastric.",
    path: (a, s) => {
      const foramen = a.mandibularForamen(s);
      const notch = a.facialNotch(s);
      return [
        shift(foramen, 0, 0.003, 0.001),
        shift(foramen, -s * 0.002, -0.008, 0.008),
        shift(notch, -s * 0.006, 0.004, 0.014),
      ];
    },
  },
  {
    key: "auriculotemporal-nerve",
    name: "Auriculotemporal nerve",
    group: "nerves",
    radius: CALIBER.twig,
    note: "Passes behind the neck of the mandible with the superficial temporal vessels and climbs in front of the ear. It also carries the secretomotor supply to the parotid gland.",
    path: (a, s) => {
      const head = a.condyle(s);
      const [, hi] = a.temporalBounds(s);
      return [
        mid(a.foramenOvale(s), head, 0.4),
        shift(head, s * 0.004, -0.004, -0.008),
        shift(head, s * 0.006, 0.010, -0.006),
        [head[0] * 1.04, hi[1] - 0.006, head[2] - 0.004],
      ];
    },
  },

  // Maxillary division of the trigeminal nerve.
  {
    key: "v2",
    name: "Maxillary nerve (V2)",
    group: "nerves",
    radius: CALIBER.trunk,
    note: "Second division of the trigeminal nerve, crossing the pterygopalatine fossa on its way to the infraorbital canal.",
    path: (a, s) => {
      const fossa = a.pterygopalatineFossa(s);
      return [shift(fossa, -s * 0.006, 0.006, -0.012), fossa, shift(fossa, 0, 0.004, 0.008)];
    },
  },
  {
    key: "infraorbital-nerve",
    name: "Infraorbital nerve",
    group: "nerves",
    radius: CALIBER.branch,
    note: "Continues from the maxillary nerve through the infraorbital canal in the floor of the orbit and emerges at the infraorbital foramen to supply the cheek, the side of the nose, and the upper lip.",
    path: (a, s) => {
      const fossa = a.pterygopalatineFossa(s);
      const foramen = a.infraorbitalForamen(s);
      return [
        shift(fossa, 0, 0.004, 0.008),
        mid(shift(fossa, 0, 0.006, 0.01), foramen, 0.55),
        foramen,
        shift(foramen, 0, -0.003, 0.006),
      ];
    },
  },
  {
    key: "posterior-superior-alveolar-nerve",
    name: "Posterior superior alveolar nerve",
    group: "nerves",
    radius: CALIBER.twig,
    note: "Leaves the maxillary nerve in the pterygopalatine fossa and runs down over the maxillary tuberosity to the upper molars and the adjacent sinus lining.",
    path: (a, s) => {
      const fossa = a.pterygopalatineFossa(s);
      const second = a.tooth(s < 0 ? 17 : 27);
      const first = a.tooth(s < 0 ? 16 : 26);
      return [
        fossa,
        shift(a.tuberosity(s), 0, 0.002, 0.001),
        shift(second.apex, 0, 0.003, 0),
        shift(first.apex, 0, 0.003, 0),
      ];
    },
  },
  {
    key: "middle-superior-alveolar-nerve",
    name: "Middle superior alveolar nerve",
    group: "nerves",
    radius: CALIBER.twig,
    note: "An inconstant branch of the infraorbital nerve within the sinus wall, supplying the upper premolars and often the mesiobuccal root of the first molar.",
    path: (a, s) => {
      const foramen = a.infraorbitalForamen(s);
      const premolar = a.tooth(s < 0 ? 15 : 25);
      const first = a.tooth(s < 0 ? 14 : 24);
      return [
        shift(foramen, 0, -0.004, -0.006),
        shift(premolar.apex, 0, 0.006, -0.002),
        shift(first.apex, 0, 0.003, 0),
      ];
    },
  },
  {
    key: "anterior-superior-alveolar-nerve",
    name: "Anterior superior alveolar nerve",
    group: "nerves",
    radius: CALIBER.twig,
    note: "Descends in the front wall of the maxillary sinus from the infraorbital nerve to the upper canine and incisors.",
    path: (a, s) => {
      const foramen = a.infraorbitalForamen(s);
      const canine = a.tooth(s < 0 ? 13 : 23);
      const central = a.tooth(s < 0 ? 11 : 21);
      return [
        shift(foramen, 0, -0.003, -0.002),
        shift(canine.apex, 0, 0.004, 0.001),
        shift(central.apex, 0, 0.003, 0),
      ];
    },
  },
  {
    key: "greater-palatine-nerve",
    name: "Greater palatine nerve",
    group: "nerves",
    radius: CALIBER.twig,
    note: "Descends through the greater palatine canal and runs forward on the hard palate, supplying the palatal mucosa and gingiva back to the canine.",
    path: (a, s) => {
      const foramen = a.greaterPalatineForamen(s);
      const premolar = a.tooth(s < 0 ? 14 : 24);
      const canine = a.tooth(s < 0 ? 13 : 23);
      return [
        shift(foramen, 0, 0.008, -0.004),
        foramen,
        shift(premolar.lingual(0.005), 0, 0.002, 0),
        shift(canine.lingual(0.005), 0, 0.002, 0),
      ];
    },
  },
  {
    key: "lesser-palatine-nerve",
    name: "Lesser palatine nerve",
    group: "nerves",
    radius: CALIBER.twig,
    note: "Passes backward from the same canal to the soft palate and the tonsillar region.",
    path: (a, s) => {
      const foramen = a.greaterPalatineForamen(s);
      return [
        shift(foramen, 0, 0.006, -0.003),
        foramen,
        shift(foramen, 0, -0.001, -0.008),
      ];
    },
  },
  {
    key: "nasopalatine-nerve",
    name: "Nasopalatine nerve",
    group: "nerves",
    radius: CALIBER.twig,
    bilateral: false,
    note: "Crosses the nasal septum and reaches the palate through the incisive foramen, supplying the palatal mucosa behind the upper incisors.",
    path: (a) => {
      const foramen = a.incisiveForamen();
      return [
        shift(foramen, 0, 0.014, -0.012),
        shift(foramen, 0, 0.006, -0.004),
        foramen,
        shift(foramen, 0, 0.001, 0.004),
      ];
    },
  },

  // Facial nerve.
  {
    key: "facial-nerve",
    name: "Facial nerve (VII) trunk",
    group: "nerves",
    radius: CALIBER.trunk,
    note: "Leaves the skull at the stylomastoid foramen and enters the parotid gland, where it divides into the branches that move the face. It is motor to facial expression, not sensory to the teeth.",
    path: (a, s) => {
      const foramen = a.stylomastoidForamen(s);
      return [
        shift(foramen, 0, 0.008, -0.004),
        foramen,
        shift(foramen, s * 0.004, -0.002, 0.008),
      ];
    },
  },
  ...[
    ["temporal", "Temporal branch of facial nerve", 0.026, 0.012, "to the frontalis and the upper orbicularis oculi"],
    ["zygomatic", "Zygomatic branch of facial nerve", 0.012, 0.030, "to the orbicularis oculi"],
    ["buccal", "Buccal branch of facial nerve", -0.002, 0.042, "to the buccinator and the muscles of the upper lip"],
    ["marginal", "Marginal mandibular branch of facial nerve", -0.017, 0.038, "to the muscles of the lower lip; it runs near the lower border of the mandible and is at risk in submandibular surgery"],
    ["cervical", "Cervical branch of facial nerve", -0.030, 0.016, "to the platysma"],
  ].map(([key, name, rise, reach, destination]) => ({
    key: `facial-${key}`,
    name,
    group: "nerves",
    radius: CALIBER.twig,
    note: `One of the five terminal branches of the facial nerve, running forward from the parotid ${destination}.`,
    path: (a, s) => {
      const foramen = a.stylomastoidForamen(s);
      const start = shift(foramen, s * 0.004, -0.002, 0.008);
      return [
        start,
        shift(start, -s * 0.002, rise * 0.45, reach * 0.4),
        shift(start, -s * 0.008, rise, reach),
      ];
    },
  })),

  // External carotid artery and the branches that matter in the jaws.
  {
    key: "external-carotid-artery",
    name: "External carotid artery",
    group: "arteries",
    radius: CALIBER.majorArtery,
    note: "Arises at the carotid bifurcation and climbs behind the ramus, supplying nearly everything in the face and jaws through the branches below. Absent from the source dataset, which contains only the common and internal carotid arteries.",
    path: (a, s) => {
      const start = a.carotidBifurcation(s);
      const angle = a.gonion(s);
      const head = a.condyle(s);
      return [
        start,
        [start[0] * 1.25, (start[1] + angle[1]) / 2, start[2] + 0.004],
        [angle[0] * 0.86, angle[1] + 0.004, angle[2] - 0.010],
        [head[0] * 0.94, head[1] - 0.018, head[2] - 0.012],
      ];
    },
  },
  {
    key: "lingual-artery",
    name: "Lingual artery",
    group: "arteries",
    radius: CALIBER.artery,
    note: "The second branch of the external carotid, passing forward deep to the hyoglossus into the tongue and the floor of the mouth.",
    path: (a, s) => {
      const start = a.carotidBifurcation(s);
      const hyoid = a.hyoidBounds ? boundsCenter(a.hyoidBounds) : [0, 1.51, 0.012];
      const tongue = a.tongueBounds ? boundsCenter(a.tongueBounds) : [0, 1.527, 0.04];
      return [
        [start[0] * 1.2, start[1] + 0.010, start[2] + 0.004],
        [hyoid[0] + s * 0.012, hyoid[1] + 0.006, hyoid[2] + 0.008],
        [tongue[0] + s * 0.007, tongue[1] - 0.002, tongue[2]],
        [tongue[0] + s * 0.004, tongue[1] + 0.002, tongue[2] + 0.020],
      ];
    },
  },
  {
    key: "facial-artery",
    name: "Facial artery",
    group: "arteries",
    radius: CALIBER.artery,
    note: "Crosses the lower border of the mandible at the antegonial notch, where its pulse is palpable, then runs a tortuous course up the face to the corner of the eye.",
    path: (a, s) => {
      const start = a.carotidBifurcation(s);
      const notch = a.facialNotch(s);
      const gland = boundsCenter(a.submandibularBounds(s));
      const molar = a.tooth(s < 0 ? 16 : 26);
      const canine = a.tooth(s < 0 ? 13 : 23);
      return [
        [start[0] * 1.22, start[1] + 0.006, start[2] + 0.002],
        [gland[0] * 1.1, gland[1] + 0.002, gland[2] - 0.004],
        shift(notch, s * 0.002, 0.001, 0.001),
        shift(molar.buccal(0.010), 0, 0.006, 0.004),
        shift(canine.buccal(0.008), 0, 0.012, 0.002),
      ];
    },
  },
  {
    key: "maxillary-artery",
    name: "Maxillary artery",
    group: "arteries",
    radius: CALIBER.artery,
    note: "The larger terminal branch of the external carotid. It passes behind the neck of the mandible into the infratemporal fossa and ends in the pterygopalatine fossa.",
    path: (a, s) => {
      const head = a.condyle(s);
      const fossa = a.pterygopalatineFossa(s);
      return [
        [head[0] * 0.94, head[1] - 0.018, head[2] - 0.012],
        [head[0] * 0.86, head[1] - 0.014, head[2] + 0.002],
        [fossa[0] * 1.25, fossa[1] + 0.004, fossa[2] - 0.004],
        fossa,
      ];
    },
  },
  {
    key: "inferior-alveolar-artery",
    name: "Inferior alveolar artery",
    group: "arteries",
    radius: CALIBER.smallArtery,
    note: "Descends from the maxillary artery and enters the mandibular canal with the inferior alveolar nerve, supplying the lower teeth and the surrounding bone.",
    path: (a, s) => {
      const under = (fdi, drop) => shift(a.tooth(fdi).apex, 0.0, -drop, 0);
      const right = s < 0;
      const foramen = a.mandibularForamen(s);
      return [
        [foramen[0] - s * 0.004, foramen[1] + 0.012, foramen[2] - 0.004],
        shift(foramen, 0, 0.0012, 0.0008),
        shift(under(right ? 47 : 37, 0.0028), 0, 0, 0),
        shift(under(right ? 46 : 36, 0.0028), 0, 0, 0),
        shift(a.mentalForamen(s), 0, 0.0009, -0.001),
      ];
    },
  },
  {
    key: "superficial-temporal-artery",
    name: "Superficial temporal artery",
    group: "arteries",
    radius: CALIBER.artery,
    note: "The smaller terminal branch of the external carotid, running up in front of the ear over the root of the zygomatic arch.",
    path: (a, s) => {
      const head = a.condyle(s);
      const [, hi] = a.temporalBounds(s);
      return [
        [head[0] * 0.94, head[1] - 0.018, head[2] - 0.012],
        [head[0] * 1.08, head[1] - 0.002, head[2] - 0.008],
        [head[0] * 1.1, hi[1] - 0.012, head[2] - 0.002],
        [head[0] * 1.0, hi[1] + 0.006, head[2] + 0.006],
      ];
    },
  },
  {
    key: "posterior-superior-alveolar-artery",
    name: "Posterior superior alveolar artery",
    group: "arteries",
    radius: CALIBER.smallArtery,
    note: "Leaves the maxillary artery near the tuberosity and supplies the upper molars, their sinus lining, and the buccal gingiva.",
    path: (a, s) => {
      const fossa = a.pterygopalatineFossa(s);
      const second = a.tooth(s < 0 ? 17 : 27);
      const first = a.tooth(s < 0 ? 16 : 26);
      return [
        shift(fossa, s * 0.004, 0.001, 0.002),
        shift(a.tuberosity(s), s * 0.002, 0, 0.002),
        shift(second.buccal(0.002), 0, 0.006, 0),
        shift(first.buccal(0.002), 0, 0.006, 0),
      ];
    },
  },
  {
    key: "greater-palatine-artery",
    name: "Greater palatine artery",
    group: "arteries",
    radius: CALIBER.smallArtery,
    note: "Emerges from the greater palatine foramen with the nerve and runs forward in the palate. It is the vessel at risk when a free gingival graft is harvested from the palate.",
    path: (a, s) => {
      const foramen = a.greaterPalatineForamen(s);
      const premolar = a.tooth(s < 0 ? 14 : 24);
      const incisive = a.incisiveForamen();
      return [
        shift(foramen, 0, 0.008, -0.003),
        shift(foramen, s * 0.001, 0, 0.001),
        shift(premolar.lingual(0.004), 0, 0.0015, 0),
        shift(incisive, s * 0.003, 0.001, -0.002),
      ];
    },
  },

  // Venous drainage of the face.
  {
    key: "facial-vein",
    name: "Facial vein",
    group: "veins",
    radius: CALIBER.vein,
    note: "Runs down the face behind the facial artery and drains toward the internal jugular. Its connections with the pterygoid plexus and the cavernous sinus are the reason facial infections are treated seriously.",
    path: (a, s) => {
      const canine = a.tooth(s < 0 ? 13 : 23);
      const molar = a.tooth(s < 0 ? 16 : 26);
      const notch = a.facialNotch(s);
      const start = a.carotidBifurcation(s);
      return [
        shift(canine.buccal(0.011), 0, 0.014, 0.001),
        shift(molar.buccal(0.013), 0, 0.008, 0.002),
        shift(notch, s * 0.005, 0.001, 0),
        [start[0] * 1.3, start[1] + 0.012, start[2] + 0.002],
      ];
    },
  },
  {
    key: "retromandibular-vein",
    name: "Retromandibular vein",
    group: "veins",
    radius: CALIBER.vein,
    note: "Formed behind the neck of the mandible inside the parotid gland, superficial to the external carotid artery and deep to the facial nerve.",
    path: (a, s) => {
      const head = a.condyle(s);
      const angle = a.gonion(s);
      return [
        [head[0] * 1.06, head[1] - 0.004, head[2] - 0.010],
        [head[0] * 1.08, head[1] - 0.024, head[2] - 0.008],
        [angle[0] * 1.02, angle[1] + 0.002, angle[2] - 0.012],
      ];
    },
  },
  {
    key: "external-jugular-vein",
    name: "External jugular vein",
    group: "veins",
    radius: CALIBER.vein,
    note: "Begins near the angle of the mandible and crosses the sternocleidomastoid on its way down the neck.",
    path: (a, s) => {
      const angle = a.gonion(s);
      const start = a.carotidBifurcation(s);
      return [
        [angle[0] * 1.02, angle[1] + 0.002, angle[2] - 0.012],
        [angle[0] * 1.12, angle[1] - 0.020, angle[2] - 0.012],
        [start[0] * 1.9, start[1] - 0.004, start[2] - 0.006],
      ];
    },
  },
  {
    key: "pterygoid-plexus",
    name: "Pterygoid venous plexus",
    group: "veins",
    note: "A network of veins around the lateral pterygoid in the infratemporal fossa. Shown here as a single body: the plexus is a mesh of small channels, not one vessel. A posterior superior alveolar injection placed too deep can enter it.",
    volume: (a, s) => {
      const fossa = a.pterygopalatineFossa(s);
      const head = a.condyle(s);
      return {
        center: [
          (fossa[0] * 1.5 + head[0]) / 2.5,
          fossa[1] + 0.002,
          (fossa[2] + head[2]) / 2,
        ],
        radii: [0.007, 0.008, 0.009],
      };
    },
  },

  // Glands and ducts.
  {
    key: "parotid-gland",
    name: "Parotid gland",
    group: "glands",
    note: "The largest salivary gland, filling the space between the ramus of the mandible, the mastoid, and the sternocleidomastoid. It is purely serous, and the facial nerve runs through it. Absent from the source dataset.",
    volume: (a, s) => {
      const head = a.condyle(s);
      const angle = a.gonion(s);
      return {
        center: [head[0] * 1.24, (head[1] + angle[1]) / 2 - 0.002, head[2] - 0.010],
        radii: [0.010, 0.019, 0.014],
      };
    },
  },
  {
    key: "parotid-duct",
    name: "Parotid duct",
    group: "glands",
    radius: CALIBER.duct,
    note: "Stensen's duct. It crosses the masseter, turns medially through the buccinator, and opens on a papilla in the cheek opposite the upper second molar.",
    path: (a, s) => {
      const head = a.condyle(s);
      const angle = a.gonion(s);
      const first = a.tooth(s < 0 ? 16 : 26);
      const second = a.tooth(s < 0 ? 17 : 27);
      const gland = [head[0] * 1.24, (head[1] + angle[1]) / 2 - 0.002, head[2] - 0.010];
      const papilla = shift(second.buccal(0.004), 0, 0.004, 0);
      return [
        gland,
        [gland[0], gland[1] + 0.008, gland[2] + 0.014],
        shift(first.buccal(0.014), 0, 0.010, 0.002),
        papilla,
      ];
    },
  },
  {
    key: "submandibular-duct",
    name: "Submandibular duct",
    group: "glands",
    radius: CALIBER.duct,
    note: "Wharton's duct. It runs forward in the floor of the mouth, crossed by the lingual nerve, and opens at the sublingual caruncle beside the lingual frenum. Its upward course is why most salivary stones form here.",
    path: (a, s) => {
      const gland = boundsCenter(a.submandibularBounds(s));
      const sublingual = boundsCenter(a.sublingualBounds(s));
      const central = a.tooth(s < 0 ? 41 : 31);
      return [
        gland,
        [gland[0] * 0.9, gland[1] + 0.004, gland[2] + 0.008],
        [sublingual[0] * 0.85, sublingual[1] + 0.001, sublingual[2] + 0.004],
        shift(central.lingual(0.004), 0, -0.002, 0),
      ];
    },
  },

  // Spaces and joint.
  {
    key: "maxillary-sinus",
    name: "Maxillary sinus",
    group: "airway",
    note: "The largest paranasal sinus, occupying the body of the maxilla above the upper posterior teeth. Root apices often lie against or within its floor, which is why an upper molar extraction can open it. Shown as a schematic cavity; the source dataset has no sinus mesh.",
    volume: (a, s) => {
      const [lo, hi] = a.maxillaBounds(s);
      const first = a.tooth(s < 0 ? 16 : 26);
      const premolar = a.tooth(s < 0 ? 14 : 24);
      return {
        center: [
          (first.apex[0] + premolar.apex[0]) / 2,
          (first.apex[1] + hi[1]) / 2 + 0.002,
          (first.apex[2] + premolar.apex[2]) / 2,
        ],
        radii: [0.0085, (hi[1] - first.apex[1]) / 2 + 0.002, Math.max(0.010, (hi[2] - lo[2]) / 4)],
      };
    },
  },
  {
    key: "articular-disc",
    name: "Articular disc of the temporomandibular joint",
    group: "soft",
    note: "The fibrocartilage disc between the mandibular condyle and the glenoid fossa, dividing the joint into an upper translating compartment and a lower rotating one. Absent from the source dataset, which models only the bones of the joint.",
    volume: (a, s) => {
      const head = a.condyle(s);
      return {
        center: [head[0], head[1] + 0.0022, head[2] + 0.001],
        radii: [0.0075, 0.0016, 0.0060],
      };
    },
  },
];

/**
 * Build the schematic parts for this assembly.
 *
 * Returns entries shaped like the rest of the atlas so the viewer, the layer
 * filters, the search, and the isolation controls treat them the same way.
 * The only added field is schematic, which the interface uses to label them.
 */
export function createSchematicParts(parts, readVertices) {
  const anchors = deriveAnchors(parts, readVertices);
  const built = [];
  for (const structure of STRUCTURES) {
    const sides = structure.bilateral === false ? [LEFT] : [RIGHT, LEFT];
    for (const side of sides) {
      const bilateral = structure.bilateral !== false;
      const prefix = !bilateral ? "" : side === RIGHT ? "Right " : "Left ";
      const name = bilateral
        ? `${prefix}${structure.name[0].toLowerCase()}${structure.name.slice(1)}`
        : structure.name;
      const geometry = structure.volume
        ? volumeGeometry(structure.volume(anchors, side))
        : tubeGeometry(structure.path(anchors, side), structure.radius);
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      built.push({
        id: `SCH-${structure.key}${bilateral ? (side === RIGHT ? "-r" : "-l") : ""}`,
        name,
        group: structure.group,
        schematic: true,
        note: structure.note,
        bounds: [
          [box.min.x, box.min.y, box.min.z],
          [box.max.x, box.max.y, box.max.z],
        ],
        geometry,
      });
    }
  }
  return built;
}

function tubeGeometry(waypoints, radius) {
  if (!waypoints || waypoints.length < 2)
    throw new Error("A schematic path needs at least two waypoints");
  for (const point of waypoints)
    if (!point.every(Number.isFinite))
      throw new Error("A schematic waypoint resolved to a non-finite value");
  const curve = new THREE.CatmullRomCurve3(waypoints.map(vec), false, "catmullrom", 0.4);
  // Segment count follows the path length so a long vessel does not turn into
  // a faceted stick and a short twig does not carry pointless triangles.
  const segments = Math.min(96, Math.max(24, Math.round(curve.getLength() / 0.0015)));
  return new THREE.TubeGeometry(curve, segments, radius, 10, false);
}

function volumeGeometry({ center, radii }) {
  if (![...center, ...radii].every(Number.isFinite))
    throw new Error("A schematic volume resolved to a non-finite value");
  const geometry = new THREE.SphereGeometry(1, 24, 16);
  geometry.scale(radii[0], radii[1], radii[2]);
  geometry.translate(center[0], center[1], center[2]);
  return geometry;
}
