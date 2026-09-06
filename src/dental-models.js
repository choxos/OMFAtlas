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
// The two sets are separate models of different jaws and are never shown in
// one frame. Neither is registered onto the head assembly, because a position
// on this skull is not something either dataset carries.
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
    name: "Lower jaw",
    source: "diaz",
    caption: "Synthetic lower jaw · Diaz and colleagues 2024",
    note: "A whole lower arch: cortical and cancellous bone, fourteen teeth, and a ligament shell around every root. Fade the bone to follow a root into its socket.",
    limits:
      "A synthetic model of one jaw, not a patient and not a scan. The ligament is an even 0.25 mm shell extruded around each root, so its width is a modeling choice and cannot be read as a measurement. There is no pulp, no cementum, no gingiva and no nerve in this dataset.",
  },
  molar: {
    id: "molar",
    name: "Immature molar",
    source: "fang",
    caption: "Immature first molar · Kang 2024",
    note: "A mandibular first permanent molar from a seven year old, with the pulp cavity inside it and the band and loop space maintainer that was built on it. Fade the tooth to follow the cavity into the roots.",
    limits:
      "An immature tooth in mixed dentition, not an adult standard form, and it does not divide into enamel and dentin. The pulp cavity is the cavity that was modeled, not pulp tissue: it has no apical foramen, no lateral canals, no vessels and no nerve, and no canal length or preparation can be measured from it. The source gives its ligament thickness as 0.15 mm in its methods and 0.2 mm in its discussion.",
  },
};

/** Build one view's group from the imported buffer, centered on its own bounds
 *  and scaled to the meters the rest of the scene uses. The datasets are
 *  modeled in millimeters, hundreds of millimeters from their own origins. */
export function createModelGroup(manifest, buffer, viewId) {
  const view = MODEL_VIEWS[viewId];
  if (!view) throw new RangeError(`No dental model view ${viewId}`);
  const parts = manifest.parts.filter((part) => part.source === view.source);
  if (!parts.length) throw new Error(`No parts for ${viewId}`);

  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const part of parts)
    for (let axis = 0; axis < 3; axis++) {
      lo[axis] = Math.min(lo[axis], part.bounds[0][axis]);
      hi[axis] = Math.max(hi[axis], part.bounds[1][axis]);
    }
  const center = lo.map((low, axis) => (low + hi[axis]) / 2);

  const group = new THREE.Group();
  group.userData.view = view;
  for (const part of parts) {
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
    const style = MODEL_GROUPS[part.group];
    const mesh = new THREE.Mesh(
      geometry,
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
  // long axis stands up: both datasets model it along their own Z.
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

// ---- The zoom in cutaway --------------------------------------------------
//
// Zooming into a tooth used to open procedural geometry for every tooth in the
// mouth. Where a published model of that tooth exists it is used instead, and
// only one dataset is ever used at a time: mixing a pulp cavity from one jaw
// into a crown from another would be inventing anatomy, not showing it.
//
//   Lower first molars come from Kang, which is the only one of the two that
//   carries a pulp cavity, so it is the only one that can show a canal.
//   The other lower teeth come from Diaz, with their ligament and the alveolar
//   bone they sit in. That dataset has no pulp, and the interface says so.
//   Upper teeth have no published model here and stay procedural.

const CUTAWAY_TISSUES = {
  tooth: { name: "Tooth", color: "#f2e7cf" },
  pulp: { name: "Pulp & canals", color: "#b8455c" },
  pdl: { name: "Ligament", color: "#c05f7a" },
  bone: { name: "Bone", color: "#d9cfba" },
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
      caption: `FDI ${fdi} · immature first molar · Kang 2024`,
      note: "The outer surface, the pulp cavity and the ligament of a mandibular first permanent molar, modeled from the cone beam CT of a seven year old. The roots are still forming and the apices are open.",
      limits:
        "An immature tooth in mixed dentition, not an adult standard form, and its outer surface is not divided into enamel and dentin. The pulp cavity is the cavity that was modeled, not pulp tissue: no apical foramen, no lateral canals, no vessels and no nerve, and no canal length or preparation amount can be measured from it. The ligament is an even shell; the source gives 0.15 mm in its methods and 0.2 mm in its discussion.",
      parts,
    };
  }
  const tooth = has(`tooth-${fdi}`);
  const pdl = has(`pdl-${fdi}`);
  if (!tooth || !pdl) return null;
  return {
    source: "diaz",
    mirrored: false,
    caption: `FDI ${fdi} · synthetic lower jaw · Diaz and colleagues 2024`,
    note: "The tooth, the ligament shell around its root and the alveolar bone it sits in, from a synthetic lower jaw. Fade the bone to follow the root into its socket.",
    limits:
      "A synthetic model of one jaw, not a patient and not a scan. The ligament is an even 0.25 mm shell extruded around the root, so its width is a modeling choice and cannot be read as a measurement. This dataset carries no pulp, so this tooth has no canal to show: the first molars do, and they come from a different study. The alveolar bone is in the arch view rather than around this tooth.",
    // The jaw this tooth came out of belongs in the arch view, not wrapped
    // around one tooth that the reader asked to look inside.
    parts: [
      { part: tooth, tissue: "tooth" },
      { part: pdl, tissue: "pdl" },
    ].filter((entry) => entry.part),
  };
}

function geometryFor(part, buffer) {
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

/** The cutaway for one tooth, centred on that tooth and scaled to metres. */
export function createPublishedToothModel(manifest, buffer, fdi) {
  const plan = publishedToothPlan(manifest, fdi);
  if (!plan) return null;

  // Centre on the tooth itself, not on the bone that surrounds it, so a whole
  // jaw of alveolar bone does not drag the view away from the root.
  const anchor = plan.parts.find((entry) => entry.tissue === "tooth").part;
  const center = anchor.bounds[0].map(
    (low, axis) => (low + anchor.bounds[1][axis]) / 2,
  );

  const group = new THREE.Group();
  const tissues = [];
  for (const { part, tissue } of plan.parts) {
    const style = CUTAWAY_TISSUES[tissue];
    const mesh = new THREE.Mesh(
      geometryFor(part, buffer),
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
  group.rotation.x = -Math.PI / 2;
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

/** The whole published lower dentition: fourteen teeth, their ligaments and
 *  the bone they sit in. The upper arch has no published model in either
 *  dataset, so this is a lower arch and the interface says so. */
export function createPublishedDentitionModel(manifest, buffer) {
  if (!manifest) return null;
  const teeth = manifest.parts.filter(
    (part) => part.source === "diaz" && part.group === "tooth",
  );
  if (teeth.length !== 14) return null;
  const wanted = manifest.parts.filter((part) => part.source === "diaz");

  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const part of teeth)
    for (let axis = 0; axis < 3; axis++) {
      lo[axis] = Math.min(lo[axis], part.bounds[0][axis]);
      hi[axis] = Math.max(hi[axis], part.bounds[1][axis]);
    }
  const center = lo.map((low, axis) => (low + hi[axis]) / 2);

  const group = new THREE.Group();
  for (const part of wanted) {
    const style = CUTAWAY_TISSUES[part.group] || MODEL_GROUPS[part.group];
    const mesh = new THREE.Mesh(
      geometryFor(part, buffer),
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
  group.scale.setScalar(0.001);
  group.rotation.x = -Math.PI / 2;
  group.userData.publishedArch = {
    caption: "Lower arch · synthetic lower jaw · Diaz and colleagues 2024",
    note: "Fourteen lower teeth with a ligament shell around every root, in the alveolar bone they sit in. Select a tooth to inspect it, or fade the bone to follow a root into its socket.",
    limits:
      "A synthetic model of one lower jaw, not a patient and not a scan. Its ligament is an even 0.25 mm shell extruded around each root, so its width is a modeling choice. The upper arch is not part of this dataset and no published model of it is redistributed here; the schematic arches remain available for that.",
  };
  group.userData.tissues = ["tooth", "pdl", "bone"].map((id) => ({
    id,
    ...CUTAWAY_TISSUES[id],
  }));
  return group;
}
