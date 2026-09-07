import "./style.css";
import { createViewer } from "./viewer.js";
import {
  MASTICATORY,
  groups,
  topics,
  questions,
  sources,
  toothNumber,
  displayName,
} from "./content.js";
import {
  dentalProfile,
  partForTooth,
  dentalSections,
  dentalSources,
  specialtyNotes,
} from "./dental.js";
import {
  endoProfile,
  endoSources,
  canalPatterns,
  canalGlossary,
} from "./endodontics.js";
import {
  tissues,
  toothSection,
  periodontalDetails,
  perioStudy,
  perioSources,
} from "./periodontium.js";
import { clinicalLibrary } from "./clinical-library.js";
import {
  stages,
  tissueOrigins,
  chronology,
  anomalies,
  embryologySources,
  toothGermDiagram,
} from "./embryology.js";
import { getDentitionFDIs } from "./dental-geometry.js";
import { TISSUE_ORDER, tissueGroup } from "./explosion-layout.js";
import { MODEL_GROUPS, MODEL_VIEWS } from "./dental-models.js";

const touchLayout = () => matchMedia("(max-width: 860px)").matches;
const groupOpacity = (group) => state.opacity.get(group) ?? 1;
const icon = (name) => {
  const paths = {
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
    layers:
      '<path d="m12 3 10 6-10 6L2 9Z"/><path d="m2 13 10 6 10-6M2 17l10 6 10-6"/>',
    book: '<path d="M12 6c-3-3-7-3-10-2v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 2v15"/>',
    tooth:
      '<path d="M12 5C6-1 1 5 4 12c1 3 1 9 4 9 2 0 1-8 4-8s2 8 4 8c3 0 3-6 4-9 3-7-2-13-8-7Z"/>',
    quiz: '<path d="M9 3H5v19h14V3h-4M9 2h6v4H9Z"/><path d="m8 13 3 3 5-6"/>',
    reset: '<path d="M3 10a9 9 0 1 1 1 8M3 3v7h7"/>',
    expand: '<path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/>',
    arrow: '<path d="m9 5 7 7-7 7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.5 1.5m11.2 11.2 1.5 1.5M19.1 4.9l-1.5 1.5M6.4 17.6l-1.5 1.5"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
    separate: '<path d="M12 4v16"/><path d="m7 9-4 3 4 3"/><path d="m17 9 4 3-4 3"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.tooth}</svg>`;
};
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
// An oral and maxillofacial atlas should open on the jaws, not on a wall of
// muscle that hides them, so muscles, brain, eyes and skin start off. Reset
// returns here rather than turning everything on.
const DEFAULT_LAYERS = [
  "bones",
  "teeth",
  "gingiva",
  "neck",
  "arteries",
  "veins",
  "nerves",
  "glands",
  "soft",
  "airway",
];
const state = {
  selected: "FJ3289",
  layers: new Set(DEFAULT_LAYERS),
  age: "adult",
  arches: false,
  toothDetail: false,
  perioFocus: false,
  cutaway: true,
  sectionDepth: 0,
  autoDetail: true,
  hiddenTissues: new Set(),
  isolated: false,
  opacity: new Map(),
  landmark: null,
  masticatory: true,
  hidden: new Set(),
  modelView: "jaw",
  archSource: "published",
  cutAxis: "a",
  cutPosition: 50,
  cutTilt: 0,
  cutRotate: 0,
  cutFlip: false,
  explode: 0,
  tab: "anatomy",
  query: "",
  fdi: 36,
  dentalTab: "morphology",
  topic: "mandible",
  quiz: 0,
  answers: [],
  saved: new Set(),
  mode: "3d",
  tissue: "pulp",
  tissueLayers: new Set(tissues.map((t) => t.id)),
  pattern: 0,
  stage: "cap",
  schematic: true,
};
try {
  state.saved = new Set(JSON.parse(localStorage.getItem("omf-saved") || "[]"));
} catch {}
let atlas, viewer;

document.querySelector("#app").innerHTML = `
  <div class="studio">
  <div id="viewer" class="scene"></div><div class="vignette" aria-hidden="true"></div>
  <div id="teaching-view" hidden></div>

  <div class="identity">
    <a class="brand" href="/" aria-label="OMF Atlas home"><span class="brand-mark">${icon("tooth")}</span><span class="brand-word">OMF<span class="brand-light"> Atlas</span></span></a>
    <span class="eyebrow"><span class="live-dot"></span>Oral &amp; maxillofacial anatomy</span>
    <span class="breadcrumb">Anatomy / Head &amp; neck</span>
    <h1 id="stage-title">Head &amp; neck</h1>
    <small id="resolution-status" role="status">Preparing surface detail</small>
  </div>

  <nav class="tab-bar" aria-label="Main navigation">${[
    ["anatomy", "layers", "Explore", "Explore anatomy"],
    ["dental", "tooth", "Dental", "Dental atlas"],
    ["study", "book", "Study", "Study guide"],
    ["quiz", "quiz", "Test", "Self-test"],
  ]
    .map(
      ([id, i, short, label]) =>
        `<button data-tab="${id}" class="nav-button ${id === "anatomy" ? "active" : ""}" title="${label}">${icon(i)}<span>${short}</span></button>`,
    )
    .join("")}</nav>

  <div class="top-actions">
    <button class="icon-button" id="theme" title="Switch between light and dark" aria-label="Switch between light and dark"></button>
    <button class="icon-button" id="reset" title="Reset view and layers" aria-label="Reset view and layers">${icon("reset")}</button>
    <button id="toggle-details" aria-expanded="false">Details</button>
  </div>

  <aside class="sidebar panel">
    <div class="choices">
      <label class="age-choice"><span>Dentition</span><select id="age"><option value="adult">Adult · permanent</option><option value="child">Child · primary</option><option value="mixed">Child · mixed</option></select></label>
    </div>
    <label class="search">${icon("search")}<input id="search" type="search" placeholder="Find a structure or FDI number…" aria-label="Search structures or FDI number"><kbd>/</kbd></label>
    <div id="browser"></div>
    <div class="sidebar-bottom"><button id="coverage">${icon("info")} Model coverage</button><span id="source-caption">BodyParts3D 4.0 · Adult reference</span></div>
  </aside>
  <button id="mobile-library" aria-expanded="false" aria-label="Layers and structure library" title="Layers and structure library">${icon("layers")}<span>Layers</span></button>

  <div class="view-controls panel" aria-label="Camera views">
    <div class="view-pills">${["oblique", "anterior", "lateral", "inferior"].map((v, i) => `<button data-view="${v}" class="${i === 0 ? "active" : ""}" title="${v[0].toUpperCase() + v.slice(1)} view"><span>${v[0].toUpperCase() + v.slice(1)}</span></button>`).join("")}</div>
    <i role="presentation"></i>
    <div class="zoom-controls"><button id="zoom-in" aria-label="Zoom in">+</button><button id="zoom-out" aria-label="Zoom out">−</button><button id="fit" aria-label="Fit visible anatomy" title="Fit visible anatomy">${icon("expand")}</button></div>
  </div>

  <div id="mode-bar" class="panel" hidden><button data-mode="3d" class="active"><span>3D anatomy</span></button><button data-mode="section"><span>Tooth &amp; periodontium</span></button><button data-mode="canals"><span>Root canal explorer</span></button><button data-mode="development"><span>Tooth development</span></button><button data-mode="models"><span>Source models</span></button></div>
  <div id="load-status" class="panel" role="status"><strong>Preparing the anatomy</strong><span id="load-detail">Loading the head and neck assembly</span><div class="loading-track"><i id="load-bar"></i></div></div>

  <section id="dental-3d-controls" class="panel" hidden data-tool="tissues" aria-label="3D dental inspection"><div class="detail-actions"><button id="exit-tooth"><span>Back to ${state.age === "adult" ? "head & neck" : "dental arches"}</span></button></div><div class="tool-tabs">${[
    ["tissues", "Tissues"],
    ["cut", "Cut"],
    ["about", "Notes"],
  ]
    .map(
      ([id, name]) =>
        `<button data-tool="${id}" class="${id === "tissues" ? "active" : ""}">${name}</button>`,
    )
    .join("")}</div><div class="tool-body"><div class="cut-controls"><label class="cut-enable"><input id="cutaway" type="checkbox" checked> Cutaway</label><div class="cut-axes">${[
    ["a", "Longitudinal A"],
    ["b", "Longitudinal B"],
    ["crossing", "Crossing"],
  ]
    .map(
      ([id, name]) =>
        `<button data-cut-axis="${id}" class="${id === "a" ? "active" : ""}"><span>${name}</span></button>`,
    )
    .join("")}</div>
  <label class="section-slider"><span>Cutting position <output id="section-depth-out">50%</output></span><input id="section-depth" type="range" min="0" max="100" value="50"></label>
  <label class="section-slider"><span>Tilt <output id="cut-tilt-out">0°</output></span><input id="cut-tilt" type="range" min="-45" max="45" value="0"></label>
  <label class="section-slider"><span>Rotate <output id="cut-rotate-out">0°</output></span><input id="cut-rotate" type="range" min="-90" max="90" value="0"></label>
  <div class="cut-actions"><button id="cut-flip"><span>Reverse the side that remains</span></button><button id="cut-face"><span>Face the cut</span></button><button id="cut-whole"><span>View the whole</span></button></div>
  <p class="fine-print">Longitudinal A and B are the two vertical planes of the model's own frame and Crossing is the horizontal one. None of them is a fixed buccolingual or mesiodistal direction: neither dataset records which of its axes is which.</p></div><div class="tissue-3d-buttons">${[
    ["enamel", "Enamel"],
    ["dentin", "Dentin"],
    ["pulp", "Pulp & canals"],
    ["cementum", "Cementum"],
    ["pdl", "Ligament"],
    ["bone", "Bone"],
    ["gingiva", "Gingiva"],
  ]
    .map(
      ([id, name]) =>
        `<button data-tissue3d="${id}" aria-pressed="true">${name}</button>`,
    )
    .join(
      "",
    )}</div><span id="tissue-3d-status" role="status">Rotate to inspect the section. Teaching geometry, not a scan.</span></div></section>

  <svg id="orientation" viewBox="-50 -50 100 100" aria-hidden="true"><g id="orientation-axes"></g></svg>
  <section id="model-controls" class="panel" hidden aria-label="Published dental models"></section>
  <div class="caption-stack"><p class="age-notice" id="age-notice"></p><div class="stage-caption"><span id="visible-count">Preparing anatomy</span><i class="caption-line"></i><span class="drag-hint">Drag to rotate · Scroll to zoom</span></div></div>
  <div class="stage-bottom panel">
    <div class="dock-row dock-selection"><div class="stage-bottom-name"><strong id="selection-name">Mandible</strong><span id="selection-caption">Selected structure</span></div><button id="isolate">${icon("eye")} <span>Isolate structure</span></button><button data-clear-selection aria-label="Clear selection" title="Clear selection">×</button></div>
    <div class="dock-row dock-separation"><div class="explode-control"><div class="explode-label"><label for="explode">Separate structures</label><output id="explode-output">0%</output></div><input id="explode" type="range" min="0" max="100" value="0" aria-label="Separate structures"><div class="slider-endpoints"><span>Assembled</span><span>Every structure</span></div><p class="dock-note">Separation is a layout of the parts list, not a dissection order.</p></div><button id="reassemble-dock" title="Reassemble and reset the view">${icon("reset")}<span>Reset</span></button></div>
    <button id="dock-switch" aria-pressed="false" aria-label="Separation controls" title="Separation controls">${icon("separate")}</button>
  </div>

  <aside class="inspector panel" id="inspector" aria-label="Anatomy details"></aside><button class="close-inspector" id="close-inspector" aria-label="Close anatomy details">×</button>

  <footer class="studio-footer"><span>Built for dental learning.</span><span class="footer-note">Educational reference. Not for diagnosis or treatment planning.</span><button id="privacy">Privacy</button><button id="credits">Credits &amp; references</button></footer>
  <div id="consent" class="panel" role="dialog" aria-modal="false" aria-labelledby="consent-title" hidden>
    <strong id="consent-title">Analytics</strong>
    <p>This atlas can count visits with Google Analytics. Until you choose, it is loaded but switched off: it stores nothing and sets no cookies. The atlas works either way.</p>
    <div class="consent-actions"><button id="consent-accept">Accept</button><button id="consent-decline">Decline</button></div>
  </div>
  </div>
  <div id="part-hover" class="part-hover" hidden aria-hidden="true"></div>
  <dialog id="modal"><button id="close-modal" class="close" aria-label="Close dialog">×</button><div id="modal-content"></div></dialog>`;

// ---- Analytics consent ---------------------------------------------------
//
// Google Analytics runs under Consent Mode v2. index.html sets every consent
// category to denied before the tag loads, so nothing is stored and no cookie
// is set until the reader accepts; accepting sends the update call below.
// Advertising categories stay denied either way, since none of this is for
// advertising.

const CONSENT_KEY = "omf-consent";

const readConsent = () => {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
};

/** Tell the already loaded tag whether it may store anything. */
function updateConsent(granted) {
  if (typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
  });
}

/**
 * Drop the cookies Google Analytics sets, for a reader who changes their mind.
 *
 * A cookie can only be removed by naming the domain it was set on. The tag is
 * pinned to this host now, but visits from before that change left cookies on
 * the registrable domain, so this walks up the label chain and tries each one.
 */
function clearAnalyticsCookies() {
  const labels = location.hostname.split(".");
  const domains = [""];
  for (let i = 0; i < labels.length - 1; i++) {
    const domain = labels.slice(i).join(".");
    domains.push(`; domain=${domain}`, `; domain=.${domain}`);
  }
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0].trim();
    if (!/^_ga/.test(name)) continue;
    for (const domain of domains)
      document.cookie = `${name}=; max-age=0; path=/${domain}`;
  }
}

function showConsent(open) {
  document.querySelector("#consent").hidden = !open;
}

function setConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {}
  showConsent(false);
  updateConsent(value === "granted");
  if (value !== "granted") clearAnalyticsCookies();
}

// Schematic structures are labeled everywhere they are named, so a reader
// never has to guess which meshes came from the scan and which were built.
const SCHEMATIC_BADGE = '<span class="schematic-badge" title="Schematic teaching geometry, not a segmented source mesh">Schematic</span>';
const isSchematic = (part) => Boolean(part?.schematic);

const hoverBox = () => document.querySelector("#part-hover");
function showHover(part, at) {
  const box = hoverBox();
  if (!part || !at) {
    box.hidden = true;
    return;
  }
  box.innerHTML = `${escape(displayName(part))}${isSchematic(part) ? SCHEMATIC_BADGE : ""}`;
  box.hidden = false;
  // Keep the label inside the window; flip it when the pointer nears an edge.
  const { width, height } = box.getBoundingClientRect();
  box.style.left = `${Math.min(at.x + 16, innerWidth - width - 12)}px`;
  box.style.top = `${at.y + height + 26 > innerHeight ? at.y - height - 14 : at.y + 18}px`;
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("omf-theme", theme);
  } catch {}
  const button = document.querySelector("#theme");
  button.innerHTML = icon(theme === "dark" ? "sun" : "moon");
  button.setAttribute("aria-pressed", String(theme === "dark"));
  button.title =
    theme === "dark" ? "Switch to the light theme" : "Switch to the dark theme";
}
setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
document.querySelector("#theme").onclick = () =>
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");

function updateScene() {
  document.body.classList.toggle(
    "tooth-inspection",
    state.toothDetail && state.mode === "3d",
  );
  viewer?.update(state);
  const exploded = state.explode > 0 && !state.arches && !state.toothDetail && state.age === "adult";
  document.querySelector(".drag-hint").textContent = exploded
    ? state.explode >= 95 ? "Parts inventory · Drag to pan · Zoom in to reassemble" : "Separating structures · Keep zooming out for inventory"
    : "Drag to rotate · Scroll to zoom";
  document.querySelector("#viewer").dataset.explode = String(state.explode);
  const part = atlas.parts.find((p) => p.id === state.selected);
  document.querySelector("#selection-name").textContent =
    !state.selected && !state.toothDetail ? "No structure selected" : state.toothDetail || state.arches || state.age !== "adult"
      ? `FDI ${state.fdi} · ${dentalProfile(state.fdi).fullName}`
      : part
        ? displayName(part)
        : "Head & neck";
  document.querySelector("#selection-caption").textContent = state.toothDetail
    ? state.perioFocus
      ? "Schematic 3D periodontium"
      : "Schematic 3D internal anatomy"
    : state.isolated
      ? "Isolated view"
      : state.selected ? "Selected structure" : "Click a structure to inspect it";
  document.querySelector("#isolate").disabled = !state.selected && !state.toothDetail;
  document.querySelector("#isolate").innerHTML =
    `${icon("eye")} <span>${state.toothDetail ? "Back to assembly" : state.arches || state.age !== "adult" ? "Inspect selected tooth" : state.isolated ? "Restore assembly" : "Isolate structure"}</span>`;
  const publishedArch = viewer?.publishedArch?.();
  const publishedTooth = viewer?.publishedTooth?.();
  document.querySelector("#visible-count").textContent = state.toothDetail
    ? "3D tooth & periodontium"
    : state.arches || state.age !== "adult"
      ? publishedArch
        ? "14 published lower teeth"
        : `${getDentitionFDIs(state.age).length} schematic teeth`
      : `${state.isolated ? 1 : atlas.parts.filter((p) => state.layers.has(p.group)).length} structures visible`;
  document.querySelector("#dental-3d-controls").hidden =
    !state.toothDetail || state.mode !== "3d";
  document.querySelector("#exit-tooth span").textContent =
    state.age === "adult" && !state.arches
      ? "Back to head & neck"
      : "Back to dental arches";
  document.querySelector("#age-notice").textContent = state.toothDetail
    ? publishedTooth
      ? publishedTooth.caption
      : state.perioFocus
        ? "Schematic periodontium · Gingiva, ligament, cementum and alveolar bone at the cervical third"
        : "Schematic tooth anatomy · Tissue thickness exaggerated for visibility"
    : state.age === "adult"
      ? state.arches
        ? publishedArch
          ? publishedArch.caption
          : "Permanent dentition · 32 teeth including third molars · Schematic arches"
        : "Adult male reference · Select a tooth, then zoom to reveal internal anatomy"
      : state.age === "child"
        ? "Primary dentition · 20 teeth · Schematic arches, not a pediatric head scan"
        : "Mixed dentition · 24-tooth example · Eruption and tooth count vary";
}

function showDetails(open = true) {
  document.body.classList.toggle("details-open", open);
  document
    .querySelector("#toggle-details")
    .setAttribute("aria-expanded", String(open));
  document.querySelector("#inspector").inert = !open;
}
const wideWindow = matchMedia("(min-width: 861px)");
wideWindow.addEventListener("change", (event) => showDetails(event.matches));

function inspectTooth(fdi = state.fdi, { periodontium = false } = {}) {
  state.explode = 0;
  state.fdi = fdi;
  state.perioFocus = periodontium;
  state.selected = partForTooth(atlas.parts,fdi)?.id || `tooth:${fdi}`;
  state.toothDetail = true;
  state.isolated = false;
  state.hiddenTissues.clear();
  setTab("dental");
  setMode("3d");
  document.querySelector("#inspector").scrollTop = 0;
  if (matchMedia("(max-width: 767px)").matches) showDetails(false);
  updateScene();
  if (periodontium) {
    state.cutaway = true;
    state.sectionDepth = 50;
    const cutaway = document.querySelector("#cutaway");
    if (cutaway) cutaway.checked = true;
    const depth = document.querySelector("#section-depth");
    if (depth) depth.value = "50";
  }
  document
    .querySelectorAll("[data-tissue3d]")
    .forEach((b) => b.setAttribute("aria-pressed", "true"));
  renderToothTissues();
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      viewer?.view("oblique", true);
      renderToothTissues();
    }),
  );
}

function setAge(age) {
  state.explode = 0;
  state.age = age;
  state.arches = true;
  state.fdi = age === "child" ? 75 : 36;
  state.selected = `tooth:${state.fdi}`;
  state.toothDetail = false;
  state.isolated = false;
  state.query = "";
  document.querySelector("#search").value = "";
  document.querySelector("#age").value = age;
  document.querySelector("#source-caption").textContent =
    "Schematic dental development model";
  setMode("3d");
  setTab("dental");
  renderBrowser();
  updateScene();
  requestAnimationFrame(() =>
    requestAnimationFrame(() => viewer?.view("oblique", true)),
  );
}

function clearSelection() {
  const wasDetail = state.toothDetail;
  state.selected = null;
  state.topic = "";
  state.isolated = false;
  state.toothDetail = false;
  if (!state.arches && state.tab === "dental") setTab("anatomy");
  setMode("3d");
  showDetails(false);
  renderBrowser();
  renderInspector();
  updateScene();
  if (wasDetail) requestAnimationFrame(()=>viewer?.view("oblique",state.arches));
}

function selectPart(id) {
  if (!id || (state.selected === id && !state.arches && !state.toothDetail)) {clearSelection();return;}
  const part = atlas.parts.find((p) => p.id === id);
  if (!part) return;
  if (state.age !== "adult") setAge("adult");
  state.arches = false;
  state.toothDetail = false;
  state.selected = id;
  // A muscle of mastication is already on its own. Turning its layer on would
  // bring the other 161 muscles with it, which is not what picking one asked
  // for.
  if (!(state.masticatory !== false && MASTICATORY.has(part.id)))
    state.layers.add(part.group);
  if (state.landmark) {
    state.landmark = null;
    viewer?.showLandmark(null);
  }
  showSeparation(false);
  if (touchLayout()) collapseLibrary();
  const fdi = toothNumber(part.name);
  if (fdi) {
    state.fdi = fdi;
    setTab("dental");
  } else {
    state.topic = topics.find((t) => t.match.test(part.name))?.id || "";
    if (state.tab === "dental") setTab("anatomy");
  }
  updateScene();
  renderBrowser();
  renderInspector();
  renderTeaching();
  showDetails();
  if (state.isolated) viewer?.view("oblique", true);
}

function renderBrowser() {
  if (state.arches || state.age !== "adult") {
    const primary = state.age === "child";
    document.querySelector("#browser").innerHTML =
      `<div class="section-label"><h3>${state.age === "adult" ? "Permanent" : primary ? "Primary" : "Mixed"} dentition</h3><span>${getDentitionFDIs(state.age).length}</span></div><p class="fine-print">${state.age === "adult" ? "A complete permanent dentition has 32 teeth including third molars. All teeth here are schematic; the separate adult head model contains 28 source tooth surfaces." : primary ? "A complete primary dentition has 20 teeth, with no premolars. This teaching model represents erupted teeth before shedding." : "This example combines permanent incisors and first molars with primary canines and molars. It is one stage, not a universal tooth count or age prediction."}</p><p class="fine-print">Primary teeth have relatively larger pulp chambers, thinner enamel and dentin, and more divergent molar roots. Jaw growth, developing tooth buds, root resorption, and pediatric muscles/vessels are not simulated.</p><button id="adult-anatomy" class="full-width">Explore adult head & neck</button><div class="structure-list">${getDentitionFDIs(
        state.age,
      )
        .filter((fdi) =>
          `${fdi} ${dentalProfile(fdi).fullName}`
            .toLowerCase()
            .includes(state.query.toLowerCase()),
        )
        .map(
          (fdi) =>
            `<button data-child-tooth="${fdi}" class="structure"><span>FDI ${fdi} · ${dentalProfile(fdi).name}</span>${icon("arrow")}</button>`,
        )
        .join(
          "",
        )}</div>${sourceLink(["AAPD: developing dentition", "https://www.aapd.org/globalassets/media/policies_guidelines/bp_developdentition.pdf"])}${sourceLink(["Primary tooth anatomy", "https://www.ncbi.nlm.nih.gov/books/NBK573074/"])}`;
    document.querySelector("#adult-anatomy").onclick = () => {
      setAge("adult");
      setTab("anatomy");
      viewer?.view();
    };
    document
      .querySelectorAll("[data-child-tooth]")
      .forEach(
        (b) => (b.onclick = () => inspectTooth(Number(b.dataset.childTooth))),
      );
    return;
  }
  const query = state.query.toLowerCase().trim();
  const inventory = state.explode >= 95;
  const matching = atlas.parts.filter((p) =>
    (!inventory || (state.isolated ? p.id === state.selected : state.layers.has(p.group))) && `${displayName(p)} ${p.id} ${p.conceptId} ${toothNumber(p.name) || ""}`
      .toLowerCase()
      .includes(query),
  );
  if (inventory) matching.sort((a,b) => TISSUE_ORDER.indexOf(tissueGroup(a)) - TISSUE_ORDER.indexOf(tissueGroup(b)) || displayName(a).localeCompare(displayName(b)));
  const structureRows = matching.map((p,index) => {
    const type = tissueGroup(p);
    const heading = inventory && (index === 0 || tissueGroup(matching[index-1]) !== type)
      ? `<h4 class="inventory-type" data-inventory-type="${type}">${escape(groups[type].name)}</h4>` : "";
    return `${heading}<button data-part="${p.id}" class="structure ${p.id === state.selected ? "selected" : ""} ${isSchematic(p) ? "is-schematic" : ""}"><span class="tiny-dot" style="background:${groups[p.group].color}"></span><span>${escape(displayName(p))}</span>${isSchematic(p) ? SCHEMATIC_BADGE : ""}${toothNumber(p.name) ? `<small>${toothNumber(p.name)}</small>` : ""}${icon("arrow")}</button>`;
  }).join("");
  const browser = document.querySelector("#browser");
  browser.innerHTML = `<div class="section-label"><h3>${query ? "Search results" : "Systems"}</h3><span>${matching.length}</span></div>${!query ? `<div class="layer-presets"><button data-preset="all">All</button><button data-preset="skeleton">Skeleton</button><button data-preset="vascular">Vessels</button><button data-preset="neuro">Nerves</button><button data-preset="none">Hide all</button></div><label class="layer schematic-switch"><span class="layer-dot schematic-dot"></span><span>Schematic structures</span><span class="layer-count">${atlas.parts.filter(isSchematic).length}</span><input type="checkbox" data-schematic ${state.schematic ? "checked" : ""} aria-label="Show schematic structures"></label><p class="fine-print schematic-note">Nerves, vessels, glands, the sinus and the joint disc that the source scan omits, drawn onto this skull.</p><label class="layer schematic-switch"><span class="layer-dot" style="background:${groups.muscles.color}"></span><span>Muscles of mastication</span><span class="layer-count">${atlas.parts.filter((p) => MASTICATORY.has(p.id)).length}</span><input type="checkbox" data-masticatory ${state.masticatory ? "checked" : ""} aria-label="Show the muscles of mastication"></label><p class="fine-print schematic-note">Masseter, temporalis, the pterygoids and buccinator stay on with the muscle layer off, because they are what this atlas is about.</p>` : ""}
    ${
      query
        ? ""
        : Object.entries(groups)
            .filter(([key]) => atlas.parts.some((p) => p.group === key))
            .map(
              ([key, g]) =>
                (() => {
                  const inGroup = atlas.parts.filter((p) => p.group === key);
                  const drawn = inGroup.filter(isSchematic).length;
                  return `<div class="layer"><button class="layer-name" data-solo="${key}" title="Show only ${g.name.toLowerCase()}"><span class="layer-dot" style="background:${g.color}"></span><span>${g.name}</span><span class="layer-count">${inGroup.length - drawn}${drawn ? `<i title="${drawn} schematic structures">+${drawn}</i>` : ""}</span></button><input type="checkbox" data-layer="${key}" ${state.layers.has(key) ? "checked" : ""} aria-label="Show ${g.name}"><input class="layer-fade" type="range" min="15" max="100" value="${Math.round(groupOpacity(key) * 100)}" data-opacity="${key}" aria-label="${g.name} opacity" title="Fade ${g.name.toLowerCase()} to see through them"></div>`;
                })(),
            )
            .join("")
    }
    ${!query && state.hidden.size ? `<div class="hidden-row"><span>${state.hidden.size} structure${state.hidden.size === 1 ? "" : "s"} hidden</span><button id="show-hidden">Show again</button></div>` : ""}
    ${!query ? `<p class="fine-print fade-note">Each slider fades that layer. Fading bone is how a nerve or vessel inside it becomes visible; a selected structure always stays solid.</p><div class="section-label"><h3>Structure library</h3><span>${atlas.parts.length}</span></div>` : ""}
    ${inventory ? `<div class="inventory-heading"><strong>Parts inventory · ${matching.length}</strong><p>Every visible structure is separated in the 3D view. Select a name below; zoom in to reassemble. Use All to include hidden systems.</p><button id="reassemble">Reassemble head & neck</button></div>` : ""}
    <details id="structure-library" ${query || inventory ? "open" : ""}><summary>${inventory ? "Names of displayed parts" : "Browse named structures"}</summary><div class="structure-list">${matching.length ? structureRows : '<p class="empty">No matching structure. Try “mandible”, “tongue”, or “36”.</p>'}</div></details>`;
  browser.querySelector("#reassemble")?.addEventListener("click", () => setExplosion(0));
  if (inventory) {
    browser.prepend(browser.querySelector("#structure-library"));
    browser.prepend(browser.querySelector(".inventory-heading"));
  }
  browser.querySelectorAll("[data-preset]").forEach(
    (b) =>
      (b.onclick = () => {
        state.layers = new Set(
          b.dataset.preset === "all"
            ? Object.keys(groups)
            : b.dataset.preset === "skeleton"
              ? ["bones", "neck", "teeth"]
              : b.dataset.preset === "vascular"
                ? ["arteries", "veins"]
                : b.dataset.preset === "neuro"
                  ? ["nerves", "bones", "teeth"]
                  : [],
        );
        state.toothDetail = false;
        state.isolated = false;
        updateScene();
        renderBrowser();
      }),
  );
  const schematicSwitch = browser.querySelector("[data-schematic]");
  if (schematicSwitch)
    schematicSwitch.onchange = () => {
      state.schematic = schematicSwitch.checked;
      updateScene();
      renderBrowser();
    };
  browser.querySelectorAll("[data-solo]").forEach(
    (button) =>
      (button.onclick = () => {
        state.layers = new Set([button.dataset.solo]);
        state.isolated = false;
        state.toothDetail = false;
        updateScene();
        renderBrowser();
      }),
  );
  browser.querySelectorAll("[data-layer]").forEach(
    (input) =>
      (input.onchange = () => {
        state.isolated = false;
        state.toothDetail = false;
        input.checked
          ? state.layers.add(input.dataset.layer)
          : state.layers.delete(input.dataset.layer);
        updateScene();
        if (inventory) renderBrowser();
      }),
  );
  browser
    .querySelectorAll("[data-part]")
    .forEach(
      (button) => (button.onclick = () => selectPart(button.dataset.part)),
    );
  const showHidden = browser.querySelector("#show-hidden");
  if (showHidden)
    showHidden.onclick = () => {
      state.hidden.clear();
  state.masticatory = true;
      renderBrowser();
      updateScene();
    };
  const masticatory = browser.querySelector("[data-masticatory]");
  if (masticatory)
    masticatory.onchange = () => {
      state.masticatory = masticatory.checked;
      updateScene();
    };
  browser.querySelectorAll("[data-opacity]").forEach((slider) => {
    slider.oninput = () => {
      const value = Number(slider.value) / 100;
      if (value >= 1) state.opacity.delete(slider.dataset.opacity);
      else state.opacity.set(slider.dataset.opacity, value);
      updateScene();
    };
  });
}

function setExplosion(progress) {
  const wasInventory = state.explode >= 95;
  state.explode = Math.round(Math.max(0, Math.min(100, progress)));
  const input = document.querySelector("#explode");
  if (input) input.value = String(state.explode);
  const output = document.querySelector("#explode-output");
  if (output) output.value = `${state.explode}%`;
  if (state.explode > 0 && touchLayout()) showSeparation(true);
  updateScene();
  if (wasInventory !== (state.explode >= 95)) {
    renderBrowser();
    document.querySelector("#browser").scrollTop = 0;
    document.querySelector("#mobile-library span").textContent = state.explode >= 95 ? "Parts inventory" : "Layers";
    if (touchLayout()) {
      document.querySelector(".sidebar").classList.toggle("expanded", state.explode >= 95);
      document.querySelector("#mobile-library").setAttribute("aria-expanded", String(state.explode >= 95));
    }
  }
}

function sourceLink(source) {
  return `<a class="source-link" target="_blank" rel="noreferrer" href="${source[1]}">${source[0]} ↗</a>`;
}
function heading(title, subtitle, tag = "Anatomy notes") {
  return `<div class="detail-heading"><span class="detail-tag">${tag}</span><h2>${title}</h2><p>${subtitle}</p></div>`;
}

function renderInspector() {
  const panel = document.querySelector("#inspector");
  if (state.tab === "dental") return renderDental(panel);
  if (state.tab === "quiz") return renderQuiz(panel);
  if (state.tab === "study") {
    panel.innerHTML =
      heading(
        "Learn by region.",
        "Short explorations to connect structure with practice.",
        "Study guide",
      ) +
      `<div class="study-list">${topics.map((t) => `<button data-topic="${t.id}"><span>${icon(t.id === "dentition" ? "tooth" : "book")}</span><div><strong>${t.title}</strong><small>${t.subtitle}</small></div>${icon("arrow")}</button>`).join("")}<button id="open-development"><span>${icon("tooth")}</span><div><strong>How a tooth develops</strong><small>Odontogenesis, chronology &amp; developmental anomalies</small></div>${icon("arrow")}</button></div><div class="detail-body clinical-library"><h3>Clinical anatomy reference</h3>${clinicalLibrary.map((item) => `<details><summary>${item.title}</summary>${item.sections.map(([title, text]) => `<h3>${title}</h3><p>${text}</p>`).join("")}${sourceLink(item.source)}</details>`).join("")}</div><div class="note"><h3>Your saved structures</h3>${
        state.saved.size
          ? atlas.parts
              .filter((p) => state.saved.has(p.id))
              .map(
                (p) =>
                  `<button class="text-button" data-part="${p.id}">${escape(displayName(p))}</button>`,
              )
              .join("")
          : "<p>Save a structure from its anatomy notes to revisit it here.</p>"
      }</div>`;
    panel.querySelector("#open-development").onclick = () => {
      setTab("dental");
      setMode("development");
    };
    panel.querySelectorAll("[data-topic]").forEach(
      (b) =>
        (b.onclick = () => {
          const t = topics.find((t) => t.id === b.dataset.topic);
          state.topic = t.id;
          state.isolated = false;
          state.layers = new Set(
            t.id === "floor" ? ["soft", "glands"] : ["bones", "teeth"],
          );
          selectPart(atlas.parts.find((p) => t.match.test(p.name)).id);
          if (t.id !== "dentition") {
            setTab("anatomy");
            state.topic = t.id;
            renderInspector();
          }
          viewer?.view("oblique", true);
        }),
    );
    panel.querySelectorAll("[data-part]").forEach(
      (b) =>
        (b.onclick = () => {
          setTab("anatomy");
          selectPart(b.dataset.part);
        }),
    );
    return;
  }
  const part = atlas.parts.find((p) => p.id === state.selected);
  if (!part) {
    panel.innerHTML = heading("Select a structure", "Click the model or choose a named structure from the library.");
    return;
  }
  const topic = topics.find((t) => t.id === state.topic);
  if (isSchematic(part)) {
    panel.innerHTML =
      heading(
        escape(displayName(part)),
        `${groups[part.group].name} · schematic teaching geometry`,
        "Schematic anatomy",
      ) +
      `<div class="detail-body">
      <div class="detail-actions"><button class="primary" id="detail-isolate">${icon("expand")} ${state.isolated ? "Restore" : "Inspect in 3D"}</button><button id="save">${state.saved.has(part.id) ? "✓ Saved" : "+ Save"}</button><button data-clear-selection>Clear selection</button></div>
      <h3>Overview</h3><p>${escape(part.note)}</p>
      <div class="learning-note schematic-callout"><span>How this was made</span><p>BodyParts3D 4.0 contains no maxillary or mandibular division of the trigeminal nerve, no facial nerve, no external carotid branches, no parotid gland, no paranasal sinus, and no articular disc. This structure is drawn instead, with its course fitted to landmarks measured on this assembly's own meshes: the tooth apices, the mandibular and mental foramina, the maxilla, and the condyle. Caliber and course are representative of typical anatomy, not a segmentation and not a patient.</p></div>
      <h3>Explore the relationships</h3><p>Fade the surrounding layer with its slider in the layers panel to follow this structure through the jaws, or isolate it to see its whole course.</p>
      <p class="fine-print">Educational reference. Not for diagnosis, anesthesia planning, or surgical planning. Individual anatomy varies, and variation in these structures is common.</p></div>`;
    panel.querySelector("#detail-isolate").onclick = toggleIsolate;
    panel.querySelector("#save").onclick = () => {
      state.saved.has(part.id)
        ? state.saved.delete(part.id)
        : state.saved.add(part.id);
      localStorage.setItem("omf-saved", JSON.stringify([...state.saved]));
      renderInspector();
    };
    panel
      .querySelectorAll("[data-clear-selection]")
      .forEach((b) => (b.onclick = clearSelection));
    return;
  }
  panel.innerHTML =
    heading(
      escape(displayName(part)),
      `${groups[part.group].name} · ${part.conceptId}`,
    ) +
    `<div class="detail-body">
    <div class="detail-actions"><button class="primary" id="detail-isolate">${icon("expand")} ${state.isolated ? "Restore" : "Inspect in 3D"}</button><button id="save">${state.saved.has(part.id) ? "✓ Saved" : "+ Save"}</button><button id="hide-part">Hide</button><button data-clear-selection>Clear selection</button></div>
    ${topic ? `<h3>Overview</h3><p>${topic.overview}</p><div class="learning-note"><span>Study focus</span><p>${[topic.student, topic.dentist, topic.specialist].filter(Boolean).join(" ")}</p></div><h3>Explore the relationships</h3><p>Rotate the assembly, fade a layer with its slider, or isolate a structure to examine its surfaces.</p>${sourceLink(sources[topic.source])}` : `<h3>Explore this structure</h3><p>This named surface mesh is part of the ${groups[part.group].name.toLowerCase()} layer. Compare its position with adjacent structures or isolate it for inspection.</p><div class="learning-note"><span>Reference identity</span><p>BodyParts3D mesh ${part.id}, mapped to ${part.conceptId}. Detailed clinical notes for this structure have not yet been authored.</p></div>`}
    ${landmarkBlock(part)}
    <div class="related"><h3>Continue exploring</h3>${atlas.parts
      .filter((p) => p.group === part.group && p.id !== part.id)
      .slice(0, 3)
      .map(
        (p) =>
          `<button data-part="${p.id}">${escape(displayName(p))}${icon("arrow")}</button>`,
      )
      .join(
        "",
      )}</div><p class="fine-print">Adult reference anatomy. Individual form and relationships vary.</p></div>`;
  panel.querySelector("#detail-isolate").onclick = toggleIsolate;
  panel.querySelector("#hide-part").onclick = () => {
    state.hidden.add(part.id);
    state.isolated = false;
    clearSelection();
    renderBrowser();
  };
  const landmark = panel.querySelector("#landmark");
  if (landmark)
    landmark.onchange = () => {
      state.landmark = landmark.value || null;
      viewer?.showLandmark(state.landmark);
      renderInspector();
    };
  panel.querySelector("#save").onclick = () => {
    state.saved.has(part.id)
      ? state.saved.delete(part.id)
      : state.saved.add(part.id);
    try {
      localStorage.setItem("omf-saved", JSON.stringify([...state.saved]));
    } catch {}
    renderInspector();
  };
  panel
    .querySelectorAll("[data-part]")
    .forEach((b) => (b.onclick = () => selectPart(b.dataset.part)));
}

/* The anchors the schematic structures are built from, offered by name on the
   bone they were measured on. Each option carries the rule that produced it. */
/* The patient axes, drawn where they point on screen. Left and right in this
   atlas are the patient's, which is the convention the landmark names and the
   schematic sides both use, and it is the one thing about a head on a screen
   that a reader cannot work out by looking. */
const AXIS_LABELS = {
  left: ["L", "R", "#5b7f9c"],
  superior: ["S", "I", "#8a7fa8"],
  anterior: ["A", "P", "#9c7f5b"],
};
let orientationFrame = 0;
function drawOrientation(axes) {
  // Once every few frames is enough for a 44px gizmo and keeps a drag cheap.
  if (orientationFrame++ % 3) return;
  const host = document.querySelector("#orientation-axes");
  if (!host) return;
  const arms = [];
  for (const [key, [positive, negative, color]] of Object.entries(AXIS_LABELS)) {
    const [x, y, z] = axes[key] || [0, 0, 0];
    // Screen y grows downward; z is toward the reader and only sets the order.
    for (const sign of [1, -1]) {
      const at = [x * sign * 32, -y * sign * 32];
      arms.push({
        depth: z * sign,
        markup: `<line x1="0" y1="0" x2="${at[0].toFixed(1)}" y2="${at[1].toFixed(1)}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" opacity="${sign > 0 ? 1 : 0.34}"/><text x="${(at[0] * 1.32).toFixed(1)}" y="${(at[1] * 1.32 + 3.6).toFixed(1)}" fill="${color}" font-size="11" font-weight="600" text-anchor="middle" opacity="${sign > 0 ? 1 : 0.42}">${sign > 0 ? positive : negative}</text>`,
      });
    }
  }
  arms.sort((a, b) => a.depth - b.depth);
  host.innerHTML = arms.map((a) => a.markup).join("");
}

const MODEL_GROUP_ORDER = ["bone", "tooth", "pdl", "pulp", "appliance"];
function renderModelControls() {
  const host = document.querySelector("#model-controls");
  const view = MODEL_VIEWS[state.modelView];
  const present = viewer?.modelGroups?.(state.modelView) || MODEL_GROUP_ORDER;
  host.innerHTML = `<div class="model-choice">${Object.values(MODEL_VIEWS)
    .map(
      (v) =>
        `<button data-model-view="${v.id}" class="${v.id === state.modelView ? "active" : ""}">${v.name}</button>`,
    )
    .join("")}</div>
    <p class="model-note">${escape(view.note)}</p>
    <div class="model-layers">${MODEL_GROUP_ORDER.filter((key) => present.includes(key))
      .map((key) => {
        const on = !state.hiddenTissues.has(key);
        const fade = Math.round((state.opacity.get(`model-${key}`) ?? 1) * 100);
        return `<div class="layer"><button class="layer-name" data-model-solo="${key}"><span class="layer-dot" style="background:${MODEL_GROUPS[key].color}"></span><span>${MODEL_GROUPS[key].name}</span></button><input type="checkbox" data-model-layer="${key}" ${on ? "checked" : ""} aria-label="Show ${MODEL_GROUPS[key].name}"><input class="layer-fade" type="range" min="15" max="100" value="${fade}" data-model-opacity="${key}" aria-label="${MODEL_GROUPS[key].name} opacity"></div>`;
      })
      .join("")}</div>
    <p class="fine-print">${escape(view.limits)}</p>
    <p class="fine-print model-credit">${escape(view.caption)} · ${escape(view.license)}. Redistributed as modeled, not registered onto this skull. <button id="model-sources">Sources and method</button></p>`;
  host.querySelectorAll("[data-model-view]").forEach((button) => {
    button.onclick = () => {
      state.modelView = button.dataset.modelView;
      state.hiddenTissues = new Set();
      renderModelControls();
      updateScene();
      requestAnimationFrame(() => viewer?.view("oblique", true));
    };
  });
  host.querySelectorAll("[data-model-layer]").forEach((box) => {
    box.onchange = () => {
      const key = box.dataset.modelLayer;
      box.checked ? state.hiddenTissues.delete(key) : state.hiddenTissues.add(key);
      updateScene();
    };
  });
  host.querySelectorAll("[data-model-solo]").forEach((button) => {
    button.onclick = () => {
      const key = button.dataset.modelSolo;
      const only = state.hiddenTissues.size === present.length - 1 && !state.hiddenTissues.has(key);
      state.hiddenTissues = new Set(only ? [] : present.filter((g) => g !== key));
      renderModelControls();
      updateScene();
    };
  });
  host.querySelectorAll("[data-model-opacity]").forEach((slider) => {
    slider.oninput = () => {
      const value = Number(slider.value) / 100;
      const key = `model-${slider.dataset.modelOpacity}`;
      if (value >= 1) state.opacity.delete(key);
      else state.opacity.set(key, value);
      updateScene();
    };
  });
  host.querySelector("#model-sources").onclick = () => modelSources();
}

function renderToothTissues() {
  const published = viewer?.publishedTooth?.();
  const host = document.querySelector(".tissue-3d-buttons");
  const status = document.querySelector("#tissue-3d-status");
  if (!host) return;
  if (!published) {
    document.querySelector("#dental-3d-controls")?.classList.remove("published");
    return;
  }
  document.querySelector("#dental-3d-controls")?.classList.add("published");
  // Two of the three sets do not record which of their axes is buccolingual
  // and which is mesiodistal, so their planes keep the names of the model's
  // own frame; the third publishes each tooth's axes and its planes are named
  // for the section they leave behind.
  const cuts = published.cuts;
  if (cuts) {
    for (const button of document.querySelectorAll("[data-cut-axis]")) {
      const span = button.querySelector("span");
      if (span) span.textContent = cuts[button.dataset.cutAxis];
    }
    const note = document.querySelector(".cut-controls .fine-print");
    if (note) note.textContent = cuts.note;
  }
  host.innerHTML = published.tissues
    .map(
      (tissue) =>
        `<button data-tissue3d="${tissue.id}" aria-pressed="${!state.hiddenTissues.has(tissue.id)}">${tissue.name}</button>`,
    )
    .join("");
  host.querySelectorAll("[data-tissue3d]").forEach((button) => {
    button.onclick = () => {
      const id = button.dataset.tissue3d;
      state.hiddenTissues.has(id)
        ? state.hiddenTissues.delete(id)
        : state.hiddenTissues.add(id);
      button.setAttribute("aria-pressed", String(!state.hiddenTissues.has(id)));
      updateScene();
    };
  });
  if (status)
    status.innerHTML = `<strong>${escape(published.note)}</strong><span>${escape(published.limits)}</span><button id="tooth-model-sources">Sources and method</button>`;
  status.querySelector("#tooth-model-sources").onclick = () => modelSources();
}

function landmarkBlock(part) {
  const found = (viewer?.landmarks() || []).filter((l) => l.bone === part.id);
  if (!found.length) return "";
  const active = found.find((l) => l.id === state.landmark);
  return `<div class="landmark-block"><h3>Landmarks on this bone</h3>
    <label class="landmark-pick"><span>Pin a named point</span><select id="landmark"><option value="">No landmark</option>${found
      .map(
        (l) =>
          `<option value="${l.id}" ${l.id === state.landmark ? "selected" : ""}>${escape(l.name)}</option>`,
      )
      .join("")}</select></label>
    ${active ? `<p class="landmark-method"><span>How this point was found</span>${escape(active.method)}</p>` : ""}
    <p class="fine-print">${found.length} points, each located by searching this mandible's own vertices rather than typed in; ${found.filter((l) => l.vertex).length} are a vertex of the mesh and the rest are composed from measured points, which is what each rule above says. Left and right are the patient's. They mark where a named feature falls on this mesh: they are not boundaries, and they are not clinically validated positions. The schematic nerves and vessels are fitted to these same anchors.</p></div>`;
}

function renderDental(panel) {
  const tooth = dentalProfile(state.fdi),
    part = partForTooth(atlas.parts, state.fdi);
  const rows =
    state.age === "mixed"
      ? [
          [16, 55, 54, 53, 12, 11, 21, 22, 63, 64, 65, 26],
          [46, 85, 84, 83, 42, 41, 31, 32, 73, 74, 75, 36],
        ]
      : tooth.primary
        ? [
            [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
            [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
          ]
        : [
            [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
            [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
          ];
  panel.innerHTML =
    heading(
      "Dental anatomy",
      "Select a tooth, then zoom in or open its 3D cutaway.",
      "Dental atlas",
    ) +
    `<div class="dentition-switch">${[
      ["adult", "Adult · 32"],
      ["child", "Child · 20"],
      ["mixed", "Mixed · example"],
    ]
      .map(
        ([id, label]) =>
          `<button data-dentition="${id}" class="${state.age === id ? "active" : ""}">${label}</button>`,
      )
      .join(
        "",
      )}</div><div class="dental-chart"><div class="chart-orientation"><span>Patient’s right</span><span>Patient’s left</span></div>${rows.map((row, i) => `<div class="tooth-row ${tooth.primary ? "primary-row" : ""}">${row.map((n) => `<button data-tooth="${n}" aria-label="FDI ${n}, ${dentalProfile(n).fullName}" aria-pressed="${n === state.fdi}" class="${n === state.fdi ? "active" : ""}" title="${dentalProfile(n).fullName}">${icon("tooth")}<span>${n}</span></button>`).join("")}</div>${i === 0 ? '<div class="arch-divider"><span>Upper</span><span>Lower</span></div>' : ""}`).join("")}<small>FDI notation · ${state.age === "adult" ? "28 source surfaces; 32 schematic tooth models" : "Schematic developmental dentition"}</small></div>
    <div class="tooth-heading"><span class="fdi-badge">${tooth.fdi}</span><div><h2>${tooth.name}</h2><p>${tooth.upper ? "Maxillary" : "Mandibular"} ${tooth.right ? "right" : "left"} · Universal #${tooth.universal}</p></div></div>
    <div class="dental-tabs">${[
      ["morphology", "Tooth"],
      ["canals", "Root canals"],
      ["tissues", "Tissues"],
      ["perio", "Gums"],
      ["clinical", "Clinical"],
    ]
      .map(
        ([id, title]) =>
          `<button data-dental-tab="${id}" class="${state.dentalTab === id ? "active" : ""}">${title}</button>`,
      )
      .join("")}</div>
    <div class="detail-body"><button id="tooth-isolate" class="primary full-width">Open 3D tooth cutaway</button><button id="show-arches" class="full-width">Show ${state.age === "adult" ? "one patient's own jaws" : `the complete ${state.age === "child" ? "20-tooth" : "mixed"} arches`}</button>${state.age === "adult" ? '<button id="show-drawn-arches" class="full-width">Show the drawn 32-tooth arches</button>' : ""}<label class="fine-print"><input id="auto-detail" type="checkbox" ${state.autoDetail ? "checked" : ""}> Reveal internal anatomy when zooming into a tooth</label><p class="fine-print">3D tissues and root canals are schematic teaching models, not reconstructed from the external surface. ${tooth.primary ? "Primary proportions and root divergence differ from permanent teeth." : "Representative root and canal forms vary between patients."}</p>
    ${dentalContent(tooth)}
    <details class="references"><summary>References for this tooth</summary>${dentalSources.map(sourceLink).join("")}</details></div>`;
  if (!state.selected) panel.querySelectorAll("[data-tooth]").forEach((button) => {
    button.classList.remove("active");
    button.setAttribute("aria-pressed", "false");
  });
  panel.querySelectorAll("[data-tooth]").forEach(
    (b) =>
      (b.onclick = () => {
        if (state.selected && state.fdi === Number(b.dataset.tooth)) { clearSelection(); return; }
        state.fdi = Number(b.dataset.tooth);
        const p = partForTooth(atlas.parts, state.fdi);
        if (state.toothDetail || state.arches || state.age !== "adult" || !p) {
          inspectTooth(state.fdi);
        } else if (p) {
          state.selected = p.id;
          state.layers.add("teeth");
          updateScene();
          renderBrowser();
          if (state.isolated) viewer?.view("oblique", true);
        }
        renderDental(panel);
        renderTeaching();
      }),
  );
  panel.querySelectorAll("[data-dentition]").forEach(
    (b) =>
      (b.onclick = () => {
        setAge(b.dataset.dentition);
      }),
  );
  panel.querySelectorAll("[data-dental-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        state.dentalTab = b.dataset.dentalTab;
        renderDental(panel);
        if (["canals", "tissues", "perio"].includes(state.dentalTab))
          inspectTooth();
      }),
  );
  panel.querySelector("#tooth-isolate").onclick = () => inspectTooth();
  panel.querySelector("#show-arches").onclick = () => {
    state.archSource = "published";
    setAge(state.age);
  };
  panel.querySelector("#show-drawn-arches")?.addEventListener("click", () => {
    state.archSource = "drawn";
    setAge(state.age);
  });
  panel.querySelector("#auto-detail").onchange = (e) => {
    state.autoDetail = e.target.checked;
    updateScene();
  };
  panel
    .querySelectorAll("[data-open-mode]")
    .forEach((b) => (b.onclick = () => setMode(b.dataset.openMode)));
}

function dentalContent(tooth) {
  const entries = (list) =>
    list.map(([a, b]) => `<h3>${a}</h3><p>${b}</p>`).join("");
  if (state.dentalTab === "morphology")
    return `<div class="tooth-facts"><div><small>Typical eruption</small><strong>${tooth.eruption} ${tooth.unit}</strong></div><div><small>Root pattern</small><strong>${tooth.roots}</strong></div></div>${tooth.primary ? `<p class="fine-print">Typical shedding: ${tooth.shed} years.</p>` : ""}<p class="fine-print">Eruption varies between individuals. These are typical patterns, not measurements of this mesh.</p><h3>Crown & root study</h3><p>${tooth.morphology}</p><h3>Orient the tooth</h3><dl>${dentalSections.surfaces.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl><h3>Identification check</h3><p>FDI ${tooth.fdi}: quadrant ${tooth.quadrant}, position ${tooth.position} from the midline. Universal notation: ${tooth.universal}.</p>`;
  if (state.dentalTab === "canals") {
    const endo = endoProfile(tooth);
    return `<div class="tooth-facts"><div><small>Typical canals</small><strong>${endo.canals}</strong></div><div><small>Root arrangement</small><strong>${endo.roots.join(", ")}</strong></div></div><h3>Pulp chamber & pathways</h3><p>${endo.chamber}</p><div class="learning-note"><span>Variation to recognize</span><p>${endo.variant}</p></div>${sourceLink(endoSources[endo.source])}<button data-open-mode="canals" class="full-width">Open the canal explorer</button><h3>Internal anatomy vocabulary</h3>${entries(canalGlossary)}${sourceLink(endoSources.standards)}${sourceLink(endoSources.cShape)}`;
  }
  if (state.dentalTab === "tissues")
    return `<button data-open-mode="section" class="full-width">Explore the labeled tooth section</button><p class="fine-print">The interactive diagram shows tissue relationships in a generic single-rooted tooth. It is separate from the external 3D meshes.</p>${entries(dentalSections.tissues)}`;
  if (state.dentalTab === "perio")
    return `<button data-open-mode="section" class="full-width">Explore the periodontium</button>${entries(periodontalDetails)}<h3>Connect anatomy to examination</h3>${entries(perioStudy)}${perioSources.map(sourceLink).join("")}`;
  return `<p class="fine-print">How this tooth connects to each part of practice.</p>${entries(specialtyNotes(tooth))}`;
}

function setMode(mode) {
  state.mode = mode;
  const scene3d = mode === "3d" || mode === "models";
  document.body.classList.toggle("teaching", !scene3d);
  document.body.classList.toggle("source-models", mode === "models");
  document.querySelector("#viewer").hidden = !scene3d;
  document.querySelector("#teaching-view").hidden = scene3d;
  document
    .querySelectorAll("[data-mode]")
    .forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  /* A phone has one column, so the teaching layer and the notes sheet would
     be drawn over each other. The teaching layer is what was just asked for;
     the Details button reopens the notes over it. */
  if (!scene3d && touchLayout()) showDetails(false);
  if (mode === "models") {
    state.hiddenTissues = new Set();
    renderModelControls();
    updateScene();
    requestAnimationFrame(() => viewer?.view("oblique", true));
  }
  document.querySelector("#model-controls").hidden = mode !== "models";
  renderTeaching();
  if (atlas) updateScene();
}

function renderDevelopment(host) {
  const stage = stages.find((s) => s.id === state.stage) || stages[2];
  const faults = anomalies[stage.id] || [];
  host.innerHTML = `<div class="teaching-intro"><strong>How a tooth develops</strong><span>Odontogenesis · Select a stage to follow it through</span></div>
  <div class="stage-track" role="tablist" aria-label="Stages of tooth development">${stages
    .map(
      (s, index) =>
        `<button role="tab" aria-selected="${s.id === stage.id}" data-stage="${s.id}" class="${s.id === stage.id ? "active" : ""}"><span class="stage-index">${index + 1}</span><strong>${escape(s.name)}</strong><small>${escape(s.when)}</small></button>`,
    )
    .join("")}</div>
  ${toothGermDiagram(stage.id)}
  <div class="stage-explanation" role="status"><strong>${escape(stage.name)}</strong><p>${escape(stage.summary)}</p><p>${escape(stage.detail)}</p><p class="fine-print">Derived from: ${escape(stage.origin)}.</p></div>
  ${faults.length ? `<div class="detail-body stage-faults"><h3>What goes wrong at this stage</h3>${faults.map(([name, text]) => `<div class="fault"><strong>${escape(name)}</strong><p>${escape(text)}</p></div>`).join("")}</div>` : ""}
  <div class="detail-body"><h3>Where each tissue comes from</h3><div class="origin-table" role="table">${tissueOrigins
    .map(
      ([tissue, germLayer, note]) =>
        `<div role="row"><span role="cell"><strong>${escape(tissue)}</strong></span><span role="cell" class="germ-layer">${escape(germLayer)}</span><span role="cell">${escape(note)}</span></div>`,
    )
    .join("")}</div>
  <h3>Chronology</h3><p class="fine-print">Population ranges as usually taught. Individual timing varies widely, and a single child is not late because a tooth is outside a range.</p>
  ${chronology
    .map(
      (table) =>
        `<h4 class="chronology-title">${escape(table.dentition)} dentition</h4><div class="chronology" role="table"><div role="row" class="chronology-head">${table.columns.map((c) => `<span role="columnheader">${escape(c)}</span>`).join("")}</div>${table.rows.map((row) => `<div role="row">${row.map((cell, i) => `<span role="cell"${i === 0 ? ' class="chronology-tooth"' : ""}>${escape(cell)}</span>`).join("")}</div>`).join("")}</div>`,
    )
    .join("")}
  <h3>Sources</h3>${embryologySources.map(sourceLink).join("")}</div>`;
  host.querySelectorAll("[data-stage]").forEach(
    (button) =>
      (button.onclick = () => {
        state.stage = button.dataset.stage;
        renderTeaching();
        host.scrollTop = 0;
      }),
  );
}

function renderTeaching() {
  if (state.mode === "3d") return;
  const host = document.querySelector("#teaching-view");
  if (state.mode === "section") {
    const tissue = tissues.find((t) => t.id === state.tissue);
    host.innerHTML = `<div class="teaching-intro"><strong>The tooth and its supporting tissues</strong><span>Teaching diagram · Select a tissue to explore</span></div>${toothSection(state.tissue, state.tissueLayers)}<div class="tissue-controls">${tissues.map((t) => `<button data-select-tissue="${t.id}" class="${t.id === state.tissue ? "active" : ""}"><span style="background:${t.color}"></span>${t.name}</button>`).join("")}</div><div class="tissue-explanation" role="status"><strong>${tissue.name}</strong><p>${tissue.text}</p><label><input id="tissue-visible" type="checkbox" ${state.tissueLayers.has(tissue.id) ? "checked" : ""}> Show this tissue in the section</label></div>`;
    host.querySelectorAll("[data-select-tissue], [data-tissue]").forEach(
      (b) =>
        (b.onclick = () => {
          state.tissue = b.dataset.selectTissue || b.dataset.tissue;
          renderTeaching();
        }),
    );
    host.querySelector("#tissue-visible").onchange = (e) => {
      e.target.checked
        ? state.tissueLayers.add(tissue.id)
        : state.tissueLayers.delete(tissue.id);
      renderTeaching();
    };
    return;
  }
  if (state.mode === "development") return renderDevelopment(host);
  const tooth = dentalProfile(state.fdi),
    endo = endoProfile(tooth),
    pattern = canalPatterns[state.pattern];
  const locations =
    endo.map.length === 1
      ? [[150, 110]]
      : endo.map.length === 2
        ? [
            [150, 65],
            [150, 160],
          ]
        : endo.map.length === 3
          ? [
              [92, 70],
              [92, 150],
              [210, 110],
            ]
          : [
              [80, 65],
              [110, 110],
              [210, 70],
              [165, 175],
            ];
  const molar = tooth.position >= 6;
  host.innerHTML = `<div class="teaching-intro"><strong>FDI ${tooth.fdi} · ${tooth.fullName}</strong><span>Conceptual canal map · Not an access preparation guide</span></div><div class="canal-workbench"><div class="canal-map"><h3>Example canal arrangement</h3>${endo.map.length ? `<svg viewBox="0 0 300 240" role="img" aria-label="Conceptual canal arrangement: ${endo.map.join(", ")}"><path d="M50 45Q150 5 250 45Q285 110 250 185Q150 225 50 185Q15 110 50 45Z" fill="#e6cc98" stroke="#bcab86" stroke-width="2"/><path d="M80 67Q150 35 220 67Q250 110 220 163Q150 195 80 163Q50 110 80 67Z" fill="#b77f76" opacity=".2"/>${endo.map.map((name, i) => `<circle cx="${locations[i][0]}" cy="${locations[i][1]}" r="10" fill="#a34454"/><text x="${locations[i][0] + 15}" y="${locations[i][1] + 5}" font-size="13" fill="#4c5663">${name}</text>`).join("")}<text x="150" y="20" text-anchor="middle" font-size="10" fill="#708897">Buccal</text><text x="150" y="233" text-anchor="middle" font-size="10" fill="#708897">${tooth.upper ? "Palatal" : "Lingual"}</text>${molar ? '<text x="13" y="115" font-size="9" fill="#708897">M</text><text x="278" y="115" font-size="9" fill="#708897">D</text>' : ""}</svg>` : '<p class="empty">No fixed canal map is provided for this tooth. Study the anatomy notes below.</p>'}<p>${endo.chamber}</p><small>B: buccal · L: lingual · M: mesial · D: distal · P: palatal</small></div><div class="pattern-map"><h3>${pattern.name} <span>${pattern.sequence}</span></h3><svg viewBox="0 0 180 210" role="img" aria-label="${pattern.name}: ${pattern.description}"><path d="M35 12Q90 0 145 12L133 168Q120 205 90 207Q60 205 47 168Z" fill="#e6cc98" stroke="#bcab86" stroke-width="1"/><g fill="none" stroke="#ad4b5c" stroke-width="7" stroke-linecap="round">${pattern.paths.map((d) => `<path d="${d}"/>`).join("")}</g></svg><p>${pattern.description}</p></div></div><div class="pattern-controls" aria-label="Explore Vertucci canal configurations">${canalPatterns.map((p, i) => `<button data-pattern="${i}" class="${state.pattern === i ? "active" : ""}">${p.name}<small>${p.sequence}</small></button>`).join("")}</div><div class="tissue-explanation"><strong>Trace from the chamber to the canal exits.</strong><p>Vertucci types describe pathways within a root. They do not predict the selected tooth’s anatomy, and they do not capture every isthmus, branch, or complex configuration.</p>${sourceLink(["Vertucci (1984): root canal anatomy", "https://pubmed.ncbi.nlm.nih.gov/6595621/"])}${sourceLink(endoSources[endo.source])}</div>`;
  host.querySelectorAll("[data-pattern]").forEach(
    (b) =>
      (b.onclick = () => {
        state.pattern = Number(b.dataset.pattern);
        renderTeaching();
      }),
  );
}

function renderQuiz(panel) {
  if (state.quiz >= questions.length) {
    const score = state.answers.filter(
      (a, i) => a === questions[i].answer,
    ).length;
    panel.innerHTML =
      heading(
        "Session complete.",
        "Review what you learned, then explore the anatomy again.",
        "Self-test",
      ) +
      `<div class="detail-body"><div class="score">${score}<span> / ${questions.length}</span></div>${questions.map((q, i) => `<div class="quiz-review"><strong>${state.answers[i] === q.answer ? "✓" : "×"} ${q.prompt}</strong><p>${q.why}</p></div>`).join("")}<button class="primary" id="restart">Try again</button></div>`;
    panel.querySelector("#restart").onclick = () => {
      state.quiz = 0;
      state.answers = [];
      renderQuiz(panel);
    };
    return;
  }
  const q = questions[state.quiz],
    answered = state.answers[state.quiz] !== undefined;
  panel.innerHTML =
    heading(
      "Put anatomy into practice.",
      "Six questions. Immediate explanations.",
      "Self-test",
    ) +
    `<div class="detail-body"><div class="quiz-progress"><span>Question ${state.quiz + 1} of ${questions.length}</span><progress value="${state.quiz}" max="${questions.length}"></progress></div><h2 class="question">${q.prompt}</h2><div class="answers">${q.choices.map((c, i) => `<button data-answer="${i}" ${answered ? "disabled" : ""} class="${answered && i === q.answer ? "correct" : answered && i === state.answers[state.quiz] ? "incorrect" : ""}"><span>${String.fromCharCode(65 + i)}</span>${c}</button>`).join("")}</div>${answered ? `<div role="status" class="learning-note"><strong>${state.answers[state.quiz] === q.answer ? "Correct." : "Not quite."}</strong><p>${q.why}</p>${sourceLink(sources[topics.find((t) => t.id === q.topic).source])}</div><button class="primary full-width" id="next">${state.quiz === questions.length - 1 ? "See results" : "Next question"}</button>` : '<p class="fine-print">Choose one answer to reveal the explanation.</p>'}</div>`;
  panel.querySelectorAll("[data-answer]").forEach(
    (b) =>
      (b.onclick = () => {
        state.answers[state.quiz] = Number(b.dataset.answer);
        renderQuiz(panel);
      }),
  );
  if (answered)
    panel.querySelector("#next").onclick = () => {
      state.quiz++;
      renderQuiz(panel);
    };
}

function setTab(tab) {
  state.tab = tab;
  if (tab !== "dental") state.toothDetail = false;
  if (tab === "anatomy") {
    state.arches = false;
    document.querySelector("#source-caption").textContent =
      "BodyParts3D 4.0 · Adult reference";
    if (atlas) renderBrowser();
  }
  // Every tab except anatomy renders into the inspector, so the panel has to
  // be open or the tab looks empty. Anatomy keeps it open when a structure is
  // selected, since that is what the panel would be showing.
  showDetails(tab !== "anatomy" || Boolean(state.selected));
  document.querySelector("#mode-bar").hidden = tab !== "dental";
  document.body.classList.toggle("dental-stage", tab === "dental");
  // The published dental models are what this tab shows, so they start
  // arriving when the tab does rather than when the first tooth is opened.
  if (tab === "dental") viewer?.prefetchModels?.();
  if (tab !== "dental") setMode("3d");
  document.querySelectorAll("[data-tab]").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
    b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false");
  });
  document.querySelector("#stage-title").textContent =
    tab === "dental"
      ? "Tooth anatomy"
      : tab === "quiz"
        ? "Learn. Explore. Recall."
        : "Head & neck";
  if (tab === "dental" && atlas) {
    const part = partForTooth(atlas.parts, state.fdi);
    if (part) {
      state.selected = part.id;
      state.layers.add("teeth");
      updateScene();
    }
  }
  if (atlas) renderInspector();
  if (atlas) renderTeaching();
}
function toggleIsolate() {
  if (state.toothDetail) {
    exitTooth();
    return;
  }
  if (state.arches || state.age !== "adult") {
    inspectTooth();
    return;
  }
  state.isolated = !state.isolated;
  updateScene();
  viewer?.view("oblique", state.isolated);
  renderInspector();
}
function exitTooth() {
  state.toothDetail = false;
  state.perioFocus = false;
  state.isolated = false;
  updateScene();
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      viewer?.view("oblique", state.arches || state.age !== "adult"),
    ),
  );
}
function privacy() {
  const choice = readConsent();
  document.querySelector("#modal-content").innerHTML =
    `<h2>Privacy</h2>
  <p>This atlas is a static site. It has no accounts, no login, and no server that stores anything about you. The anatomy is delivered as files and rendered in your browser.</p>
  <h3>What is stored on your device</h3><p>Your theme, your saved structures, and your answer to the question below are kept in this browser's local storage. They never leave your device, and clearing your browser data removes them.</p>
  <h3>Analytics</h3><p>Google Analytics is loaded on every visit, but under Google's consent mode it starts switched off: it stores nothing, sets no cookies, and records no visit until you accept. Accepting turns on visit counting only. Advertising and personalization are refused whether or not you accept, and IP addresses are anonymized. Declining after having accepted switches it back off and deletes the cookies it set. You can change your answer at any time.</p><p class="fine-print">Because the tag itself loads on every visit, your browser does contact Google even before you choose, which is how Google's own consent mode works. If you would rather nothing reached Google at all, a content blocker will stop it and the atlas will still work.</p>
  <p class="consent-state">Your current choice: <strong>${choice === "granted" ? "analytics accepted" : choice === "denied" ? "analytics declined" : "not answered yet"}</strong></p>
  <div class="detail-actions"><button id="privacy-accept" class="primary">Accept analytics</button><button id="privacy-decline">Decline analytics</button></div>
  <h3>Content</h3><p>Anatomy geometry comes from BodyParts3D under the licenses recorded in the credits. The schematic structures and teaching diagrams are original. This is an educational reference and is not for diagnosis or treatment planning.</p>`;
  const modal = document.querySelector("#modal");
  modal.querySelector("#privacy-accept").onclick = () => {
    setConsent("granted");
    modal.close();
  };
  modal.querySelector("#privacy-decline").onclick = () => {
    setConsent("denied");
    modal.close();
  };
  modal.showModal();
}

/* Where the published models came from and what was done to them, in the app
   rather than only in the repository. */
function modelSources() {
  const manifest = viewer?.modelManifest?.();
  const sources = manifest?.sources;
  document.querySelector("#modal-content").innerHTML = `<h2>Published dental models</h2>
  <p>Three datasets are redistributed here as their authors made them. None is drawn by this project, none is segmented by this project, and none is registered onto the head assembly, because a position on this skull is not something any of them carries.</p>
  <p><strong>They are not under the same terms.</strong> Two are CC BY 4.0. Open-Full-Jaw is CC BY-NC-SA 4.0: not for commercial use, and anything derived from it carries the same terms. It is also the one that is a real person rather than a model, shown here as teaching material and not as diagnostic imaging.</p>
  ${
    sources
      ? Object.entries(sources)
          .map(
            ([key, source]) =>
              `<h3>${escape(source.title)}</h3>
      <p>${escape(source.authors)}, ${source.year}. <a href="https://doi.org/${source.doi}" target="_blank" rel="noreferrer">doi:${source.doi}</a>${source.article ? ` · study: <a href="https://doi.org/${source.article}" target="_blank" rel="noreferrer">doi:${source.article}</a>` : ""} · <a href="${source.licenseUrl}" target="_blank" rel="noreferrer">${escape(source.license)}</a>${source.patient ? ` · ${escape(source.patient)}` : ""}</p>
      <p><strong>What was done to it here.</strong> ${escape(source.processing)}${source.units ? ` ${escape(source.units)}` : ""}</p>
      ${source.derivation ? `<p><strong>Where the shape came from.</strong> ${escape(source.derivation)}</p>` : ""}
      <p><strong>The ligament.</strong> ${escape(source.pdlModel)}</p>
      <p><strong>What it cannot show.</strong> ${escape(source.limits)}</p>`,
          )
          .join("")
      : "<p>The models have not been loaded yet.</p>"
  }
  <h3>Why they are separate</h3><p>These are different jaws, made by different groups for different studies, and no two of them are ever shown in one frame. Taking a pulp cavity out of one and a crown out of another would be inventing anatomy rather than showing it. The rest of the 3D dental views in this atlas are procedural teaching geometry built by this project and are labeled as such wherever they appear.</p>`;
  document.querySelector("#modal").showModal();
}

function coverage() {
  document.querySelector("#modal-content").innerHTML =
    `<h2>Source anatomy and teaching models</h2>
  <p>The adult explorer contains ${atlas.parts.filter((p) => !isSchematic(p)).length} BodyParts3D meshes cropped to the head and neck, plus ${atlas.parts.filter(isSchematic).length} schematic structures the source dataset does not contain. Colors identify systems, not natural tissue colors. Cut ends at the lower neck remain open.</p>
  <h3>Schematic oral and maxillofacial structures</h3><p>BodyParts3D 4.0 has no maxillary or mandibular division of the trigeminal nerve, no facial nerve, no external carotid artery or any of its branches, no parotid gland, no facial vein, no paranasal sinus, and no temporomandibular articular disc. Its entire nerve set is 55 orbital concepts and its arteries are intracranial. For an oral and maxillofacial atlas those absences cover most of the subject, so those structures are drawn instead. Their courses are fitted at run time to landmarks measured on this assembly: the root apices of the 28 source teeth, the mandibular and mental foramina found on the mandible mesh, the maxilla, the palatine bone, the condyle, and the carotid bifurcation. They are teaching geometry, not segmentation, and they are labeled as schematic wherever they are named. Turn them off with the switch above the structure library.</p>
  <h3>Still absent</h3><p>The glossopharyngeal, vagus, accessory, and hypoglossal nerves, the chorda tympani, the pterygopalatine, submandibular, and otic ganglia, the palatine tonsils, the lymph nodes of the neck, and the frontal, ethmoid, and sphenoid sinuses are neither in the source nor drawn.</p>
  <h3>Available systems</h3><p>${Object.entries(groups)
    .filter(([id]) => atlas.parts.some((p) => p.group === id))
    .map(([, g]) => g.name)
    .join(", ")}.</p>
  <h3>Facial muscles</h3><p>Forty-seven authentic facial and masticatory muscle meshes from BodyParts3D 3.0 supplement the 4.0 head, including masseter, temporalis, pterygoids, orbicularis oris and orbicularis oculi. A shared bone-based registration aligns the releases; held-out bone surface RMS mismatch is 0.26 mm. This is an educational cross-version assembly, not a clinically validated model. The supplemental meshes retain CC BY-SA 2.1 Japan licensing.</p>
  <h3>What the source does not contain</h3><p>This is not every anatomical structure. Parotid glands, facial and external jugular veins, and segmented dental internals remain absent. The vein layer contains the two internal jugular vein segments. See the model coverage report for counts and exclusions.</p>
  <h3>Child and adult dentition</h3><p>The adult source has 28 permanent external tooth surfaces. Separate procedural teaching models provide all 32 permanent teeth, 20 primary teeth, and a representative 24-tooth mixed dentition. Child mode does not reuse a scaled adult skull. Pediatric craniofacial growth, developing tooth buds and root resorption are not modeled.</p>
  <h3>Zoom-to-inspect tooth anatomy</h3><p>Zooming into a selected tooth opens rotatable 3D teaching geometry with enamel, dentin, pulp and root canals, cementum, periodontal ligament, alveolar bone and gingiva. Internal structures are not derived from the source surface. Roots are spread in the section plane for inspection; proportions are illustrative and tissue thickness is exaggerated. Canal variations are explained separately, not all built into one representative tooth.</p>
  <h3>Resolution</h3><p>Assembly geometry is optimized for the browser. Where available, original archive meshes load on selection to provide increased surface detail. Original archive resolution is still a reduced educational dataset, not patient imaging.</p>
  <h3>Clinical sources</h3>${[...Object.values(sources), ...dentalSources, ...Object.values(endoSources), ...perioSources, ["AAPD: developing dentition", "https://www.aapd.org/globalassets/media/policies_guidelines/bp_developdentition.pdf"], ["Primary tooth anatomy", "https://www.ncbi.nlm.nih.gov/books/NBK573074/"]].map(sourceLink).join("")}
  <h3>Attribution</h3><p>BodyParts3D © The Database Center for Life Science, CC BY 4.0. Geometry adapted from <a href="https://github.com/ashemag/human-atlas" target="_blank" rel="noreferrer">Human Atlas by ashemag</a> and the official OBJ archive. <a href="/ATTRIBUTION.md" target="_blank">Full attribution</a>.</p><p>Educational use only. Independent specialist editorial review remains necessary.</p>`;
  document.querySelector("#modal").showModal();
}
document.querySelectorAll("[data-tab]").forEach(
  (b) =>
    (b.onclick = () => {
      if (b.dataset.tab === "anatomy") {
        state.age = "adult";
        document.querySelector("#age").value = "adult";
        setTab("anatomy");
        viewer?.view();
      } else setTab(b.dataset.tab);
    }),
);
document.querySelector("#age").onchange = (e) => {
  if (atlas) setAge(e.target.value);
};
document.querySelector("#toggle-details").onclick = () =>
  showDetails(!document.body.classList.contains("details-open"));
document.querySelector("#close-inspector").onclick = () => showDetails(false);
document.querySelector("#exit-tooth").onclick = exitTooth;
document.querySelector("#cutaway").onchange = (e) => {
  state.cutaway = e.target.checked;
  updateScene();
};
document.querySelector("#section-depth").oninput = (e) => {
  document.querySelector("#section-depth-out").value = `${e.target.value}%`;
  // The drawn cutaway wants a small offset in metres; the published one wants
  // the percentage itself, because it slides a plane across a real model.
  state.cutPosition = Number(e.target.value);
  state.sectionDepth = (Number(e.target.value) - 50) * 0.00008;
  updateScene();
};
document.querySelectorAll("[data-cut-axis]").forEach((button) => {
  button.onclick = () => {
    state.cutAxis = button.dataset.cutAxis;
    document
      .querySelectorAll("[data-cut-axis]")
      .forEach((b) => b.classList.toggle("active", b === button));
    if (!state.cutaway) {
      state.cutaway = true;
      document.querySelector("#cutaway").checked = true;
    }
    updateScene();
  };
});
for (const [id, key, unit] of [
  ["#cut-tilt", "cutTilt", "°"],
  ["#cut-rotate", "cutRotate", "°"],
]) {
  const input = document.querySelector(id);
  input.oninput = () => {
    state[key] = Number(input.value);
    document.querySelector(`${id}-out`).value = `${input.value}${unit}`;
    updateScene();
  };
}
document.querySelector("#cut-flip").onclick = () => {
  state.cutFlip = !state.cutFlip;
  document
    .querySelector("#cut-flip")
    .setAttribute("aria-pressed", String(state.cutFlip));
  updateScene();
};
// On a phone the cutaway panel shows one of its three groups at a time. All
// three are on screen at once on a wide window, where there is room for them,
// so the switch is a touch layout control and the panel keeps its data-tool
// either way.
document.querySelectorAll(".tool-tabs [data-tool]").forEach((button) => {
  button.onclick = () => {
    document.querySelector("#dental-3d-controls").dataset.tool =
      button.dataset.tool;
    // The three groups are three different heights, and on a phone the panel
    // is sitting on top of the tooth. The body carries the choice so the
    // viewer's own box can give back whatever this group does not need.
    document.body.dataset.tool = button.dataset.tool;
    document
      .querySelectorAll(".tool-tabs [data-tool]")
      .forEach((b) => b.classList.toggle("active", b === button));
  };
});
document.querySelector("#cut-face").onclick = () => viewer?.faceCut();
document.querySelector("#cut-whole").onclick = () => viewer?.view("oblique", true);
document.querySelectorAll("[data-tissue3d]").forEach(
  (b) =>
    (b.onclick = () => {
      const id = b.dataset.tissue3d;
      state.hiddenTissues.has(id)
        ? state.hiddenTissues.delete(id)
        : state.hiddenTissues.add(id);
      b.setAttribute("aria-pressed", String(!state.hiddenTissues.has(id)));
      document.querySelector("#tissue-3d-status").textContent =
        `${b.textContent} ${state.hiddenTissues.has(id) ? "hidden" : "visible"}. Teaching geometry; root spread is flattened for inspection.`;
      updateScene();
    }),
);
document
  .querySelectorAll("[data-mode]")
  .forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
document.querySelector("#mobile-library").onclick = (e) => {
  const open = document.querySelector(".sidebar").classList.toggle("expanded");
  e.currentTarget.setAttribute("aria-expanded", String(open));
};
/* The touch dock is one row deep, so the selection and separation controls
   take turns in it. On wide windows both are on screen and the switch is not
   rendered at all. */
const collapseLibrary = () => {
  document.querySelector(".sidebar").classList.remove("expanded");
  document
    .querySelector("#mobile-library")
    .setAttribute("aria-expanded", "false");
};
const showSeparation = (on) => {
  document.body.classList.toggle("separating", on);
  document
    .querySelector("#dock-switch")
    .setAttribute("aria-pressed", String(on));
};
document.querySelector("#dock-switch").onclick = () =>
  showSeparation(!document.body.classList.contains("separating"));
document.querySelector("#search").oninput = (e) => {
  state.query = e.target.value;
  if (atlas) renderBrowser();
};
document.querySelectorAll("[data-view]").forEach(
  (b) =>
    (b.onclick = () => {
      viewer?.view(
        b.dataset.view,
        state.isolated ||
          state.toothDetail ||
          state.arches ||
          state.age !== "adult",
      );
      document
        .querySelectorAll("[data-view]")
        .forEach((v) => v.classList.toggle("active", v === b));
    }),
);
document.querySelector("#zoom-in").onclick = () => viewer?.zoom(0.8);
document.querySelector("#zoom-out").onclick = () => viewer?.zoom(1.25);
document.querySelector("#fit").onclick = () => viewer?.view("oblique", true);
document.querySelector("#isolate").onclick = () => {
  if (atlas) toggleIsolate();
};
document.querySelector("#reset").onclick = () => {
  if (!atlas) return;
  state.layers = new Set(DEFAULT_LAYERS);
  state.schematic = true;
  state.age = "adult";
  state.arches = false;
  state.toothDetail = false;
  document.querySelector("#age").value = "adult";
  document.querySelector("#source-caption").textContent =
    "BodyParts3D 4.0 · Adult reference";
  state.isolated = false;
  state.explode = 0;
  state.opacity.clear();
  state.hidden.clear();
  state.landmark = null;
  viewer?.showLandmark(null);
  state.selected = "FJ3289";
  state.topic = "mandible";
  state.query = "";
  document.querySelector("#search").value = "";
  setTab("anatomy");
  updateScene();
  renderBrowser();
  viewer?.view();
};
document.querySelector("#coverage").onclick = document.querySelector(
  "#credits",
).onclick = () => {
  if (atlas) coverage();
};
document.querySelector("#consent-accept").onclick = () => setConsent("granted");
document.querySelector("#consent-decline").onclick = () => setConsent("denied");
document.querySelector("#privacy").onclick = () => privacy();
// A previous grant was already restored in index.html, before the tag loaded.
if (readConsent() === null) showConsent(true);

document.querySelector("#close-modal").onclick = () =>
  document.querySelector("#modal").close();
document.addEventListener("click",e=>{if(e.target.closest("[data-clear-selection]") && atlas)clearSelection();});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && atlas && !document.querySelector("#modal").open) clearSelection();
  if (
    e.key === "/" &&
    !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    e.preventDefault();
    document.querySelector("#search").focus();
  }
});

try {
  const response = await fetch("/models/atlas.json");
  if (!response.ok) throw new Error("The anatomy index could not be loaded.");
  atlas = await response.json();
  const facialResponse = await fetch("/models/facial/atlas.json");
  if (!facialResponse.ok) throw new Error("The facial muscle index could not be loaded.");
  const facial = await facialResponse.json();
  atlas.parts.push(...facial.parts);
  renderBrowser();
  renderInspector();
  showDetails(wideWindow.matches);
  const explodeInput = document.querySelector("#explode");
  explodeInput.oninput = () => setExplosion(Number(explodeInput.value));
  document.querySelector("#reassemble-dock").onclick = () => {
    setExplosion(0);
    viewer?.view("oblique", true);
  };
  viewer = await createViewer(document.querySelector("#viewer"), atlas, {
    onSelect: selectPart,
    onReady: () => {
      document.querySelector("#load-status").hidden = true;
    },
    onProgress: (percent) => {
      const bar = document.querySelector("#load-bar");
      if (bar) bar.style.width = `${percent}%`;
      const detail = document.querySelector("#load-detail");
      if (detail)
        detail.textContent =
          percent < 100
            ? `${percent}% · Loading the head and neck assembly`
            : "Building the anatomy";
    },
    onDetail: inspectTooth,
    onToothSelect: (fdi) => inspectTooth(fdi),
    onExitDetail: exitTooth,
    onExplode: setExplosion,
    onHover: showHover,
    onOrient: drawOrientation,
    onModelsReady: () => {
      if (state.mode === "models") renderModelControls();
      // The captions are written from whichever model is open, and until now
      // none was, so they still said schematic.
      updateScene();
      if (state.toothDetail) renderToothTissues();
    },
    // The facial muscles arrive after the first frame, so the counts and the
    // structure list are rebuilt once they are in the scene.
    onPartsChanged: ({ failed, message }) => {
      if (failed)
        document.querySelector("#load-status").hidden = false,
          (document.querySelector("#load-status").textContent =
            `Facial and masticatory muscles unavailable. ${message}`);
      renderBrowser();
      updateScene();
    },
  });
  updateScene();
  // The notes are first drawn before the viewer exists, so the landmark
  // picker has nothing to list until this second pass.
  renderInspector();
} catch (error) {
  const panel = document.querySelector("#load-status");
  panel.hidden = false;
  panel.classList.add("load-error");
  panel.setAttribute("role", "alert");
  panel.innerHTML = `<strong>The 3D viewer could not start</strong><span>${escape(error.message)} A browser with WebGL enabled is required. The reference panels remain available.</span><button id="reload-viewer">Reload the viewer</button>`;
  panel.querySelector("#reload-viewer").onclick = () => location.reload();
}
