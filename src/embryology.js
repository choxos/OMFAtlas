// Tooth development: odontogenesis, the chronology, and the anomalies that
// arise when a stage goes wrong.
//
// The diagrams here are schematic teaching illustrations in the same spirit as
// the tooth section in periodontium.js. They are drawn, not traced from
// histology, and they are not to scale: the enamel organ layers are thickened
// so they can be told apart, and one tooth germ is shown where a real section
// would show the whole lamina. Timings are the ranges usually taught and vary
// widely between individuals.

const EPITHELIUM = "#e2a7ad";
const MESENCHYME = "#e6dcc9";
const PAPILLA = "#cf9aa2";
const FOLLICLE = "#a9bfb6";
const ENAMEL = "#f5f0df";
const DENTIN = "#e8c985";
const LABEL = "#4a6172";

export const stages = [
  {
    id: "initiation",
    name: "Initiation",
    when: "Weeks 6 to 7 in utero",
    summary:
      "The oral ectoderm thickens into the primary epithelial band, which divides into the vestibular lamina, splitting to form the oral vestibule, and the dental lamina, which will produce the teeth.",
    detail:
      "Ten swellings appear along the dental lamina in each arch, one for each primary tooth. The lamina is ectoderm; the tissue it grows into is ectomesenchyme, whose cells migrated in from the neural crest. Almost every signal that shapes a tooth passes between those two tissues, in both directions.",
    origin: "Oral ectoderm and neural crest derived ectomesenchyme",
  },
  {
    id: "bud",
    name: "Bud stage",
    when: "Week 8",
    summary:
      "Each swelling grows into a rounded epithelial bud that pushes into the condensing ectomesenchyme beneath it.",
    detail:
      "The bud is still a simple ball of cells with no internal organization, and the ectomesenchyme around it has begun to condense. This is the point at which the number of teeth is effectively set.",
    origin: "Dental lamina epithelium",
  },
  {
    id: "cap",
    name: "Cap stage",
    when: "Weeks 9 to 10",
    summary:
      "The deep surface of the bud folds inward, so the epithelium sits over the ectomesenchyme like a cap. The three parts of the tooth germ become distinct.",
    detail:
      "The cap is the enamel organ, which will make enamel. The ectomesenchyme it encloses is the dental papilla, which becomes dentin and pulp. The condensed tissue around both is the dental follicle, which becomes cementum, periodontal ligament, and alveolar bone. A cluster of non-dividing cells called the enamel knot appears at the centre of the cap and directs where the cusps will form.",
    origin: "Enamel organ, dental papilla, and dental follicle",
  },
  {
    id: "bell",
    name: "Bell stage",
    when: "Weeks 11 to 12",
    summary:
      "The enamel organ deepens into a bell and separates into four layers. Crown shape and cell identity are both settled here.",
    detail:
      "From the outside in the layers are the outer enamel epithelium, the stellate reticulum, the stratum intermedium, and the inner enamel epithelium. Morphodifferentiation gives the crown its final outline, and histodifferentiation commits the cells: inner enamel epithelium to ameloblasts, and the outer cells of the dental papilla to odontoblasts. The dental lamina breaks up, but a successional lamina persists lingual to each primary germ and later produces its permanent successor.",
    origin: "Four layered enamel organ, plus the successional lamina",
  },
  {
    id: "apposition",
    name: "Apposition",
    when: "From week 14 in utero, primary teeth",
    summary:
      "Hard tissue is laid down. Odontoblasts secrete dentin first, and only then do the ameloblasts opposite them secrete enamel.",
    detail:
      "The order matters: dentin induces enamel formation, and the enamel in turn keeps the odontoblasts working, which is reciprocal induction. Amelogenesis runs in two phases, a secretory phase that lays down the full thickness of partly mineralized matrix and a maturation phase that removes protein and water and brings the mineral content to roughly 96 percent. Ameloblasts are lost when the tooth erupts, so enamel has no cells in it and cannot be repaired biologically. Odontoblasts survive at the edge of the pulp and keep making dentin for life.",
    origin: "Ameloblasts from ectoderm; odontoblasts from ectomesenchyme",
  },
  {
    id: "root",
    name: "Root formation",
    when: "After the crown is complete",
    summary:
      "The two enamel epithelia meet at the cervical loop and grow down as Hertwig's epithelial root sheath, which maps out the shape and number of the roots.",
    detail:
      "The root sheath induces the neighboring papilla cells to become odontoblasts and lay down root dentin, then breaks up into the epithelial cell rests of Malassez, which stay in the periodontal ligament for life and can give rise to radicular cysts. Where the sheath folds inward and meets across the middle, it divides the root into two or three. Cells of the dental follicle then reach the new root surface and form cementum, ligament fibers, and the bone of the socket.",
    origin: "Hertwig's epithelial root sheath and the dental follicle",
  },
  {
    id: "eruption",
    name: "Eruption",
    when: "From 6 months of age",
    summary:
      "The tooth moves axially into the mouth. Roughly two thirds of the root is formed when the crown first appears, and the root finishes afterwards.",
    detail:
      "The pre-eruptive phase is movement of the germ within the growing jaw. The eruptive phase carries the tooth through bone and mucosa: the follicle recruits osteoclasts to open a path above it and osteoblasts to fill in behind. As the tooth emerges, the reduced enamel epithelium fuses with the oral epithelium to form the junctional epithelium of the attachment. The functional phase continues for life, with slow compensation for occlusal wear and for the loss of an opposing tooth.",
    origin: "Dental follicle and reduced enamel epithelium",
  },
];

export const tissueOrigins = [
  ["Enamel", "Ectoderm", "Ameloblasts, from the inner enamel epithelium. Lost at eruption, so enamel cannot be biologically repaired."],
  ["Dentin", "Ectomesenchyme", "Odontoblasts, from the outer cells of the dental papilla. They survive at the pulp border and keep depositing dentin for life."],
  ["Pulp", "Ectomesenchyme", "The remaining dental papilla."],
  ["Cementum", "Ectomesenchyme", "Cementoblasts, from the dental follicle."],
  ["Periodontal ligament", "Ectomesenchyme", "Fibroblasts, from the dental follicle."],
  ["Alveolar bone", "Ectomesenchyme", "Osteoblasts, from the dental follicle."],
];

// Ranges follow the chronologies usually taught. They are population ranges,
// not predictions for a given child.
export const chronology = [
  {
    dentition: "Primary",
    rows: [
      ["Central incisors", "14 weeks in utero", "6 to 12 months", "1.5 to 2 years", "6 to 7 years"],
      ["Lateral incisors", "16 weeks in utero", "9 to 16 months", "1.5 to 2 years", "7 to 8 years"],
      ["Canines", "17 weeks in utero", "16 to 23 months", "2.5 to 3.25 years", "9 to 12 years"],
      ["First molars", "15.5 weeks in utero", "13 to 19 months", "2.5 years", "9 to 11 years"],
      ["Second molars", "18 weeks in utero", "23 to 33 months", "3 years", "10 to 12 years"],
    ],
    columns: ["Tooth", "Hard tissue begins", "Eruption", "Root complete", "Shedding"],
  },
  {
    dentition: "Permanent",
    rows: [
      ["First molars", "At birth", "6 to 7 years", "9 to 10 years", "Not shed"],
      ["Central incisors", "3 to 4 months", "6 to 8 years", "9 to 10 years", "Not shed"],
      ["Lateral incisors", "3 to 12 months", "7 to 9 years", "10 to 11 years", "Not shed"],
      ["Canines", "4 to 5 months", "9 to 12 years", "12 to 15 years", "Not shed"],
      ["First premolars", "1.5 to 2 years", "10 to 11 years", "12 to 14 years", "Not shed"],
      ["Second premolars", "2 to 2.5 years", "10 to 12 years", "13 to 15 years", "Not shed"],
      ["Second molars", "2.5 to 3 years", "11 to 13 years", "14 to 16 years", "Not shed"],
      ["Third molars", "7 to 10 years", "17 to 25 years", "18 to 25 years", "Not shed"],
    ],
    columns: ["Tooth", "Hard tissue begins", "Eruption", "Root complete", "Shedding"],
  },
];

// Each anomaly is filed under the stage whose disturbance produces it, which
// is the point of teaching the stages in the first place.
export const anomalies = {
  initiation: [
    ["Hypodontia and anodontia", "Too few tooth germs form. Third molars, second premolars, and upper lateral incisors are the teeth most often missing."],
    ["Supernumerary teeth", "An extra germ forms. A mesiodens between the upper central incisors is the commonest, and it can block their eruption."],
  ],
  bud: [
    ["Microdontia and macrodontia", "The germ is smaller or larger than usual. Generalized microdontia is rare; a single small upper lateral incisor is common."],
  ],
  cap: [
    ["Gemination", "One germ tries to divide, giving one root and a wide or notched crown. The tooth count is normal."],
    ["Fusion", "Two adjacent germs join. The tooth count is one short."],
    ["Dens invaginatus", "The enamel organ folds into the papilla, leaving a deep channel that runs from the crown toward the pulp and often causes early pulp necrosis in a tooth that has never been carious."],
  ],
  bell: [
    ["Amelogenesis imperfecta", "Inherited failure of the ameloblasts. Enamel may be thin, soft, or discolored, in a pattern that follows every tooth in both dentitions."],
    ["Dentinogenesis imperfecta", "Inherited failure of the odontoblasts. The teeth look opalescent, the enamel shears off unsupported dentin, and the pulp chambers obliterate."],
    ["Peg lateral and taurodontism", "Crown shape is set at this stage, so disturbances here change the form of the tooth rather than its structure."],
  ],
  apposition: [
    ["Enamel hypoplasia", "Matrix is laid down short. A febrile illness, nutritional deficiency, or trauma leaves a band at the height the crown had reached at that moment, which makes enamel a record of when the disturbance happened."],
    ["Turner tooth", "Hypoplasia of one permanent tooth caused by infection or injury of the primary tooth above it."],
    ["Molar incisor hypomineralization", "Demarcated opacities and post-eruptive breakdown of the first permanent molars, often with the incisors involved. The affected enamel is poorly mineralized rather than thin."],
    ["Fluorosis", "Excess fluoride during maturation leaves porous, hypomineralized enamel, from faint white flecking to brown staining and pitting."],
  ],
  root: [
    ["Dilaceration", "A sharp bend in the root, usually after the developing tooth is displaced by trauma to its predecessor."],
    ["Accessory and lateral canals", "Gaps in the root sheath leave channels between pulp and ligament, which is one route by which a necrotic pulp produces a lateral lesion."],
    ["Concrescence and hypercementosis", "Cementum from the follicle is laid down excessively, joining two roots or thickening one."],
  ],
  eruption: [
    ["Natal and neonatal teeth", "A tooth present at birth or in the first month, most often a lower primary incisor. It is usually the normal tooth erupted early, not an extra one."],
    ["Ectopic eruption and impaction", "The tooth erupts along the wrong path or not at all. Upper canines and lower third molars are the ones most often affected."],
    ["Ankylosis", "The root fuses to the bone and the tooth stops moving while its neighbours continue, so it appears to submerge."],
    ["Eruption cyst and eruption haematoma", "A fluid or blood filled swelling over an erupting crown. Most resolve when the tooth comes through."],
  ],
};

export const embryologySources = [
  ["Embryology, teeth", "https://www.ncbi.nlm.nih.gov/books/NBK576393/"],
  ["Histology, tooth", "https://www.ncbi.nlm.nih.gov/books/NBK576380/"],
  ["Tooth eruption", "https://www.ncbi.nlm.nih.gov/books/NBK574533/"],
  ["Developmental disturbances of the teeth", "https://www.ncbi.nlm.nih.gov/books/NBK563262/"],
];

/**
 * A labeled schematic section of one tooth germ at the requested stage.
 *
 * Every stage shares the same frame, oral epithelium across the top and
 * ectomesenchyme below, so that moving between stages reads as one structure
 * developing rather than six unrelated pictures.
 */
export function toothGermDiagram(stageId = "cap") {
  const stage = stages.find((s) => s.id === stageId) || stages[2];
  const label = (x, y, text, anchor = "start") =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`;
  const leader = (path) => `<path d="${path}" fill="none" stroke="#94a7b4" stroke-width="1"/>`;

  const frames = {
    initiation: `
      <path d="M70 96h480v34H70Z" fill="${EPITHELIUM}"/>
      <path d="M262 130q0 44 20 58 20-14 20-58Z" fill="${EPITHELIUM}"/>
      <path d="M318 130q0 30 16 40 16-10 16-40Z" fill="${EPITHELIUM}"/>
      ${leader("M282 176v40h-90")} ${leader("M334 170v70h130")} ${leader("M300 104h-108")}
      <g fill="${LABEL}" font-size="13">
        ${label(186, 220, "Dental lamina", "end")}
        ${label(470, 244, "Vestibular lamina")}
        ${label(186, 108, "Oral epithelium", "end")}
      </g>`,
    bud: `
      <path d="M70 96h480v34H70Z" fill="${EPITHELIUM}"/>
      <path d="M292 130h36v46h-36Z" fill="${EPITHELIUM}"/>
      <ellipse cx="310" cy="212" rx="44" ry="38" fill="${EPITHELIUM}"/>
      <ellipse cx="310" cy="248" rx="76" ry="58" fill="none" stroke="${PAPILLA}" stroke-width="3" stroke-dasharray="6 5"/>
      ${leader("M354 206h110")} ${leader("M310 306v34h130")}
      <g fill="${LABEL}" font-size="13">
        ${label(470, 210, "Tooth bud")}
        ${label(440, 344, "Condensing ectomesenchyme")}
      </g>`,
    cap: `
      <path d="M70 96h480v34H70Z" fill="${EPITHELIUM}"/>
      <path d="M296 130h28v40h-28Z" fill="${EPITHELIUM}"/>
      <path d="M234 262q-8-96 76-96t76 96l-20 2q-4-78-56-78t-56 78Z" fill="${EPITHELIUM}"/>
      <path d="M254 264q-4-78 56-78t56 78q-56-26-112 0Z" fill="${PAPILLA}"/>
      <ellipse cx="310" cy="176" rx="14" ry="9" fill="#b9646f"/>
      <path d="M214 286q0-124 96-124t96 124" fill="none" stroke="${FOLLICLE}" stroke-width="5" stroke-dasharray="8 6"/>
      ${leader("M240 200h-56")} ${leader("M310 240v54h-126")} ${leader("M406 232h58")} ${leader("M324 176h140")}
      <g fill="${LABEL}" font-size="13">
        ${label(178, 204, "Enamel organ", "end")}
        ${label(178, 298, "Dental papilla", "end")}
        ${label(470, 236, "Dental follicle")}
        ${label(470, 180, "Enamel knot")}
      </g>`,
    bell: `
      <path d="M70 96h480v34H70Z" fill="${EPITHELIUM}"/>
      <path d="M330 130h20v28h-20Z" fill="${EPITHELIUM}" opacity=".55"/>
      <path d="M212 320q-6-160 98-160t98 160l-18 1q-4-142-80-142t-80 142Z" fill="#efc9cd"/>
      <path d="M228 318q-4-142 82-142t82 142l-14 1q-4-126-68-126t-68 126Z" fill="#dcb0b7"/>
      <path d="M242 316q-4-126 68-126t68 126l-11 1q-4-112-57-112t-57 112Z" fill="#c98f99"/>
      <path d="M253 317q-4-112 57-112t57 112q-57-30-114 0Z" fill="${PAPILLA}"/>
      <path d="M196 342q0-196 114-196t114 196" fill="none" stroke="${FOLLICLE}" stroke-width="5" stroke-dasharray="8 6"/>
      ${leader("M214 232h-30")} ${leader("M232 258h-48")} ${leader("M246 284h-62")} ${leader("M262 306h-78")}
      ${leader("M404 250h60")} ${leader("M340 152h124")} ${leader("M310 300v46h154")}
      <g fill="${LABEL}" font-size="12.5">
        ${label(178, 236, "Outer enamel epithelium", "end")}
        ${label(178, 262, "Stellate reticulum", "end")}
        ${label(178, 288, "Stratum intermedium", "end")}
        ${label(178, 310, "Inner enamel epithelium", "end")}
        ${label(470, 254, "Dental follicle")}
        ${label(470, 156, "Successional lamina")}
        ${label(470, 350, "Dental papilla")}
      </g>`,
    apposition: `
      <path d="M70 96h480v34H70Z" fill="${EPITHELIUM}" opacity=".5"/>
      <path d="M212 320q-6-160 98-160t98 160l-18 1q-4-142-80-142t-80 142Z" fill="#efc9cd"/>
      <path d="M240 316q-4-128 70-128t70 128l-12 1q-4-114-58-114t-58 114Z" fill="#dcb0b7"/>
      <path d="M252 306q-4-108 58-108t58 108l-16 2q-3-92-42-92t-42 92Z" fill="${ENAMEL}" stroke="#d9d2be" stroke-width="1.2"/>
      <path d="M268 308q-3-92 42-92t42 92l-15 3q-3-76-27-76t-27 76Z" fill="${DENTIN}"/>
      <path d="M283 311q-3-76 27-76t27 76q-27-16-54 0Z" fill="${PAPILLA}"/>
      ${leader("M258 214h-74")} ${leader("M276 236h-92")} ${leader("M310 296v52h-126")}
      ${leader("M366 216h98")} ${leader("M352 258h112")}
      <g fill="${LABEL}" font-size="12.5">
        ${label(178, 218, "Ameloblasts, enamel", "end")}
        ${label(178, 240, "Odontoblasts, dentin", "end")}
        ${label(178, 352, "Pulp, from the papilla", "end")}
        ${label(470, 220, "Starts at the cusp tip")}
        ${label(470, 262, "Dentin forms first")}
      </g>`,
    root: `
      <path d="M70 96h480v30H70Z" fill="${EPITHELIUM}" opacity=".4"/>
      <path d="M244 258q-4-116 66-116t66 116l-18 2q-3-96-48-96t-48 96Z" fill="${ENAMEL}" stroke="#d9d2be" stroke-width="1.2"/>
      <path d="M262 260q-3-96 48-96t48 96l4 44q-52-22-104 0Z" fill="${DENTIN}"/>
      <path d="M288 260q-3-70 22-70t22 70l3 48q-25-12-50 0Z" fill="${PAPILLA}"/>
      <path d="M266 304q6 62 20 96M358 304q-6 62-20 96" fill="none" stroke="${EPITHELIUM}" stroke-width="11" stroke-linecap="round"/>
      <circle cx="284" cy="378" r="5" fill="${EPITHELIUM}"/><circle cx="342" cy="374" r="5" fill="${EPITHELIUM}"/>
      <path d="M240 300q4 74 24 108M384 300q-4 74-24 108" fill="none" stroke="${FOLLICLE}" stroke-width="5" stroke-dasharray="8 6"/>
      ${leader("M270 330h-86")} ${leader("M352 356h112")} ${leader("M372 392h92")}
      <g fill="${LABEL}" font-size="12.5">
        ${label(178, 334, "Hertwig's root sheath", "end")}
        ${label(470, 360, "Rests of Malassez")}
        ${label(470, 396, "Dental follicle")}
      </g>`,
    eruption: `
      <path d="M70 96h214v30H70ZM336 96h214v30H336Z" fill="${EPITHELIUM}"/>
      <path d="M284 96q26 22 52 0l-6 44q-20 12-40 0Z" fill="#c98f99"/>
      <path d="M256 214q-4-96 54-96t54 96l-14 2q-3-78-40-78t-40 78Z" fill="${ENAMEL}" stroke="#d9d2be" stroke-width="1.2"/>
      <path d="M270 216q-3-78 40-78t40 78l4 40q-44-18-88 0Z" fill="${DENTIN}"/>
      <path d="M292 216q-3-56 18-56t18 56l3 42q-21-10-42 0Z" fill="${PAPILLA}"/>
      <path d="M310 300v-160" fill="none" stroke="#7f97a6" stroke-width="2" stroke-dasharray="7 6"/>
      <path d="m310 128-11 20h22Z" fill="#7f97a6"/>
      <path d="M232 250q4 60 22 96M388 250q-4 60-22 96" fill="none" stroke="${FOLLICLE}" stroke-width="5" stroke-dasharray="8 6"/>
      ${leader("M330 118h134")} ${leader("M256 190h-72")} ${leader("M370 300h94")}
      <g fill="${LABEL}" font-size="12.5">
        ${label(470, 122, "Junctional epithelium")}
        ${label(178, 194, "Root two thirds formed", "end")}
        ${label(470, 304, "Eruption pathway")}
      </g>`,
  };

  return `<svg class="germ-diagram" viewBox="0 0 620 420" role="img" aria-label="Schematic section of a developing tooth at the ${stage.name.toLowerCase()}. Not to scale.">
    <rect x="70" y="126" width="480" height="256" fill="${MESENCHYME}" opacity=".5"/>
    ${frames[stage.id]}
    <text x="310" y="410" text-anchor="middle" fill="#8295a1" font-size="10">Schematic teaching diagram · ${stage.name} · Not to scale</text>
  </svg>`;
}
