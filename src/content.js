// The five muscles of mastication, as the fourteen meshes that carry them.
// They are the reason this atlas exists, so they are on whether or not the
// whole muscle layer is, which is 175 meshes and mostly not oral.
export const MASTICATORY = new Set([
  "BP3-FMA49001", // superficial masseter, right
  "BP3-FMA49002", // superficial masseter, left
  "BP3-FMA49004", // deep masseter, right
  "BP3-FMA49005", // deep masseter, left
  "BP3-FMA49007", // temporalis, right
  "BP3-FMA49008", // temporalis, left
  "BP3-FMA49012", // medial pterygoid, right
  "BP3-FMA49013", // medial pterygoid, left
  "BP3-FMA49022", // lower head of lateral pterygoid, right
  "BP3-FMA49023", // lower head of lateral pterygoid, left
  "BP3-FMA49024", // upper head of lateral pterygoid, right
  "BP3-FMA49025", // upper head of lateral pterygoid, left
  "BP3-FMA46835", // buccinator, right
  "BP3-FMA46836", // buccinator, left
]);

export const groups = {
  bones: { name: "Bones & landmarks", color: "#e2d4b9" },
  teeth: { name: "Permanent dentition", color: "#fff7e4" },
  gingiva: { name: "Gingiva", color: "#c78286" },
  soft: { name: "Tongue & floor of mouth", color: "#b85d62" },
  glands: { name: "Salivary glands", color: "#cca770" },
  neck: { name: "Cervical spine", color: "#c6c1b0" },
  muscles: { name: "Muscles", color: "#ad5955" },
  arteries: { name: "Arteries", color: "#be4845" },
  veins: { name: "Veins", color: "#527aaa" },
  nerves: { name: "Nerves", color: "#d5b64e" },
  brain: { name: "Brain & meninges", color: "#d4b2ad" },
  eyes: { name: "Eyes & ears", color: "#a0bbb9" },
  airway: { name: "Airway & pharynx", color: "#c68d83" },
  skin: { name: "Skin", color: "#d8b8a4" },
};

export const sources = {
  mandible: [
    "Mandible anatomy",
    "https://www.ncbi.nlm.nih.gov/books/NBK532292/",
  ],
  teeth: ["Tooth anatomy", "https://www.ncbi.nlm.nih.gov/books/NBK557543/"],
  joint: [
    "Temporomandibular joint anatomy",
    "https://www.ncbi.nlm.nih.gov/books/NBK538486/",
  ],
  muscles: [
    "Masticatory system: anatomy and function",
    "https://www.ncbi.nlm.nih.gov/books/NBK557988/",
  ],
};

export function toothNumber(name) {
  if (!/tooth/i.test(name)) return null;
  const quadrant = /Right upper/i.test(name)
    ? 1
    : /Left upper/i.test(name)
      ? 2
      : /Left lower/i.test(name)
        ? 3
        : 4;
  const position = /central/i.test(name)
    ? 1
    : /lateral/i.test(name)
      ? 2
      : /canine/i.test(name)
        ? 3
        : /first.*premolar/i.test(name)
          ? 4
          : /second.*premolar/i.test(name)
            ? 5
            : /first.*molar/i.test(name)
              ? 6
              : /second.*molar/i.test(name)
                ? 7
                : null;
  return position ? quadrant * 10 + position : null;
}

export function displayName(part) {
  return part.name.replace("secondary ", "permanent ");
}

export const topics = [
  {
    id: "mandible",
    title: "The mandible",
    subtitle: "Body, ramus & neurovascular relationships",
    match: /^Mandible$/i,
    overview:
      "The mandible forms the lower jaw. Its body supports the lower teeth, and its paired rami extend toward the temporomandibular joints.",
    student:
      "Rotate to the medial surface of the ramus. Find the mandibular foramen, then compare its location with the mental foramen on the body.",
    dentist:
      "Relate the mandibular canal to the tooth-bearing body. The inferior alveolar nerve travels within it; individual anatomy must be assessed separately.",
    specialist:
      "Compare the angle, ramus, coronoid process, and condylar process from several views. This surface model does not resolve the nerve or patient-specific canal relationships.",
    source: "mandible",
  },
  {
    id: "dentition",
    title: "Permanent dentition",
    subtitle: "Tooth identity & FDI notation",
    match: /tooth/i,
    overview:
      "Incisors, canines, premolars, and molars have different crown forms. Select a tooth to see its FDI two-digit identifier.",
    student:
      "In FDI notation, the first digit identifies the quadrant from the patient’s perspective: upper right 1, upper left 2, lower left 3, lower right 4. The second counts from the midline.",
    dentist:
      "Compare crown contours and positions across the arches. This reference contains 28 permanent teeth; third molars and primary dentition are absent.",
    specialist:
      "The meshes show external form. They do not model pulp spaces, root canals, periodontal ligament, or occlusal contact measurements.",
    source: "teeth",
  },
  {
    id: "maxilla",
    title: "The maxilla",
    subtitle: "Upper arch & facial skeleton",
    match: /maxilla/i,
    overview:
      "The paired maxillae support the upper dentition. Explore their relationship to the neighboring facial bones and the upper arch.",
    student:
      "Select each maxilla, then view the skull from below to examine its contribution to the bony palate.",
    dentist:
      "Compare the upper tooth roots and surrounding bone using the transparency control. This is an anatomical reference, not a radiographic reconstruction.",
    specialist:
      "Isolate a maxilla to examine its surfaces. Sinus mucosa and patient-specific bone dimensions are not represented.",
    source: "muscles",
  },
  {
    id: "tmj",
    title: "TMJ: bony relationships",
    subtitle: "Condylar process & temporal bone",
    match: /Mandible|temporal bone/i,
    overview:
      "The temporomandibular joint connects the mandible to the temporal bone. Its movement combines rotation and translation.",
    student:
      "Compare the mandibular condyle and the temporal bone from a lateral view. The articular disc and capsule are not included in this model.",
    dentist:
      "Use the bony view to orient yourself before studying joint soft tissues. Static geometry cannot demonstrate disc displacement or jaw mechanics.",
    specialist:
      "Inspect both sides of the joint. No joint-space measurements, dynamic occlusion, or diagnostic interpretation are provided.",
    source: "joint",
  },
  {
    id: "floor",
    title: "Floor of the mouth",
    subtitle: "Tongue, muscles & glands",
    match:
      /mylohyoid|geniohyoid|genioglossus|hyoglossus|Tongue|sublingual|submandibular/i,
    overview:
      "Explore the tongue and the paired structures beneath it. Toggle the mandible off to reveal the floor-of-mouth assembly.",
    student:
      "Identify the mylohyoid and compare it with the geniohyoid. Use selection and isolation to distinguish neighboring structures.",
    dentist:
      "Locate the sublingual and submandibular glands in the reference assembly. Ducts and adjacent dental nerves are not included.",
    specialist:
      "Compare the visible muscle and gland boundaries. Fascial spaces, infection pathways, and surgical planes are not segmented.",
    source: "muscles",
  },
];

export const questions = [
  {
    prompt: "Which structure forms the lower jaw?",
    choices: ["Mandible", "Maxilla", "Zygomatic bone", "Vomer"],
    answer: 0,
    why: "The mandible is the lower jaw and supports the lower dentition.",
    topic: "mandible",
  },
  {
    prompt:
      "What is the FDI number of the permanent upper right central incisor?",
    choices: ["21", "11", "41", "12"],
    answer: 1,
    why: "Quadrant 1 is upper right; position 1 is the central incisor. Sides are the patient’s.",
    topic: "dentition",
  },
  {
    prompt: "Which bone articulates with the mandibular condyle?",
    choices: ["Parietal bone", "Frontal bone", "Temporal bone", "Nasal bone"],
    answer: 2,
    why: "The temporal bone and mandibular condyle form the bony components of the TMJ.",
    topic: "tmj",
  },
  {
    prompt: "Which nerve travels in the mandibular canal?",
    choices: [
      "Optic nerve",
      "Facial nerve",
      "Hypoglossal nerve",
      "Inferior alveolar nerve",
    ],
    answer: 3,
    why: "The inferior alveolar nerve runs within the mandibular canal. It is not segmented in this model.",
    topic: "mandible",
  },
  {
    prompt: "FDI 36 identifies which permanent tooth?",
    choices: [
      "Upper left first molar",
      "Lower left first molar",
      "Lower right first molar",
      "Lower left second molar",
    ],
    answer: 1,
    why: "Quadrant 3 is lower left; position 6 is the first molar.",
    topic: "dentition",
  },
  {
    prompt: "Which teeth are absent from this reference model?",
    choices: ["Canines", "Central incisors", "Third molars", "First premolars"],
    answer: 2,
    why: "The model includes 28 permanent teeth, without third molars. This describes the dataset, not every adult dentition.",
    topic: "dentition",
  },
];
