import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

// node scripts/upgrade-resolution.mjs /path/to/extracted/isa_BP3D_4.0_obj_99
// Official OBJ topology, before human-atlas's additional mesh simplification.
const source = process.argv[2];
if (!source || source === "--help") {
  console.log("Usage: node scripts/upgrade-resolution.mjs OBJ_DIRECTORY\nDownload: https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip");
  process.exit(source === "--help" ? 0 : 1);
}
assert(existsSync(source), "OBJ directory does not exist");
const atlas = JSON.parse(readFileSync("public/models/atlas.json", "utf8"));
const baseBuffer = readFileSync("public/models/omf.bin");
const floor = atlas.crop.minimum;
const output = "public/models/high-resolution";
mkdirSync(output, { recursive: true });
const parts = [], missing = [], unchanged = [];

function geometry(text) {
  const vertices = [], normals = [], triangles = [];
  for (const line of text.split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/);
    if (fields[0] === "v") {
      const [x, y, z] = fields.slice(1, 4).map(Number);
      vertices.push([x * .001, z * .001 + .0781112, -y * .001 - .1]);
    } else if (fields[0] === "vn") {
      const [x, y, z] = fields.slice(1, 4).map(Number);
      normals.push([x, z, -y]);
    } else if (fields[0] === "f") {
      const face = fields.slice(1).map(token => {
        const [v, , n] = token.split("/").map(Number);
        return [v < 0 ? vertices.length + v : v - 1, n < 0 ? normals.length + n : n - 1];
      });
      for (let i = 1; i + 1 < face.length; i++) triangles.push([face[0], face[i], face[i + 1]]);
    }
  }
  const positions = [], packedNormals = [], indices = [], mapped = new Map();
  function vertex([v, n]) {
    assert(vertices[v] && normals[n], "OBJ face has missing vertex/normal");
    return { key: `${v}/${n}`, p: vertices[v], n: normals[n] };
  }
  function crossing(a, b) {
    const t = (floor - a.p[1]) / (b.p[1] - a.p[1]);
    return {
      key: [a.key, b.key].sort().join(":"),
      p: a.p.map((v, i) => i === 1 ? floor : v + t * (b.p[i] - v)),
      n: a.n.map((v, i) => v + t * (b.n[i] - v)),
    };
  }
  function emit(v) {
    if (!mapped.has(v.key)) {
      mapped.set(v.key, positions.length / 3);
      positions.push(...v.p);
      const length = Math.hypot(...v.n) || 1;
      packedNormals.push(...v.n.map(n => Math.round(n / length * 32767)));
    }
    indices.push(mapped.get(v.key));
  }
  for (const triangle of triangles) {
    const polygon = [], points = triangle.map(vertex);
    for (let i = 0; i < 3; i++) {
      const a = points[i], b = points[(i + 1) % 3];
      if (a.p[1] >= floor) polygon.push(a);
      if ((a.p[1] >= floor) !== (b.p[1] >= floor)) polygon.push(crossing(a, b));
    }
    for (let i = 1; i + 1 < polygon.length; i++) [polygon[0], polygon[i], polygon[i + 1]].forEach(emit);
  }
  return [new Float32Array(positions), new Int16Array(packedNormals), new Uint32Array(indices)];
}

for (const part of atlas.parts) {
  const path = resolve(source, `${part.id}.obj`);
  if (!existsSync(path)) { missing.push(part.id); continue; }
  const [positions, normals, indices] = geometry(readFileSync(path, "utf8"));
  assert.equal(indices.length % 3, 0);
  assert.equal(positions.length, normals.length);
  for (const index of indices) assert(index < positions.length / 3);
  const bounds = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]];
  positions.forEach((value, i) => {
    assert(Number.isFinite(value));
    bounds[0][i % 3] = Math.min(bounds[0][i % 3], value);
    bounds[1][i % 3] = Math.max(bounds[1][i % 3], value);
  });
  assert(bounds[0][1] >= floor - 1e-6, `${part.id}: below crop`);
  if (indices.length <= part.indexCount) { unchanged.push(part.id); continue; }
  // Simplification may remove small disconnected islands, changing the bounds.
  // Check retained base vertices instead, away from newly clipped edges.
  const base = new Float32Array(baseBuffer.buffer, baseBuffer.byteOffset + part.positions, part.vertexCount * 3);
  let checked = 0;
  for (let i = 0; i < base.length && checked < 5; i += 3) {
    if (base[i + 1] < floor + .001) continue;
    let found = false;
    for (let j = 0; j < positions.length && !found; j += 3) found = Math.hypot(base[i] - positions[j], base[i + 1] - positions[j + 1], base[i + 2] - positions[j + 2]) < 1e-6;
    assert(found, `${part.id}: coordinate mismatch`);
    checked++;
  }
  const upgraded = { id: part.id, name: part.name, url: `/models/high-resolution/${part.id}.bin`, vertexCount: positions.length / 3, indexCount: indices.length, baseIndexCount: part.indexCount, bounds };
  const buffers = []; let offset = 0;
  for (const [field, array] of [["positions", positions], ["normals", normals], ["indices", indices]]) {
    const padding = (4 - offset % 4) % 4;
    if (padding) { buffers.push(Buffer.alloc(padding)); offset += padding; }
    upgraded[field] = offset;
    const buffer = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    buffers.push(buffer); offset += buffer.length;
  }
  upgraded.bytes = offset;
  writeFileSync(`${output}/${part.id}.bin`, Buffer.concat(buffers));
  parts.push(upgraded);
}
assert(parts.length, "No actual resolution improvements found");
const manifest = { source: "BodyParts3D 4.0 official 99% reduction archive, without additional human-atlas simplification", sourceUrl: "https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip", crop: atlas.crop, parts, missing, unchanged };
writeFileSync(`${output}/atlas.json`, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ upgraded: parts.length, missing, unchanged, baseTriangles: parts.reduce((n, p) => n + p.baseIndexCount / 3, 0), upgradedTriangles: parts.reduce((n, p) => n + p.indexCount / 3, 0), bytes: parts.reduce((n, p) => n + p.bytes, 0) }, null, 2));
