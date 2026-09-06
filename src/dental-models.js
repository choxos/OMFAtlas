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
