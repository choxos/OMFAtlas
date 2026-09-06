import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("registered facial assets contain authentic muscle coverage and valid geometry", () => {
  const atlas = JSON.parse(readFileSync(new URL("../public/models/facial/atlas.json", import.meta.url)));
  const raw = readFileSync(new URL("../public/models/facial/facial.bin", import.meta.url));
  const buffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  assert.equal(atlas.license, "CC-BY-SA-2.1-JP");
  assert.equal(atlas.parts.length, 47);
  assert.equal(raw.length, atlas.bytes);
  assert.equal(new Set(atlas.parts.map(p => p.id)).size, 47);
  for (const name of ["masseter", "temporalis", "pterygoid", "orbicularis oris", "orbicularis oculi"])
    assert.ok(atlas.parts.some(p => p.name.toLowerCase().includes(name)), name);
  for (const part of atlas.parts) {
    assert.equal(part.group, "muscles");
    assert.match(part.sourceSha256, /^[0-9a-f]{64}$/);
    const positions = new Float32Array(buffer, part.positions, part.vertexCount * 3);
    const indices = new Uint32Array(buffer, part.indices, part.indexCount);
    positions.forEach((v, i) => {
      assert.ok(Number.isFinite(v));
      assert.ok(v >= part.bounds[0][i % 3] - 1e-6 && v <= part.bounds[1][i % 3] + 1e-6);
      if (i % 3 === 1) assert.ok(v >= 1.438);
    });
    indices.forEach(i => assert.ok(i < part.vertexCount));
  }
});
