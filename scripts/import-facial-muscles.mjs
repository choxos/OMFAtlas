import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

// Source preparation and multi-bone registration: documentation/qa/FACIAL-SOURCE.md.
const source = process.argv[2];
if (!source || source === "--help") {
  console.log("Usage: node scripts/import-facial-muscles.mjs SOURCE_DIRECTORY\nDirectory must contain selected.json and objs/FMA*.obj from the official 3.0 95% archive.");
  process.exit(source === "--help" ? 0 : 1);
}
const records = JSON.parse(readFileSync(resolve(source, "selected.json"), "utf8"));
const scale = 1.059369874098004;
const rotation = [[.9999999697814653, -.00022542358070208187, .00009808811509434028], [.00022540964137606034, .9999999644993117, .00014209810025212806], [-.00009812014387505785, -.000142075985950868, .9999999850934261]];
const translationMm = [-.15057996010419217, 15.397670982185474, -99.29859059211003];
const rotate = v => rotation.map(row => row.reduce((n, r, i) => n + r * v[i], 0));
const controls = new Set(["FMA52734", "FMA52748", "FMA53649", "FMA53650"]);
const segments = [], parts = []; let offset = 0;
for (const record of records) {
  if (controls.has(record.id)) continue;
  assert(/^FMA\d+$/.test(record.id));
  const raw = readFileSync(resolve(source, "objs", `${record.id}.obj`));
  const vertices = [], normalValues = [], indexValues = [];
  for (const line of raw.toString().split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/);
    if (fields[0] === "v") {
      const [x, y, z] = rotate(fields.slice(1, 4).map(Number)).map((v, i) => scale * v + translationMm[i]);
      vertices.push(x * .001, z * .001 + .0781112, -y * .001 - .1);
    } else if (fields[0] === "vn") {
      const [x, y, z] = rotate(fields.slice(1, 4).map(Number));
      const length = Math.hypot(x, y, z);
      assert(length > 0 && Number.isFinite(length));
      normalValues.push(...[x, z, -y].map(v => Math.round(v / length * 32767)));
    } else if (fields[0] === "f") {
      const face = fields.slice(1).map(token => {
        const [v, , n] = token.split("/").map(Number);
        assert.equal(v, n, `${record.id}: independent OBJ normal indices require remapping`);
        return v - 1;
      });
      for (let i = 1; i + 1 < face.length; i++) indexValues.push(face[0], face[i], face[i + 1]);
    }
  }
  assert.equal(vertices.length, normalValues.length);
  assert.equal(indexValues.length, record.faces * 3);
  assert.equal(vertices.length, record.vertices * 3);
  const positions = new Float32Array(vertices), normals = new Int16Array(normalValues), indices = new Uint32Array(indexValues);
  const bounds = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]];
  positions.forEach((v, i) => {
    assert(Number.isFinite(v));
    bounds[0][i % 3] = Math.min(bounds[0][i % 3], v);
    bounds[1][i % 3] = Math.max(bounds[1][i % 3], v);
  });
  assert(bounds[0][1] >= 1.438, `${record.id}: muscle below atlas crop`);
  for (const index of indices) assert(index < positions.length / 3);
  const part = { id: `BP3-${record.id}`, conceptId: record.id, name: record.name[0].toUpperCase() + record.name.slice(1), system: "muscular", group: "muscles", bufferUrl: "/models/facial/facial.bin", vertexCount: positions.length / 3, indexCount: indices.length, bounds, sourceVersion: "BodyParts3D 3.0", sourceSha256: createHash("sha256").update(raw).digest("hex") };
  for (const [field, array] of [["positions", positions], ["normals", normals], ["indices", indices]]) {
    const padding = (4 - offset % 4) % 4;
    if (padding) { segments.push(Buffer.alloc(padding)); offset += padding; }
    part[field] = offset;
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    segments.push(bytes); offset += bytes.length;
  }
  parts.push(part);
}
assert.equal(parts.length, 47, "Expected verified 47 facial and masticatory muscles");
assert.equal(new Set(parts.map(p => p.id)).size, parts.length);
mkdirSync("public/models/facial", { recursive: true });
writeFileSync("public/models/facial/facial.bin", Buffer.concat(segments));
writeFileSync("public/models/facial/atlas.json", JSON.stringify({
  source: "BodyParts3D 3.0, official 95% polygon-reduction archive",
  sourceUrl: "https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/BodyParts3D_3.0_obj_95.zip",
  license: "CC-BY-SA-2.1-JP",
  attribution: "BodyParts3D, Copyright© The Database Center for Life Science licensed by CC Attribution-Share Alike 2.1 Japan",
  adaptation: "Similarity-registered to 4.0 using shared bones, meter/Y-up conversion, Int16 normals, binary packing; topology unchanged",
  registration: { scale, rotation, translationMm, trainingBones: ["FMA52748", "FMA52734", "FMA53649"], heldOutBone: "FMA53650", heldOutSourceToTargetSurfaceRmsMm: .2583466353828061, heldOutTargetToSourceSurfaceRmsMm: .08919988835896876, report: "documentation/qa/FACIAL-SOURCE.md" },
  bytes: offset, parts,
}, null, 2));
console.log(JSON.stringify({ parts: parts.length, triangles: parts.reduce((n, p) => n + p.indexCount / 3, 0), bytes: offset }));
