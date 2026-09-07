// Import the two published dental datasets this atlas redistributes.
//
//   Diaz, Gonzalez, Vasquez (2024). Data of synthetic 3D models of the human
//   jaw, including teeth, ligaments, and bone structures. Mendeley Data v1.
//   doi:10.17632/xjsx7nfhj8.1, CC BY 4.0. Binary STL, one file per structure.
//
//   Kang FF (2024). Models for Shi, Kang, Liu, PeerJ 12:e17456.
//   doi:10.6084/m9.figshare.24591537.v1, CC BY 4.0. STEP solids, tessellated
//   here with OpenCASCADE through occt-import-js.
//
//   Gholamalizadeh and colleagues (2022). Open-Full-Jaw, patient 12.
//   doi:10.1016/j.cmpb.2022.107009, CC BY-NC-SA 4.0. Binary STL per tooth and
//   ASCII STL for the bone and ligament surfaces. This one is segmented from
//   a real cone beam CT, and its license is not the license the other two
//   carry: see public/models/dental/ATTRIBUTION.md.
//
// See public/models/dental/ATTRIBUTION.md. Nothing here is segmented by this
// project and nothing is registered onto the head assembly: these are their
// own models in their own coordinate frames, and the manifest records the
// transform this atlas applies to view them.
//
// Two buffers come out of this. dental.bin carries the two CC BY 4.0 sets and
// open-full-jaw.bin carries the CC BY-NC-SA 4.0 one, so a reader who only
// opens one of them only downloads one of them, and so the file boundary
// matches the license boundary.
//
// Usage: node scripts/import-dental-models.mjs [refs-directory]

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import occtimportjs from "occt-import-js";
import {
  boundsOf,
  findOne,
  openEdges,
  pack,
  publish,
  readBinaryStl,
  sha256,
  simplify,
  walk,
  weld,
  writer,
} from "./mesh-tools.mjs";

const REFS = process.argv[2] || "documentation/refs";

// The Fang solids have CJK file names that macOS and Linux normalize
// differently, so they are identified by content instead. These digests also
// pin exactly which revision of the figshare archive this import came from.
const FANG = {
  tooth: {
    sha256: "78b52ecb16c1c6173d5b9bfe7fe1a567ea1d207e40a43a9bbf5cc687e39cf5e1",
    name: "Tooth 46, outer surface",
  },
  pulp: {
    sha256: "992436f4c86a0ab773e6e6029284be171f05c82210724e677fb34bbd6ef541fe",
    name: "Pulp cavity",
  },
  pdl: {
    sha256: "34233ba8c4e455443377aeb1a1f4e9aba1f6712fcbc1a06e0f6153466d064f49",
    name: "Periodontal ligament",
  },
  maintainer: {
    sha256: "85a272f7fabd5217ae61e53b86d9d94b8c6ca960a39fcc4059c6be0cd0305741",
    name: "Band and loop space maintainer",
  },
};

const dentalBuffer = writer("dental", "dental.bin");
const jawBuffer = writer("open-full-jaw", "open-full-jaw.bin");

const TOOTH_NAMES = {
  1: "central incisor",
  2: "lateral incisor",
  3: "canine",
  4: "first premolar",
  5: "second premolar",
  6: "first molar",
  7: "second molar",
};
const side = (fdi) => (fdi < 40 ? "left" : "right");
const toothName = (fdi) => `Lower ${side(fdi)} ${TOOTH_NAMES[fdi % 10]}`;

// ---- Diaz synthetic lower jaw ---------------------------------------------

const refFiles = walk(REFS);
const stlFiles = refFiles.filter((path) => path.toLowerCase().endsWith(".stl"));

const parts = [];
const stlOf = (member) => {
  const path = findOne(stlFiles, member.split("/").pop(), "STL");
  const bytes = readFileSync(path);
  return { bytes, ...readBinaryStl(bytes) };
};

for (const [file, id, name, group] of [
  [
    "Bones/Cortical/Cortical bone lower jaw with boolean.stl",
    "jaw-cortical",
    "Cortical bone, lower jaw",
    "bone",
  ],
  [
    "Bones/Cancellous/Alveolar bone lower jaw with boolean.stl",
    "jaw-cancellous",
    "Cancellous bone, lower jaw",
    "bone",
  ],
]) {
  const { bytes, positions, indices } = stlOf(file);
  parts.push(
    pack(dentalBuffer, id, name, group, "diaz", positions, indices, {
      sourceMember: `Human Lower Jaw Dataset/${file}`,
      sourceSha256: sha256(bytes),
    }),
  );
}

for (const fdi of [31, 32, 33, 34, 35, 36, 37, 41, 42, 43, 44, 45, 46, 47]) {
  for (const [prefix, group, folder, label] of [
    ["D", "tooth", "Teeth", ""],
    ["L", "pdl", "PDL", ", periodontal ligament"],
  ]) {
    const member = `${folder}/STL/${prefix}${fdi}.stl`;
    const { bytes, positions, indices } = stlOf(member);
    parts.push(
      pack(
        dentalBuffer,
        `${group}-${fdi}`,
        `${toothName(fdi)}${label}`,
        group,
        "diaz",
        positions,
        indices,
        {
          fdi,
          sourceMember: `Human Lower Jaw Dataset/${member}`,
          sourceSha256: sha256(bytes),
        },
      ),
    );
  }
}
// ---- Fang immature first molar --------------------------------------------

const byDigest = new Map();
for (const path of refFiles) {
  if (!path.toLowerCase().endsWith(".stp")) continue;
  const bytes = readFileSync(path);
  byDigest.set(sha256(bytes), bytes);
}

const occt = await occtimportjs();
const fangUsed = [];
for (const [id, spec] of Object.entries(FANG)) {
  const bytes = byDigest.get(spec.sha256);
  if (!bytes) {
    console.warn(`skipped ${id}: no source file with digest ${spec.sha256.slice(0, 12)}`);
    continue;
  }
  const result = occt.ReadStepFile(new Uint8Array(bytes), {
    linearUnit: "millimeter",
    linearDeflectionType: "bounding_box_ratio",
    linearDeflection: 0.0015,
    angularDeflection: 0.5,
  });
  if (!result.success) throw new Error(`could not tessellate ${id}`);
  const mesh = result.meshes[0];
  const welded = weld(
    Float32Array.from(mesh.attributes.position.array),
    Uint32Array.from(mesh.index.array),
  );
  const cadTriangles = welded.indices.length / 3;
  const reduced = await simplify(welded.positions, welded.indices, 34000);
  parts.push(
    pack(dentalBuffer, `fang-${id}`, spec.name, id === "maintainer" ? "appliance" : id, "fang", reduced.positions, reduced.indices, {
      fdi: id === "maintainer" ? null : 46,
      sourceSha256: spec.sha256,
      cadTriangles,
      simplifiedError: Number(reduced.error.toFixed(5)),
    }),
  );
  fangUsed.push(id);
}

// ---- Open-Full-Jaw, patient 12 --------------------------------------------
//
// The only source here with a maxilla, and the only one segmented from a real
// scan. Both jaws are in one coordinate frame, which is what lets an upper and
// a lower arch stand in one scene as one person's mouth rather than two models
// pushed together.
//
// The ligament arrives as one mesh per jaw. It separates into exactly one
// closed shell per tooth, and each shell is given to the tooth whose centre it
// is nearest; the script refuses to continue unless that assignment is a
// bijection, because a ligament on the wrong tooth is a lie that looks right.

const JAW_ROOT = join(
  REFS,
  "Open-Full-Jaw",
  "extracted",
  "Patient_12",
);

/** Universal numbering to FDI. Upper right 1 to 8 runs back to front, then
 *  upper left 9 to 16 front to back, then lower left, then lower right. */
function fdiOf(unn) {
  if (unn <= 8) return 19 - unn;
  if (unn <= 16) return 12 + unn;
  if (unn <= 24) return 55 - unn;
  return 16 + unn;
}
for (const [unn, expected] of [
  [1, 18],
  [8, 11],
  [9, 21],
  [16, 28],
  [17, 38],
  [24, 31],
  [25, 41],
  [32, 48],
])
  if (fdiOf(unn) !== expected)
    throw new Error(`universal ${unn} should be FDI ${expected}`);

const FDI_NAMES = {
  1: "central incisor",
  2: "lateral incisor",
  3: "canine",
  4: "first premolar",
  5: "second premolar",
  6: "first molar",
  7: "second molar",
  8: "third molar",
};
const fdiName = (fdi) => {
  // Quadrant 1 is upper right and they run clockwise from the patient's view:
  // 2 upper left, 3 lower left, 4 lower right.
  const quadrant = Math.floor(fdi / 10);
  const jaw = quadrant <= 2 ? "Upper" : "Lower";
  const side = quadrant === 1 || quadrant === 4 ? "right" : "left";
  return `${jaw} ${side} ${FDI_NAMES[fdi % 10]}`;
};
for (const [fdi, expected] of [
  [18, "Upper right third molar"],
  [21, "Upper left central incisor"],
  [38, "Lower left third molar"],
  [46, "Lower right first molar"],
])
  if (fdiName(fdi) !== expected)
    throw new Error(`FDI ${fdi} should be "${expected}", got "${fdiName(fdi)}"`);

/** ASCII STL to indexed triangles, welded on the coordinate text itself: the
 *  source writes each vertex the same way every time it uses it. */
function readAsciiStl(text) {
  const positions = [];
  const indices = [];
  const seen = new Map();
  const pattern = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g;
  let match;
  while ((match = pattern.exec(text))) {
    const key = `${match[1]} ${match[2]} ${match[3]}`;
    let index = seen.get(key);
    if (index === undefined) {
      index = positions.length / 3;
      seen.set(key, index);
      positions.push(Number(match[1]), Number(match[2]), Number(match[3]));
    }
    indices.push(index);
  }
  return {
    positions: Float32Array.from(positions),
    indices: Uint32Array.from(indices),
  };
}

/** Split an indexed mesh into the pieces that do not touch each other. */
function shells(positions, indices) {
  const parent = new Uint32Array(positions.length / 3);
  for (let i = 0; i < parent.length; i++) parent[i] = i;
  const find = (x) => {
    while (parent[x] !== x) x = parent[x] = parent[parent[x]];
    return x;
  };
  const union = (a, b) => {
    a = find(a);
    b = find(b);
    if (a !== b) parent[b] = a;
  };
  for (let i = 0; i < indices.length; i += 3) {
    union(indices[i], indices[i + 1]);
    union(indices[i + 1], indices[i + 2]);
  }
  const byRoot = new Map();
  for (let i = 0; i < indices.length; i += 3) {
    const root = find(indices[i]);
    let list = byRoot.get(root);
    if (!list) byRoot.set(root, (list = []));
    list.push(indices[i], indices[i + 1], indices[i + 2]);
  }
  return [...byRoot.values()].map((list) => Uint32Array.from(list));
}

const centerOf = (positions, indices) => {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const index of indices)
    for (let axis = 0; axis < 3; axis++) {
      const value = positions[index * 3 + axis];
      if (value < lo[axis]) lo[axis] = value;
      if (value > hi[axis]) hi[axis] = value;
    }
  return lo.map((low, axis) => (low + hi[axis]) / 2);
};

// The dataset's own pipeline names these: x is the end point toward the
// distal side, y toward the labial side, z toward the occlusal side, all one
// millimeter from the tooth's center. They are exactly orthonormal in the
// published file, which is what lets a tooth be stood up on its own long axis
// rather than on the scanner's.
function toothBasis(axes) {
  const from = (point) => {
    const vector = point.map((value, axis) => value - axes.c[axis]);
    const length = Math.hypot(...vector);
    return vector.map((value) => value / length);
  };
  const up = from(axes.z);
  const out = from(axes.y);
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  // Right handed by construction, so standing the tooth up is a rotation and
  // never a reflection: side, up, out with side = up x out.
  const side = cross(up, out);
  const determinant =
    side[0] * (up[1] * out[2] - up[2] * out[1]) -
    up[0] * (side[1] * out[2] - side[2] * out[1]) +
    out[0] * (side[1] * up[2] - side[2] * up[1]);
  if (Math.abs(determinant - 1) > 1e-3)
    throw new Error(`tooth basis is not a rotation: determinant ${determinant}`);
  return { side, up, out };
}

const jawUsed = [];
if (existsSync(JAW_ROOT)) {
  for (const [jaw, boneName] of [
    ["mandible", "Mandible"],
    ["maxilla", "Maxilla"],
  ]) {
    const teethDirectory = join(JAW_ROOT, "input", jaw, "teeth");
    const axes = JSON.parse(
      readFileSync(join(JAW_ROOT, "input", jaw, `teeth_axes_${jaw}.json`), "utf8"),
    );
    const teeth = readdirSync(teethDirectory)
      .filter((name) => /^tooth_\d+\.stl$/.test(name))
      .map((name) => {
        const unn = Number(name.slice(6, -4));
        const bytes = readFileSync(join(teethDirectory, name));
        const mesh = readBinaryStl(bytes);
        return {
          unn,
          fdi: fdiOf(unn),
          member: `Patient_12/input/${jaw}/teeth/${name}`,
          sha256: sha256(bytes),
          sourceTriangles: mesh.indices.length / 3,
          center: centerOf(mesh.positions, mesh.indices),
          mesh,
        };
      })
      .sort((a, b) => a.unn - b.unn);

    // The ligament: one mesh for the jaw, one shell per tooth inside it.
    const pdlBytes = readFileSync(
      join(JAW_ROOT, "output", jaw, "surface_meshes", "pdls.stl"),
    );
    const pdl = readAsciiStl(pdlBytes.toString("utf8"));
    const pieces = shells(pdl.positions, pdl.indices);
    if (pieces.length !== teeth.length)
      throw new Error(
        `${jaw}: ${pieces.length} ligament shells for ${teeth.length} teeth`,
      );
    const claimed = new Map();
    for (const piece of pieces) {
      const middle = centerOf(pdl.positions, piece);
      let nearest = null;
      let best = Infinity;
      for (const tooth of teeth) {
        const distance = Math.hypot(
          ...tooth.center.map((value, axis) => value - middle[axis]),
        );
        if (distance < best) {
          best = distance;
          nearest = tooth;
        }
      }
      if (claimed.has(nearest.unn))
        throw new Error(
          `${jaw}: two ligament shells both claim universal ${nearest.unn}`,
        );
      claimed.set(nearest.unn, piece);
    }

    for (const tooth of teeth) {
      const basis = toothBasis(axes[String(tooth.unn)]);
      const reduced = await simplify(
        tooth.mesh.positions,
        tooth.mesh.indices,
        6000,
      );
      parts.push(
        pack(
          jawBuffer,
          `jaw-tooth-${tooth.fdi}`,
          fdiName(tooth.fdi),
          "tooth",
          "openfulljaw",
          reduced.positions,
          reduced.indices,
          {
            fdi: tooth.fdi,
            universal: tooth.unn,
            jaw,
            axes: { center: axes[String(tooth.unn)].c, ...basis },
            sourceMember: tooth.member,
            sourceSha256: tooth.sha256,
            sourceTriangles: tooth.sourceTriangles,
            simplifiedError: Number(reduced.error.toFixed(5)),
          },
        ),
      );
      const shell = claimed.get(tooth.unn);
      const ligament = await simplify(pdl.positions, shell, 3000);
      parts.push(
        pack(
          jawBuffer,
          `jaw-pdl-${tooth.fdi}`,
          `${fdiName(tooth.fdi)}, periodontal ligament`,
          "pdl",
          "openfulljaw",
          ligament.positions,
          ligament.indices,
          {
            fdi: tooth.fdi,
            universal: tooth.unn,
            jaw,
            sourceMember: `Patient_12/output/${jaw}/surface_meshes/pdls.stl`,
            sourceSha256: sha256(pdlBytes),
            sourceTriangles: shell.length / 3,
            simplifiedError: Number(ligament.error.toFixed(5)),
          },
        ),
      );
      jawUsed.push(tooth.fdi);
    }

    const boneBytes = readFileSync(
      join(JAW_ROOT, "output", jaw, "surface_meshes", "bone.stl"),
    );
    const bone = readAsciiStl(boneBytes.toString("utf8"));
    const reducedBone = await simplify(bone.positions, bone.indices, 34000);
    parts.push(
      pack(
        jawBuffer,
        `jaw-bone-${jaw}`,
        boneName,
        "bone",
        "openfulljaw",
        reducedBone.positions,
        reducedBone.indices,
        {
          jaw,
          sourceMember: `Patient_12/output/${jaw}/surface_meshes/bone.stl`,
          sourceSha256: sha256(boneBytes),
          sourceTriangles: bone.indices.length / 3,
          simplifiedError: Number(reducedBone.error.toFixed(5)),
        },
      ),
    );
  }
} else {
  console.warn(`skipped Open-Full-Jaw: no patient 12 under ${JAW_ROOT}`);
}

// Two buffers, because two licenses. Each is published on its own so the
// manifest keeps every set this script does not own, including any imported
// by scripts/import-toothfairy.mjs.
const SOURCES = {
  diaz: {
    title:
      "Data of synthetic 3D models of the human jaw, including teeth, ligaments, and bone structures",
    authors: "Cristian Diaz and colleagues",
    year: 2024,
    doi: "10.17632/xjsx7nfhj8.1",
    url: "https://data.mendeley.com/datasets/xjsx7nfhj8/1",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    units:
      "STL carries no unit. Millimeters follow the source modeling protocol; this is not a measurement tool.",
    processing:
      "Binary STL read and welded on exact coordinates. No decimation, smoothing, scaling or registration. Assembly positions are the source's own.",
    pdlModel:
      "The source built the ligament by extruding 0.25 mm radially around each root. It is a synthetic shell of even thickness, not a segmented ligament, and its width cannot be read as a measurement.",
    limits:
      "A synthetic model of one lower jaw. It carries no pulp, no cementum, no gingiva and no nerve, and it is not a patient.",
  },
  fang: {
    title: "Models for a finite element study of a band and loop space maintainer",
    authors: "Fang Fang Kang; study by Shi, Kang and Liu",
    year: 2024,
    doi: "10.6084/m9.figshare.24591537.v1",
    article: "10.7717/peerj.17456",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    units: "millimeter",
    processing:
      "STEP solids tessellated with OpenCASCADE through occt-import-js at a linear deflection of 0.0015 of the bounding box and an angular deflection of 0.5 radians. No smoothing, thinning or registration.",
    derivation:
      "Built from the cone beam CT of a seven year old in mixed dentition, so this is an immature first permanent molar and not an adult standard form.",
    pdlModel:
      "The source thickened the ligament to an even shell. Its methods give 0.15 mm and its discussion gives 0.2 mm; the paper states both.",
    limits:
      "The outer surface is not divided into enamel and dentin. The pulp cavity is the modeled cavity, not pulp tissue, and carries no apical foramen, lateral canal, vessel or nerve. Root canal length and preparation cannot be measured from it.",
    used: fangUsed,
  },
  openfulljaw: {
    title:
      "Open-Full-Jaw: an open-access dataset and pipeline for finite element models of human jaw",
    authors:
      "Torkan Gholamalizadeh, Faezeh Moshfeghifar, Zachary Ferguson, Teseo Schneider, Daniele Panozzo, Sune Darkner, Masrour Makaremi, Francois Chan, Peter Lampel Sondergaard, Kenny Erleben",
    year: 2022,
    doi: "10.1016/j.cmpb.2022.107009",
    url: "https://github.com/diku-dk/Open-Full-Jaw",
    license: "CC BY-NC-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    patient: "Patient 12 of 17",
    units: "millimeter",
    processing:
      "Per tooth binary STL and the jaw's ASCII STL bone and ligament surfaces, welded and simplified with meshoptimizer to 6,000 triangles a tooth, 3,000 a ligament and 34,000 a jaw of bone. The ligament arrives as one mesh per jaw and is separated into its connected shells, one per tooth. Nothing is smoothed, thickened or moved: both arches are in the coordinate frame the scan was segmented in.",
    derivation:
      "Segmented from the cone beam CT of one adult patient and clinically validated by the study. This is one person's mouth, not a standard form: the teeth are worn and tipped as that patient's teeth are, and one upper first molar is missing because that patient is missing it.",
    pdlModel:
      "The study generated the ligament as the gap between each root and its socket rather than by extruding a fixed thickness, so its width varies as the socket does. It is still a generated surface and not segmented ligament tissue.",
    limits:
      "Bone, teeth and ligament only. There is no pulp and no canal in this dataset, so a tooth from it cannot be opened to show one, and no enamel and dentin division, no cementum, no gingiva and no nerve. Being one patient is what makes it real and also what makes it not a norm. Redistributed under CC BY-NC-SA 4.0: not for commercial use, and any derivative of it carries the same terms. That is not the license the rest of this atlas carries.",
    used: jawUsed,
  },
};

publish({
  buffer: dentalBuffer,
  owns: ["diaz", "fang"],
  sources: { diaz: SOURCES.diaz, fang: SOURCES.fang },
  parts: parts.filter((part) => part.buffer === dentalBuffer.name),
});
if (jawBuffer.bytes)
  publish({
    buffer: jawBuffer,
    owns: ["openfulljaw"],
    sources: { openfulljaw: SOURCES.openfulljaw },
    parts: parts.filter((part) => part.buffer === jawBuffer.name),
  });
