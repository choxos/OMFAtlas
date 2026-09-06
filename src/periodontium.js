export const perioSources = [
  ["Oral gingiva anatomy", "https://www.ncbi.nlm.nih.gov/books/NBK560662/"],
  [
    "Histology of the periodontium",
    "https://www.ncbi.nlm.nih.gov/books/NBK570604/",
  ],
  [
    "AAP: probing, attachment levels, and furcations",
    "https://www.perio.org/periodontal-education/3deducationalanimations/",
  ],
  [
    "Periodontal anatomy (Wheeler / Scheid teaching chapter)",
    "https://downloads.lww.com/wolterskluwer_vitalstream_com/sample-content/9781608317462_Scheid/samples/Chapter07.pdf",
  ],
];

export const tissues = [
  {
    id: "enamel",
    name: "Enamel",
    color: "#f5f0df",
    text: "Mineralized covering of the anatomical crown. The enamel–dentin junction separates it from underlying dentin.",
  },
  {
    id: "dentin",
    name: "Dentin",
    color: "#e8c985",
    text: "The main hard-tissue body of the tooth, surrounding the pulp and extending from crown into root.",
  },
  {
    id: "pulp",
    name: "Pulp & root canal",
    color: "#ce626b",
    text: "The vascular, innervated tissue occupies the chamber and canal system. This generic section does not depict a particular tooth’s full canal configuration.",
  },
  {
    id: "cementum",
    name: "Cementum",
    color: "#b8ab7d",
    text: "Mineralized root covering that provides attachment for periodontal ligament fibers.",
  },
  {
    id: "pdl",
    name: "Periodontal ligament",
    color: "#80a6ae",
    text: "Connective tissue between root cementum and alveolar bone. It contributes to support, sensory function, and adaptation to loading.",
  },
  {
    id: "bone",
    name: "Alveolar bone",
    color: "#d4baa2",
    text: "Bone forms the tooth socket. The alveolar crest is its coronal boundary beside the tooth.",
  },
  {
    id: "gingiva",
    name: "Gingiva",
    color: "#cc8792",
    text: "The gingiva surrounds the cervical tooth region. Free, attached, and interdental portions have different relationships to the tooth and neighboring mucosa.",
  },
  {
    id: "sulcus",
    name: "Gingival sulcus",
    color: "#9c5670",
    text: "The crevice between tooth and marginal gingiva. Sulcular epithelium lines its soft-tissue wall.",
  },
  {
    id: "attachment",
    name: "Junctional epithelium",
    color: "#936ba0",
    text: "Epithelium attached to the tooth at the base of the sulcus. It forms part of the dentogingival seal.",
  },
];

export const periodontalDetails = [
  [
    "Free gingiva",
    "The marginal collar surrounds the tooth and forms the outer wall of the gingival sulcus.",
  ],
  [
    "Attached gingiva",
    "Firm gingiva bound to underlying tissues. The mucogingival junction separates it from more mobile alveolar mucosa where that junction is present.",
  ],
  [
    "Interdental papilla",
    "Gingival tissue fills the space beneath the proximal contact. Its form relates to the contact and neighboring tooth contours.",
  ],
  [
    "Supracrestal tissue attachment",
    "Junctional epithelium and supracrestal connective tissue attachment together occupy the region between the sulcus base and the alveolar crest.",
  ],
  [
    "Root trunk & furcation",
    "The root trunk extends from the cervical region to root separation. A furcation is the region between roots of a multirooted tooth.",
  ],
  [
    "Gingival phenotype",
    "Thickness and contour vary. Healthy pigmentation also varies; color alone is not a diagnosis.",
  ],
];

export const perioStudy = [
  [
    "Probing depth",
    "Think of the distance from the gingival margin to the base reached by a periodontal probe. It is not the same as attachment level.",
  ],
  [
    "Clinical attachment level",
    "Uses a fixed reference, usually the cementoenamel junction. Gingival margin position must be considered when relating it to probing depth.",
  ],
  [
    "Recession",
    "An apically positioned gingival margin can expose root surface. A shallow sulcus does not by itself demonstrate intact attachment.",
  ],
  [
    "Furcation involvement",
    "Loss of supporting tissue can expose the region between roots. Root number and divergence shape the anatomy of this region.",
  ],
];

export function toothSection(
  selected = "pulp",
  enabled = new Set(tissues.map((t) => t.id)),
) {
  const shape = (id, content) =>
    `<g class="tissue ${selected === id ? "highlighted" : ""}" data-tissue="${id}" style="opacity:${enabled.has(id) ? 1 : 0.07}">${content}</g>`;
  return `<svg class="tooth-section" viewBox="0 0 620 570" role="img" aria-label="Schematic longitudinal section of a single-rooted tooth and periodontium. Not to scale; use the labeled tissue buttons to explore.">
    <defs><pattern id="trabeculae" width="21" height="25" patternUnits="userSpaceOnUse"><path d="M0 0 21 25M21 0 0 25" stroke="#bba08c" stroke-width="1" opacity=".35"/></pattern></defs>
    ${shape("bone", '<path d="M165 260Q193 248 217 278L259 481Q269 521 310 528Q351 521 361 481L403 278Q427 248 455 260V548H165Z" fill="#d4baa2"/><path d="M165 260Q193 248 217 278L259 481Q269 521 310 528Q351 521 361 481L403 278Q427 248 455 260V548H165Z" fill="url(#trabeculae)"/>')}
    ${shape("gingiva", '<path d="M165 262V219Q182 196 216 204L233 249 246 302Q210 275 165 293ZM455 262V219Q438 196 404 204L387 249 374 302Q410 275 455 293Z" fill="#cc8792"/>')}
    ${shape("pdl", '<path d="M224 238Q235 353 278 494Q291 526 310 524Q329 526 342 494Q385 353 396 238L383 238Q374 353 329 489Q319 510 310 510Q301 510 291 489Q246 353 237 238Z" fill="#80a6ae"/>')}
    ${shape("cementum", '<path d="M235 229Q246 350 289 490Q301 516 310 515Q319 516 331 490Q374 350 385 229Z" fill="#b8ab7d"/>')}
    ${shape("dentin", '<path d="M242 217Q250 338 296 486Q302 501 310 503Q318 501 324 486Q370 338 378 217L388 145Q388 105 353 97Q331 90 310 99Q289 90 267 97Q232 105 232 145Z" fill="#e8c985"/>')}
    ${shape("enamel", '<path d="M225 231Q218 202 210 156Q200 102 234 69Q257 49 285 65L310 81 335 65Q363 49 386 69Q420 102 410 156Q402 202 395 231L378 217 388 145Q388 105 353 97Q331 90 310 99Q289 90 267 97Q232 105 232 145L242 217Z" fill="#f5f0df" stroke="#d5cfc1" stroke-width="1.5"/>')}
    ${shape("pulp", '<path d="M282 154Q279 177 277 208Q280 244 293 262L305 493 310 505 315 493 327 262Q340 244 343 208Q341 177 338 154L325 188Q310 180 295 188Z" fill="#ce626b"/><path d="M307 475q-16 10-14 21M313 480q18 4 15 15" fill="none" stroke="#ce626b" stroke-width="3"/>')}
    ${shape("sulcus", '<path d="m215 205 13 28m177-28-13 28" stroke="#9c5670" stroke-width="5" stroke-linecap="round"/>')}
    ${shape("attachment", '<path d="m228 234 5 19m159-19-5 19" stroke="#936ba0" stroke-width="7" stroke-linecap="round"/>')}
    <g fill="none" stroke="#8295a1" stroke-width="1"><path d="M238 100H147L123 85H38"/><path d="M259 175H150L128 160H38"/><path d="M310 217H139L121 220H38"/><path d="M268 416H147L123 430H38"/><path d="M360 400H462L485 420H582"/><path d="M433 340H582"/><path d="M425 225H470L490 207H582"/><path d="M401 212H455L475 166H582"/><path d="M390 246H450L480 278H582"/></g>
    <g font-family="DM Sans, sans-serif" font-size="12" fill="#506a7c"><text x="38" y="77">Enamel</text><text x="38" y="152">Dentin</text><text x="38" y="213">Pulp chamber</text><text x="38" y="446">Cementum</text><text x="582" y="438" text-anchor="end">Periodontal ligament</text><text x="582" y="333" text-anchor="end">Alveolar bone</text><text x="582" y="199" text-anchor="end">Gingiva</text><text x="582" y="158" text-anchor="end">Gingival sulcus</text><text x="582" y="294" text-anchor="end">Junctional epithelium</text></g>
    <text x="310" y="565" text-anchor="middle" fill="#8295a1" font-size="10">Generic single-rooted teaching section · Not to scale</text>
  </svg>`;
}
