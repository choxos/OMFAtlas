import * as THREE from "three";

// Published dental models this atlas redistributes rather than draws.
//
// Everything else in the 3D dental views is procedural teaching geometry built
// by src/dental-geometry.js. These are not: they are two published datasets,
// both CC BY 4.0, loaded as they were modeled.
//
//   Diaz and colleagues (2024), Mendeley Data doi:10.17632/xjsx7nfhj8.1. A
//   synthetic lower jaw: cortical and cancellous bone, fourteen teeth, and a
//   periodontal ligament for each of them, all in one assembly.
//
//   Kang (2024), figshare doi:10.6084/m9.figshare.24591537.v1, from Shi, Kang
//   and Liu, PeerJ 12:e17456. An immature mandibular first permanent molar
//   from the cone beam CT of a seven year old, with its pulp cavity, its
//   ligament, and the band and loop space maintainer built on it.
//
//   Gholamalizadeh and colleagues (2022), Open-Full-Jaw patient 12,
//   doi:10.1016/j.cmpb.2022.107009, CC BY-NC-SA 4.0. One adult's upper and
//   lower jaw segmented from a cone beam CT: both bones, thirty one teeth and
//   a ligament for every one of them, all in the frame they were scanned in.
//   This is the only source here with a maxilla and the only one that is a
//   person rather than a model, and it is the only one whose license forbids
//   commercial use and binds derivatives to the same terms.
//
// No two of the three sets are ever shown in one frame. None is registered
// onto the head assembly, because a position on this skull is not something
// any of them carries.
//
// scripts/import-dental-models.mjs converts them and records the digests, the
// tessellation settings and the limits each source states.

export const MODEL_GROUPS = {
  bone: { name: "Alveolar bone", color: "#d9cfba" },
  tooth: { name: "Teeth", color: "#f2e7cf" },
  pdl: { name: "Periodontal ligament", color: "#c05f7a" },
  pulp: { name: "Pulp cavity", color: "#b8455c" },
  appliance: { name: "Space maintainer", color: "#8d97a6" },
};

/** Which parts each view shows, and what the reader is being shown. */
export const MODEL_VIEWS = {
  jaw: {
    id: "jaw",
    license: "CC BY 4.0",
    name: "Lower jaw",
    source: "diaz",
    caption: "Synthetic lower jaw · Diaz and colleagues 2024",
    note: "A whole lower arch: cortical and cancellous bone, fourteen teeth, and a ligament shell around every root. Fade the bone to follow a root into its socket.",
    limits:
      "A synthetic model of one jaw, not a patient and not a scan. The ligament is an even 0.25 mm shell extruded around each root, so its width is a modeling choice and cannot be read as a measurement. There is no pulp, no cementum, no gingiva and no nerve in this dataset.",
  },
  patient: {
    id: "patient",
    license: "CC BY-NC-SA 4.0",
    name: "Patient jaw",
    source: "openfulljaw",
    caption: "Upper and lower jaw of one patient \u00b7 Gholamalizadeh and colleagues 2022",
    note: "Both jaws of one adult, segmented from a cone beam CT: the bones, thirty one teeth and a ligament around each of them, in the frame they were scanned in. Fade the bone to follow a root into its socket.",
    limits:
      "One patient, not a norm. The teeth are worn and tipped as that person's teeth are, and the upper left first molar is absent because that person is missing it. Bone, teeth and ligament only: no pulp, no canal, no enamel and dentin division, no cementum, no gingiva and no nerve. Redistributed under CC BY-NC-SA 4.0, which is not the license the rest of this atlas carries.",
  },
  molar: {
    id: "molar",
    license: "CC BY 4.0",
    name: "Immature molar",
    source: "fang",
    caption: "Immature first molar · Kang 2024",
    note: "A mandibular first permanent molar from a seven year old, with the pulp cavity inside it and the band and loop space maintainer that was built on it. Fade the tooth to follow the cavity into the roots.",
    limits:
      "An immature tooth in mixed dentition, not an adult standard form, and it does not divide into enamel and dentin. The pulp cavity is the cavity that was modeled, not pulp tissue: it has no apical foramen, no lateral canals, no vessels and no nerve, and no canal length or preparation can be measured from it. The source gives its ligament thickness as 0.15 mm in its methods and 0.2 mm in its discussion.",
  },
};

/** The ArrayBuffer a part's vertices live in. The sets are in separate files
 *  so a reader who never opens one never downloads it, and so the file
 *  boundary is the license boundary. */
const bufferFor = (part, buffers) => buffers[part.buffer || "dental"];

function geometryFor(part, buffers) {
  const buffer = bufferFor(part, buffers);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array(buffer, part.positions, part.vertexCount * 3),
      3,
    ),
  );
  geometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(
      new Float32Array(buffer, part.normals, part.vertexCount * 3),
      3,
    ),
  );
  geometry.setIndex(
    new THREE.BufferAttribute(
      new Uint32Array(buffer, part.indices, part.indexCount),
      1,
    ),
  );
  return geometry;
}

const boundsOf = (parts) => {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const part of parts)
    for (let axis = 0; axis < 3; axis++) {
      lo[axis] = Math.min(lo[axis], part.bounds[0][axis]);
      hi[axis] = Math.max(hi[axis], part.bounds[1][axis]);
    }
  return [lo, hi];
};

/** Build one view's group from the imported buffers, centered on its own
 *  bounds and scaled to the meters the rest of the scene uses. The datasets
 *  are modeled in millimeters, hundreds of millimeters from their origins. */
export function createModelGroup(manifest, buffers, viewId) {
  const view = MODEL_VIEWS[viewId];
  if (!view) throw new RangeError(`No dental model view ${viewId}`);
  const parts = manifest.parts.filter((part) => part.source === view.source);
  if (!parts.length) throw new Error(`No parts for ${viewId}`);

  const [lo, hi] = boundsOf(parts);
  const center = lo.map((low, axis) => (low + hi[axis]) / 2);

  const group = new THREE.Group();
  group.userData.view = view;
  for (const part of parts) {
    const style = MODEL_GROUPS[part.group];
    const mesh = new THREE.Mesh(
      geometryFor(part, buffers),
      new THREE.MeshStandardMaterial({
        color: style.color,
        roughness: 0.62,
        metalness: part.group === "appliance" ? 0.45 : 0,
        side: THREE.DoubleSide,
      }),
    );
    mesh.userData.modelPart = part;
    group.add(mesh);
  }
  // Millimeters to meters, centered on the assembly, and turned so the tooth
  // long axis stands up: all three datasets model it along their own Z.
  group.scale.setScalar(0.001);
  group.rotation.x = -Math.PI / 2;
  group.position.set(0, 0, 0);
  for (const mesh of group.children)
    mesh.position.set(-center[0], -center[1], -center[2]);
  group.userData.radius =
    0.001 * Math.hypot(...hi.map((high, axis) => high - lo[axis])) * 0.5;
  return group;
}

/** Groups present in a view, in the order they should be listed. */
export function groupsInView(manifest, viewId) {
  const view = MODEL_VIEWS[viewId];
  const seen = [];
  for (const key of Object.keys(MODEL_GROUPS))
    if (
      manifest.parts.some(
        (part) => part.source === view.source && part.group === key,
      )
    )
      seen.push(key);
  return seen;
}

/** Which files a view or a tooth needs, so only those are fetched. */
export function buffersForView(manifest, viewId) {
  const view = MODEL_VIEWS[viewId];
  return [
    ...new Set(
      manifest.parts
        .filter((part) => part.source === view.source)
        .map((part) => part.buffer || "dental"),
    ),
  ];
}

// ---- The zoom in cutaway --------------------------------------------------
//
// Zooming into a tooth used to open procedural geometry for every tooth in the
// mouth. Where a published model of that tooth exists it is used instead, and
// only one dataset is ever used for one tooth: taking a pulp cavity from one
// person's jaw into a crown from another would be inventing anatomy rather
// than showing it.
//
//   The lower first molars come from Kang. It is the only source here that
//   carries a pulp cavity, so it is the only one that can show a canal, and a
//   canal is what a reader zooms into a molar for. Its caption says whose
//   tooth it is, because it is a seven year old's and the rest are not.
//   Every other tooth comes from Open-Full-Jaw: one adult patient's own tooth
//   with the ligament that was generated around its own root. That is thirty
//   one teeth in both arches, which is what finally gives the upper teeth a
//   published model instead of drawn geometry.
//   Diaz is a synthetic jaw rather than a person and stays in the source
//   models view, where it is labelled as one.

const CUTAWAY_TISSUES = {
  tooth: { name: "Tooth", color: "#f2e7cf" },
  pulp: { name: "Pulp & canals", color: "#b8455c" },
  pdl: { name: "Ligament", color: "#c05f7a" },
  bone: { name: "Bone", color: "#d9cfba" },
};

// The two vertical planes and the horizontal one, named for what they cut.
// Kang and Diaz do not record which of their axes is buccolingual and which is
// mesiodistal, so their planes keep the names of the model's own frame.
const UNNAMED_CUTS = {
  a: "Longitudinal A",
  b: "Longitudinal B",
  crossing: "Crossing",
  note: "Longitudinal A and B are the two vertical planes of the model's own frame and Crossing is the horizontal one. Neither of them is a fixed buccolingual or mesiodistal direction: this dataset does not record which of its axes is which.",
};
// Open-Full-Jaw publishes each tooth's own axes and its pipeline names them:
// toward the distal side, toward the labial side, toward the occlusal side.
// The tooth is stood up on them, so the planes can be named for the section
// they leave behind rather than for an axis of the scanner.
const NAMED_CUTS = {
  a: "Buccolingual",
  b: "Mesiodistal",
  crossing: "Horizontal",
  note: "The tooth stands on its own long axis, which this dataset publishes along with its labial and distal directions. Buccolingual and mesiodistal are the two vertical sections and horizontal is the cross section. A tooth on its own is shown crown up whichever jaw it came from.",
};

/** Which published parts serve this tooth, or null if none do. */
export function publishedToothPlan(manifest, fdi) {
  if (!manifest) return null;
  const has = (id) => manifest.parts.find((part) => part.id === id);
  if (fdi === 46 || fdi === 36) {
    const parts = [
      { part: has("fang-tooth"), tissue: "tooth" },
      { part: has("fang-pulp"), tissue: "pulp" },
      { part: has("fang-pdl"), tissue: "pdl" },
    ].filter((entry) => entry.part);
    if (parts.length < 3) return null;
    return {
      source: "fang",
      // Kang modeled the right first molar. The left one is its mirror, and
      // that is a reflection rather than a second measurement.
      mirrored: fdi === 36,
      cuts: UNNAMED_CUTS,
      caption: `FDI ${fdi} · immature first molar · Kang 2024`,
      note: "The outer surface, the pulp cavity and the ligament of a mandibular first permanent molar, modeled from the cone beam CT of a seven year old. The roots are still forming and the apices are open. It is here rather than the patient jaw because it is the only tooth in this atlas with a pulp cavity in it.",
      limits:
        "An immature tooth in mixed dentition, not an adult standard form, and its outer surface is not divided into enamel and dentin. The pulp cavity is the cavity that was modeled, not pulp tissue: no apical foramen, no lateral canals, no vessels and no nerve, and no canal length or preparation amount can be measured from it. The ligament is an even shell; the source gives 0.15 mm in its methods and 0.2 mm in its discussion.",
      parts,
    };
  }
  const tooth = has(`jaw-tooth-${fdi}`);
  const pdl = has(`jaw-pdl-${fdi}`);
  if (!tooth || !pdl) return null;
  const arch = fdi < 30 ? "upper" : "lower";
  return {
    source: "openfulljaw",
    mirrored: false,
    axes: tooth.axes,
    cuts: NAMED_CUTS,
    caption: `FDI ${fdi} · ${tooth.name.toLowerCase()} · one patient · Gholamalizadeh and colleagues 2022`,
    note: `This ${arch} tooth and the ligament around its root, segmented from one adult's cone beam CT. It is that person's tooth, worn and shaped as theirs is, standing on the long axis the dataset publishes for it.`,
    limits:
      "One patient rather than a standard form. This dataset carries no pulp, so this tooth has no canal to show: the lower first molars do, and they come from a different study and a different person. There is no enamel and dentin division, no cementum, no gingiva and no nerve. The ligament was generated as the gap between this root and its socket, so its width follows the socket but it is still a generated surface, not segmented ligament tissue. Redistributed under CC BY-NC-SA 4.0, which is not the license the rest of this atlas carries.",
    parts: [
      { part: tooth, tissue: "tooth" },
      { part: pdl, tissue: "pdl" },
    ],
  };
}

/** Every tooth a published model exists for. */
export function publishedTeeth(manifest) {
  const teeth = new Set();
  if (!manifest) return teeth;
  for (const part of manifest.parts)
    if (part.group === "tooth" && part.fdi && part.source !== "diaz")
      teeth.add(part.fdi);
  // Kang's molar stands in for both lower first molars.
  if (manifest.parts.some((part) => part.id === "fang-tooth")) {
    teeth.add(36);
    teeth.add(46);
  }
  return teeth;
}

/** Which buffers a tooth's cutaway needs. */
export function buffersForTooth(manifest, fdi) {
  const plan = publishedToothPlan(manifest, fdi);
  if (!plan) return [];
  return [
    ...new Set(plan.parts.map(({ part }) => part.buffer || "dental")),
  ];
}

/** The cutaway for one tooth, centered on that tooth and scaled to meters. */
export function createPublishedToothModel(manifest, buffers, fdi) {
  const plan = publishedToothPlan(manifest, fdi);
  if (!plan) return null;
  for (const { part } of plan.parts)
    if (!bufferFor(part, buffers)) return null;

  // Center on the tooth itself, not on anything around it, so nothing drags
  // the view away from the root the reader asked to look inside.
  const anchor = plan.parts.find((entry) => entry.tissue === "tooth").part;
  const center = anchor.bounds[0].map(
    (low, axis) => (low + anchor.bounds[1][axis]) / 2,
  );

  const group = new THREE.Group();
  const tissues = [];
  for (const { part, tissue } of plan.parts) {
    const style = CUTAWAY_TISSUES[tissue];
    const mesh = new THREE.Mesh(
      geometryFor(part, buffers),
      new THREE.MeshStandardMaterial({
        color: style.color,
        roughness: 0.58,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    );
    mesh.position.set(-center[0], -center[1], -center[2]);
    mesh.userData.tissue = tissue;
    mesh.userData.modelPart = part;
    mesh.renderOrder = tissue === "pulp" ? 0 : tissue === "pdl" ? 1 : 2;
    group.add(mesh);
    if (!tissues.includes(tissue)) tissues.push(tissue);
  }
  group.scale.set(plan.mirrored ? -0.001 : 0.001, 0.001, 0.001);
  if (plan.axes) {
    // The tooth's own frame: side across, up along the long axis, out toward
    // the lip. Turning the model by the inverse of that basis stands the tooth
    // on its long axis, crown up, whichever jaw and whichever side it is from,
    // and makes the three cutting planes the three anatomical sections. The
    // basis is orthonormal and right handed in the published file, so this is
    // a rotation and never a reflection.
    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3().fromArray(plan.axes.side),
      new THREE.Vector3().fromArray(plan.axes.up),
      new THREE.Vector3().fromArray(plan.axes.out),
    );
    group.quaternion.setFromRotationMatrix(basis.transpose());
  } else {
    // Kang and Diaz both model the long axis along their own Z.
    group.rotation.x = -Math.PI / 2;
  }
  group.userData.published = plan;
  group.userData.tissues = tissues.map((id) => ({ id, ...CUTAWAY_TISSUES[id] }));
  group.userData.radius =
    0.001 *
    Math.hypot(
      ...anchor.bounds[1].map((high, axis) => high - anchor.bounds[0][axis]),
    ) *
    0.5;
  return group;
}

/** One patient's whole dentition: both arches, thirty one teeth, a ligament
 *  around every root and the two bones they sit in, in the frame they were
 *  scanned in. This is the only published set here with an upper jaw. */
export function createPublishedDentitionModel(manifest, buffers) {
  if (!manifest) return null;
  const wanted = manifest.parts.filter((part) => part.source === "openfulljaw");
  const teeth = wanted.filter((part) => part.group === "tooth");
  if (!teeth.length) return null;
  for (const part of wanted) if (!bufferFor(part, buffers)) return null;

  // Center on the teeth, so the ramus and the condyles do not pull the arches
  // down out of the frame.
  const [lo, hi] = boundsOf(teeth);
  const center = lo.map((low, axis) => (low + hi[axis]) / 2);

  const group = new THREE.Group();
  for (const part of wanted) {
    const style = CUTAWAY_TISSUES[part.group] || MODEL_GROUPS[part.group];
    const mesh = new THREE.Mesh(
      geometryFor(part, buffers),
      new THREE.MeshStandardMaterial({
        color: style.color,
        roughness: 0.58,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    );
    mesh.position.set(-center[0], -center[1], -center[2]);
    mesh.userData.tissue = part.group;
    mesh.userData.modelPart = part;
    if (part.fdi) mesh.userData.fdi = part.fdi;
    group.add(mesh);
  }
  // The scan's Z is superior and its Y is posterior, so this stands the
  // patient up and turns their face toward the reader.
  group.scale.setScalar(0.001);
  group.rotation.x = -Math.PI / 2;
  group.userData.publishedArch = {
    caption:
      "Upper and lower arch · one patient · Gholamalizadeh and colleagues 2022",
    note: `Thirty one teeth in both arches with a ligament around every root, in the two bones they sit in, all in the frame one adult's cone beam CT was segmented in. Select a tooth to inspect it, or fade the bone to follow a root into its socket.`,
    limits:
      "One patient rather than a standard form: these teeth are worn, tipped and spaced as that person's are, and the upper left first molar is absent because that person is missing it. Bone, teeth and ligament only, with no pulp, no canal, no enamel and dentin division, no cementum, no gingiva and no nerve. Redistributed under CC BY-NC-SA 4.0, which is not the license the rest of this atlas carries.",
  };
  group.userData.tissues = ["tooth", "pdl", "bone"].map((id) => ({
    id,
    ...CUTAWAY_TISSUES[id],
  }));
  return group;
}
