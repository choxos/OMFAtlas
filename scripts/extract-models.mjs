import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

// Run against a checkout of https://github.com/ashemag/human-atlas.
const source = resolve(process.argv[2] || "../human-atlas", "public/models");
const atlas = JSON.parse(readFileSync(resolve(source, "atlas.json"), "utf8"));
// Inferior edge of the C7 disk, in the source's meter coordinates.
const neckFloor = 1.438;
const torsoOnly = /thoracic vertebra|\brib\b|intercostal|levatores costarum|thoracic rotator|thoracis|rhomboid|serratus posterior|Transverse part of .*trapezius|dorsal scapular artery/i;
const neck = /^(Atlas|Axis|(?:Third|Fourth|Fifth|Sixth|Seventh) cervical vertebra|Intervertebral disk of (?:axis|(?:third|fourth|fifth|sixth|seventh) cervical vertebra))$/i;

function groupOf({ name, system }) {
  if (/tooth/i.test(name)) return "teeth";
  if (/gingiva/i.test(name)) return "gingiva";
  if (neck.test(name)) return "neck";
  if (system === "arterial") return "arteries";
  if (system === "venous") return "veins";
  if (/nerve|ganglion/i.test(name)) return "nerves";
  if (system === "nervous" || system === "cardiac" || /choroid plexus|pineal|pituitary/i.test(name)) return "brain";
  if (system === "muscular" || /levator scapulae|pharyngeal constrictor|palatopharyngeus|salpingopharyngeus|stylopharyngeus/i.test(name)) return "muscles";
  if (/gland/i.test(name)) return "glands";
  if (/lacrimal bone|nasal concha/i.test(name)) return "bones";
  if (system === "sensory" && !/External ear/i.test(name)) return "eyes";
  if (system === "respiratory" || /cartilage|epiglottic|conus elasticus|vocal ligament|thyrohyoid|cricothyroid/i.test(name)) return "airway";
  if (system === "skeletal") return "bones";
  if (system === "integumentary") return "skin";
  return "soft";
}

// Clip crossing triangles, preserving branches to the crop plane. Cut ends stay
// open: the extraction does not invent anatomical caps or missing structures.
function clipAtNeck(positions, normals, indices) {
  const outPositions = [], outNormals = [], outIndices = [], mapped = new Map();
  const vertex = i => ({ key: String(i), p: Array.from(positions.subarray(i * 3, i * 3 + 3)), n: Array.from(normals.subarray(i * 3, i * 3 + 3)) });
  function crossing(a, b) {
    const t = (neckFloor - a.p[1]) / (b.p[1] - a.p[1]);
    const p = a.p.map((v, axis) => axis === 1 ? neckFloor : v + t * (b.p[axis] - v));
    const n = a.n.map((v, axis) => v + t * (b.n[axis] - v));
    const length = Math.hypot(...n) || 1;
    return { key: [a.key, b.key].sort().join(":"), p, n: n.map(v => Math.round(v / length * 32767)) };
  }
  function emit(v) {
    if (!mapped.has(v.key)) {
      mapped.set(v.key, outPositions.length / 3);
      outPositions.push(...v.p); outNormals.push(...v.n);
    }
    outIndices.push(mapped.get(v.key));
  }
  for (let i = 0; i < indices.length; i += 3) {
    const triangle = [vertex(indices[i]), vertex(indices[i + 1]), vertex(indices[i + 2])], polygon = [];
    for (let j = 0; j < 3; j++) {
      const a = triangle[j], b = triangle[(j + 1) % 3];
      const insideA = a.p[1] >= neckFloor, insideB = b.p[1] >= neckFloor;
      if (insideA) polygon.push(a);
      if (insideA !== insideB) polygon.push(crossing(a, b));
    }
    for (let j = 1; j + 1 < polygon.length; j++) {
      emit(polygon[0]); emit(polygon[j]); emit(polygon[j + 1]);
    }
  }
  return [new Float32Array(outPositions), new Int16Array(outNormals), new Uint32Array(outIndices)];
}

// Small executable boundary check: one crossing triangle becomes two, not a hole.
const [checkPositions, , checkIndices] = clipAtNeck(
  new Float32Array([0, 1.4, 0, 1, 1.5, 0, -1, 1.5, 0]),
  new Int16Array([0, 0, 32767, 0, 0, 32767, 0, 0, 32767]),
  new Uint32Array([0, 1, 2]),
);
assert.equal(checkIndices.length, 6);
assert(checkPositions.every((v, i) => i % 3 !== 1 || v >= neckFloor - 1e-6));

const chunks = new Map(), buffers = [], parts = [], excluded = [];
let offset = 0;
for (const original of atlas.parts) {
  if (original.bounds[1][1] < neckFloor || torsoOnly.test(original.name)) {
    excluded.push({ name: original.name, reason: original.bounds[1][1] < neckFloor ? "below neck crop" : "torso / shoulder-only structure" });
    continue;
  }
  if (!chunks.has(original.chunk)) chunks.set(original.chunk, readFileSync(resolve(source, `body-${original.chunk}.bin`)));
  const input = chunks.get(original.chunk);
  let positions = new Float32Array(input.buffer, input.byteOffset + original.positions, original.vertexCount * 3);
  let normals = new Int16Array(input.buffer, input.byteOffset + original.normals, original.vertexCount * 3);
  let indices = new Uint32Array(input.buffer, input.byteOffset + original.indices, original.indexCount);
  for (const value of positions) assert(Number.isFinite(value), `${original.id}: nonfinite vertex`);
  for (const index of indices) assert(index < original.vertexCount, `${original.id}: invalid source index`);
  const clipped = original.bounds[0][1] < neckFloor;
  if (clipped) [positions, normals, indices] = clipAtNeck(positions, normals, indices);
  if (!indices.length) continue;
  const bounds = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]];
  for (let i = 0; i < positions.length; i++) {
    assert(Number.isFinite(positions[i]));
    bounds[0][i % 3] = Math.min(bounds[0][i % 3], positions[i]);
    bounds[1][i % 3] = Math.max(bounds[1][i % 3], positions[i]);
  }
  assert(bounds[0][1] >= neckFloor - 1e-6, `${original.id}: below neck crop`);
  assert.equal(indices.length % 3, 0);
  for (const index of indices) assert(index < positions.length / 3);
  const part = { ...original, group: groupOf(original), vertexCount: positions.length / 3, indexCount: indices.length, bounds, clipped };
  for (const [field, array] of [["positions", positions], ["normals", normals], ["indices", indices]]) {
    const padding = (4 - offset % 4) % 4;
    if (padding) { buffers.push(Buffer.alloc(padding)); offset += padding; }
    part[field] = offset;
    const buffer = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    buffers.push(buffer); offset += buffer.length;
  }
  delete part.chunk;
  parts.push(part);
}
assert(parts.some(p => p.group === "veins"));
assert(parts.some(p => p.group === "muscles"));
assert(!parts.some(p => torsoOnly.test(p.name)));
mkdirSync("public/models", { recursive: true });
writeFileSync("public/models/omf.bin", Buffer.concat(buffers));
writeFileSync("public/models/atlas.json", JSON.stringify({
  source: atlas.source, version: atlas.version,
  scope: "Adult male source; head and neck above y=1.438 m, not an exhaustive anatomy atlas",
  crop: { axis: "y", minimum: neckFloor, openCutSurfaces: true },
  sourceMeshCount: atlas.parts.length, excludedMeshCount: excluded.length, parts,
}, null, 2));
console.log(`Extracted ${parts.length} meshes, ${(offset / 1e6).toFixed(2)} MB; ${parts.filter(p => p.clipped).length} clipped at neck floor`);
console.log(Object.fromEntries([...new Set(parts.map(p => p.group))].map(group => [group, parts.filter(p => p.group === group).length])));
console.log("Excluded intersecting torso structures:", excluded.filter(p => p.reason !== "below neck crop").map(p => p.name));
