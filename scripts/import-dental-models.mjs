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
// Both are redistributed under CC BY 4.0; see public/models/dental/
// ATTRIBUTION.md. Nothing here is segmented from a patient scan by this
// project, and nothing is registered onto the head assembly: these are their
// own models in their own coordinate frames, and the manifest records the
// transform this atlas applies to view them.
//
// Usage: node scripts/import-dental-models.mjs [refs-directory]

import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import occtimportjs from "occt-import-js";
import { MeshoptSimplifier } from "meshoptimizer";

const REFS = process.argv[2] || "documentation/refs";
const OUT = "public/models/dental";

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

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Every file under a directory. Names here carry spaces, commas and CJK, and
 *  macOS and Linux disagree about how to normalize the last of those, so
 *  nothing in this script addresses a source file by its name. */
function walk(directory) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...walk(path));
    else if (entry.isFile()) found.push(path);
  }
  return found;
}

function findOne(files, ends, what) {
  const matches = files.filter((path) => path.endsWith(ends));
  if (matches.length !== 1)
    throw new Error(
      `expected one ${what} under ${REFS}, found ${matches.length} for ${ends}`,
    );
  return matches[0];
}

/** Binary STL to indexed triangles, welding on exact coordinates. */
function readBinaryStl(bytes) {
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );
  const count = view.getUint32(80, true);
  const positions = [];
  const indices = [];
  const seen = new Map();
  for (let t = 0; t < count; t++) {
    const base = 84 + t * 50 + 12;
    for (let corner = 0; corner < 3; corner++) {
      const at = base + corner * 12;
      const x = view.getFloat32(at, true);
      const y = view.getFloat32(at + 4, true);
      const z = view.getFloat32(at + 8, true);
      const key = `${x},${y},${z}`;
      let index = seen.get(key);
      if (index === undefined) {
        index = positions.length / 3;
        seen.set(key, index);
        positions.push(x, y, z);
      }
      indices.push(index);
    }
  }
  return {
    positions: Float32Array.from(positions),
    indices: Uint32Array.from(indices),
  };
}

/** Merge vertices that share a coordinate. The STEP tessellator emits every
 *  face separately, which leaves a seam at every patch boundary: the surface
 *  is closed but the mesh is not, and nothing can be simplified across it.
 *  Six decimals of a millimeter is far below the tessellation tolerance. */
function weld(positions, indices) {
  const seen = new Map();
  const merged = [];
  const remap = new Uint32Array(positions.length / 3);
  for (let v = 0; v < positions.length / 3; v++) {
    const key = `${positions[v * 3].toFixed(6)},${positions[v * 3 + 1].toFixed(6)},${positions[v * 3 + 2].toFixed(6)}`;
    let at = seen.get(key);
    if (at === undefined) {
      at = merged.length / 3;
      seen.set(key, at);
      merged.push(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]);
    }
    remap[v] = at;
  }
  const out = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++) out[i] = remap[indices[i]];
  return { positions: Float32Array.from(merged), indices: out };
}

/** Collapse to a triangle budget, keeping the boundary and reporting the error
 *  so the manifest can carry it. A tooth that has to travel over the network
 *  cannot arrive at its CAD tessellation density. */
async function simplify(positions, indices, target) {
  if (indices.length / 3 <= target) return { positions, indices, error: 0 };
  await MeshoptSimplifier.ready;
  const [collapsed, error] = MeshoptSimplifier.simplify(
    indices,
    positions,
    3,
    target * 3,
    0.02,
    ["LockBorder"],
  );
  return { positions, indices: collapsed, error };
}

/** Area weighted vertex normals, so a welded mesh shades smoothly. */
function vertexNormals(positions, indices) {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [indices[i] * 3, indices[i + 1] * 3, indices[i + 2] * 3];
    const ux = positions[b] - positions[a],
      uy = positions[b + 1] - positions[a + 1],
      uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a],
      vy = positions[c + 1] - positions[a + 1],
      vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    for (const at of [a, b, c]) {
      normals[at] += nx;
      normals[at + 1] += ny;
      normals[at + 2] += nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const length =
      Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= length;
    normals[i + 1] /= length;
    normals[i + 2] /= length;
  }
  return normals;
}

function boundsOf(positions) {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3)
    for (let axis = 0; axis < 3; axis++) {
      const value = positions[i + axis];
      if (value < lo[axis]) lo[axis] = value;
      if (value > hi[axis]) hi[axis] = value;
    }
  return [lo, hi];
}

/** Count edges used by exactly one triangle: a closed surface has none. */
function openEdges(indices) {
  const edges = new Map();
  for (let i = 0; i < indices.length; i += 3)
    for (const [a, b] of [
      [indices[i], indices[i + 1]],
      [indices[i + 1], indices[i + 2]],
      [indices[i + 2], indices[i]],
    ]) {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  let open = 0;
  for (const uses of edges.values()) if (uses === 1) open++;
  return open;
}

const chunks = [];
let offset = 0;
function append(array) {
  // Float32Array and Uint32Array both want four byte alignment.
  if (offset % 4) {
    const pad = 4 - (offset % 4);
    chunks.push(Buffer.alloc(pad));
    offset += pad;
  }
  const at = offset;
  const buffer = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
  chunks.push(buffer);
  offset += buffer.length;
  return at;
}

function compact(positions, indices) {
  const remap = new Int32Array(positions.length / 3).fill(-1);
  const kept = [];
  const out = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++) {
    const v = indices[i];
    if (remap[v] < 0) {
      remap[v] = kept.length / 3;
      kept.push(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]);
    }
    out[i] = remap[v];
  }
  return { positions: Float32Array.from(kept), indices: out };
}

function pack(id, name, group, source, rawPositions, rawIndices, extra = {}) {
  const { positions, indices } = compact(rawPositions, rawIndices);
  const normals = vertexNormals(positions, indices);
  const part = {
    id,
    name,
    group,
    source,
    positions: append(positions),
    normals: append(normals),
    indices: append(indices),
    vertexCount: positions.length / 3,
    indexCount: indices.length,
    bounds: boundsOf(positions),
    openEdges: openEdges(indices),
    ...extra,
  };
  return part;
}

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
    pack(id, name, group, "diaz", positions, indices, {
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
    pack(`fang-${id}`, spec.name, id === "maintainer" ? "appliance" : id, "fang", reduced.positions, reduced.indices, {
      fdi: id === "maintainer" ? null : 46,
      sourceSha256: spec.sha256,
      cadTriangles,
      simplifiedError: Number(reduced.error.toFixed(5)),
    }),
  );
  fangUsed.push(id);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "dental.bin"), Buffer.concat(chunks));

const manifest = {
  generatedBy: "scripts/import-dental-models.mjs",
  buffer: "dental.bin",
  bufferBytes: offset,
  sources: {
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
  },
  parts,
};
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1));

const triangles = parts.reduce((sum, part) => sum + part.indexCount / 3, 0);
console.log(
  `${parts.length} parts, ${triangles.toLocaleString()} triangles, ${(offset / 1e6).toFixed(1)} MB`,
);
for (const part of parts)
  if (part.openEdges)
    console.log(`  ${part.id}: ${part.openEdges} open edges`);
