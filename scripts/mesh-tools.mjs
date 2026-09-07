// Shared mesh handling for the dental importers.
//
// Each published set has its own importer, because each has its own source
// archive and its own license, and the archives run to gigabytes. Nobody
// should need all of them on disk to rebuild one of them. What every importer
// does need is the same: read a surface, weld it, collapse it to something
// that can cross a network, and write it into a buffer with enough recorded
// about it that a reader can check the claim.
//
// The manifest is merged rather than rewritten. An importer owns the sources
// it names and replaces only those parts; everything else in
// public/models/dental/manifest.json is carried through untouched.

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { MeshoptSimplifier } from "meshoptimizer";

export const OUT = "public/models/dental";

export
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Every file under a directory. Names here carry spaces, commas and CJK, and
 *  macOS and Linux disagree about how to normalize the last of those, so
 *  nothing in this script addresses a source file by its name. */
export
function walk(directory) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...walk(path));
    else if (entry.isFile()) found.push(path);
  }
  return found;
}

export
function findOne(files, ends, what) {
  const matches = files.filter((path) => path.endsWith(ends));
  if (matches.length !== 1)
    throw new Error(
      `expected one ${what} under ${REFS}, found ${matches.length} for ${ends}`,
    );
  return matches[0];
}

/** Binary STL to indexed triangles, welding on exact coordinates. */
export
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
export
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
export
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
export
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

export
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
export
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

/** One output buffer. Each set of parts writes into its own, because the
 *  license a reader accepts by downloading them is not the same one. */
export
function writer(name, file) {
  const chunks = [];
  let offset = 0;
  return {
    name,
    file,
    get bytes() {
      return offset;
    },
    append(array) {
      // Float32Array and Uint32Array both want four byte alignment.
      if (offset % 4) {
        const pad = 4 - (offset % 4);
        chunks.push(Buffer.alloc(pad));
        offset += pad;
      }
      const at = offset;
      const buffer = Buffer.from(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      chunks.push(buffer);
      offset += buffer.length;
      return at;
    },
    concat: () => Buffer.concat(chunks),
  };
}

export
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

export
function pack(into, id, name, group, source, rawPositions, rawIndices, extra = {}) {
  const { positions, indices } = compact(rawPositions, rawIndices);
  const normals = vertexNormals(positions, indices);
  const part = {
    id,
    name,
    group,
    source,
    buffer: into.name,
    positions: into.append(positions),
    normals: into.append(normals),
    indices: into.append(indices),
    vertexCount: positions.length / 3,
    indexCount: indices.length,
    bounds: boundsOf(positions),
    openEdges: openEdges(indices),
    ...extra,
  };
  return part;
}


/** Write one buffer and fold its parts into the manifest, leaving every other
 *  set's entries exactly as they were. */
export function publish({ buffer, owns, sources, parts }) {
  const manifestPath = join(OUT, "manifest.json");
  const previous = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : { generatedBy: [], sources: {}, buffers: {}, parts: [] };

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, buffer.file), buffer.concat());

  const kept = (previous.parts || []).filter(
    (part) => !owns.includes(part.source),
  );
  const generators = new Set(
    [previous.generatedBy].flat().filter(Boolean),
  );
  generators.add(process.argv[1].replace(/^.*?(scripts\/)/, "$1"));

  const manifest = {
    generatedBy: [...generators].sort(),
    buffers: {
      ...previous.buffers,
      [buffer.name]: { file: buffer.file, bytes: buffer.bytes },
    },
    sources: { ...previous.sources, ...sources },
    // Parts are grouped by the buffer they live in and ordered inside it, so
    // the manifest reads the same however many importers have run.
    parts: [...kept, ...parts].sort(
      (a, b) =>
        a.buffer.localeCompare(b.buffer) || a.positions - b.positions,
    ),
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));

  const triangles = parts.reduce((sum, part) => sum + part.indexCount / 3, 0);
  console.log(
    `${buffer.file}: ${parts.length} parts, ${triangles.toLocaleString()} triangles, ${(buffer.bytes / 1e6).toFixed(1)} MB`,
  );
  for (const part of parts)
    if (part.openEdges)
      console.log(`  ${part.id}: ${part.openEdges} open edges`);
  return manifest;
}
