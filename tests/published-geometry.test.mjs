// The shipped binaries, checked against the manifest that describes them.
//
// Every other dental test reads the manifest. That is where a whole class of
// defect hides: reflecting every vertex of the ToothFairy patient in X, and
// leaving the manifest alone, passed all 26 of them, including the one named
// "the patient is not mirrored". The bounds a laterality check reads are
// written by the importer from the positions, so in a real build they cannot
// disagree, but nothing was checking that they still agree in what ships.
//
// So this file reads the actual vertices out of the actual .bin files.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publishedToothPlan } from "../src/dental-models.js";

const DIR = new URL("../public/models/dental/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", DIR)));
const buffers = {};
for (const [name, entry] of Object.entries(manifest.buffers)) {
  const bytes = readFileSync(new URL(entry.file, DIR));
  buffers[name] = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
}

const positionsOf = (part) =>
  new Float32Array(buffers[part.buffer], part.positions, part.vertexCount * 3);
const indicesOf = (part) =>
  new Uint32Array(buffers[part.buffer], part.indices, part.indexCount);

/** Bounds measured from the vertices themselves, never from the manifest. */
function measure(part) {
  const positions = positionsOf(part);
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i++) {
    const axis = i % 3;
    if (positions[i] < lo[axis]) lo[axis] = positions[i];
    if (positions[i] > hi[axis]) hi[axis] = positions[i];
  }
  return { lo, hi, mid: lo.map((low, axis) => (low + hi[axis]) / 2) };
}

const measured = new Map(manifest.parts.map((p) => [p.id, measure(p)]));
const at = (id, axis) => measured.get(id).mid[axis];

test("the manifest describes the bytes that actually shipped", () => {
  for (const [name, entry] of Object.entries(manifest.buffers))
    assert.equal(
      buffers[name].byteLength,
      entry.bytes,
      `${entry.file} is not the size the manifest gives`,
    );
  for (const part of manifest.parts) {
    const { lo, hi } = measured.get(part.id);
    for (let axis = 0; axis < 3; axis++) {
      assert.ok(
        Math.abs(lo[axis] - part.bounds[0][axis]) < 1e-4 &&
          Math.abs(hi[axis] - part.bounds[1][axis]) < 1e-4,
        `${part.id} bounds do not match its vertices on axis ${axis}`,
      );
    }
    for (const value of positionsOf(part))
      assert.ok(Number.isFinite(value), `${part.id} has a non finite vertex`);
    for (const index of indicesOf(part))
      assert.ok(
        index < part.vertexCount,
        `${part.id} indexes a vertex it does not have`,
      );
  }
});

// Both patient datasets model a jaw the same way: x toward the patient's
// left, y posterior, z superior. Every one of these is read off the vertices.
for (const [source, prefix] of [
  ["toothfairy", "tf-tooth-"],
  ["openfulljaw", "jaw-tooth-"],
])
  test(`${source} is not mirrored, measured from its own vertices`, () => {
    const has = (fdi) => measured.has(`${prefix}${fdi}`);
    const x = (fdi) => at(`${prefix}${fdi}`, 0);
    const z = (fdi) => at(`${prefix}${fdi}`, 2);
    const y = (fdi) => at(`${prefix}${fdi}`, 1);

    // Quadrants 2 and 3 are the patient's left, 1 and 4 their right. Negating
    // one axis to correct an upside down scan swaps them, and then every side
    // bearing name in this atlas is on the wrong side of a real person.
    for (const [left, right] of [
      [36, 46],
      [37, 47],
      [33, 43],
      [21, 11],
      [23, 13],
    ]) {
      if (!has(left) || !has(right)) continue;
      assert.ok(
        x(left) > x(right),
        `FDI ${left} must sit to the patient's left of FDI ${right}`,
      );
    }
    // Every upper tooth above every lower one, from the vertices.
    const uppers = manifest.parts
      .filter((p) => p.id.startsWith(prefix) && p.fdi < 30)
      .map((p) => at(p.id, 2));
    const lowers = manifest.parts
      .filter((p) => p.id.startsWith(prefix) && p.fdi > 30)
      .map((p) => at(p.id, 2));
    assert.ok(
      Math.min(...uppers) > Math.max(...lowers),
      "an upper tooth is not above every lower one",
    );
    // Molars behind incisors: y runs posteriorly.
    for (const [molar, incisor] of [
      [47, 41],
      [37, 31],
      [17, 11],
    ]) {
      if (!has(molar) || !has(incisor)) continue;
      assert.ok(y(molar) > y(incisor), `FDI ${molar} must sit behind ${incisor}`);
    }
    assert.ok(uppers.length && lowers.length, "no teeth measured");
  });

test("the alveolar canals are on the sides they are named for", () => {
  const left = measured.get("tf-canal-left");
  const right = measured.get("tf-canal-right");
  assert.ok(left && right, "both canals ship");
  assert.ok(left.mid[0] > right.mid[0], "the canals are swapped");
  // Each canal sits beside its own side's molars and below their crowns.
  for (const [fdi, canal] of [
    [37, left],
    [47, right],
  ]) {
    const molar = measured.get(`tf-tooth-${fdi}`);
    assert.ok(
      Math.abs(canal.mid[0] - molar.mid[0]) < 12,
      `the canal beside FDI ${fdi} is on the wrong side`,
    );
    assert.ok(
      canal.lo[2] < molar.lo[2],
      `the canal beside FDI ${fdi} does not run below it`,
    );
  }
});

/** Every edge, and how many triangles use it. One use is a hole; more than
 *  two is a non manifold junction, which `openEdges` alone never sees. */
function edgeUse(part) {
  const indices = indicesOf(part);
  const uses = new Map();
  let degenerate = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]];
    if (a === b || b === c || a === c) degenerate++;
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      const key = u < v ? `${u}_${v}` : `${v}_${u}`;
      uses.set(key, (uses.get(key) || 0) + 1);
    }
  }
  let open = 0;
  let junctions = 0;
  for (const n of uses.values()) {
    if (n === 1) open++;
    if (n > 2) junctions++;
  }
  return { open, junctions, degenerate };
}

test("every published surface is closed, and closure is recomputed here", () => {
  // The manifest's own openEdges is what the other tests read. Collapsing one
  // triangle of a tooth in the binary opened its surface and every test still
  // passed, because none of them counted the edges again.
  for (const part of manifest.parts) {
    const { open, degenerate } = edgeUse(part);
    assert.equal(open, 0, `${part.id} has ${open} boundary edges`);
    assert.equal(
      open,
      part.openEdges,
      `${part.id} disagrees with its recorded openEdges`,
    );
    assert.equal(degenerate, 0, `${part.id} has ${degenerate} collapsed triangles`);
  }
});

test("non manifold junctions do not grow", () => {
  // Simplification and marching cubes both leave a few edges shared by more
  // than two triangles. They are closed surfaces and they render, so they are
  // not failures, but they are recorded so a change cannot quietly add more.
  // Measured on the shipping build; lower it when a part improves.
  const ALLOWED = {
    "jaw-cancellous": 2,
    "fang-tooth": 1,
    "fang-pulp": 4,
    "fang-pdl": 7,
    "fang-maintainer": 5,
    "jaw-pdl-21": 2,
    "tf-tooth-16": 1,
    "tf-bone-mandible": 184,
    "tf-bone-maxilla": 5,
  };
  for (const part of manifest.parts) {
    const { junctions } = edgeUse(part);
    assert.ok(
      junctions <= (ALLOWED[part.id] || 0),
      `${part.id} has ${junctions} non manifold edges, allowed ${ALLOWED[part.id] || 0}`,
    );
  }
});

test("a published tooth is never published without what it needs", () => {
  // A tooth in the manifest whose companion tissue is missing produces a plan
  // of null and a file list of nothing. The viewer read that as "a published
  // model is on the way", asked for no files, succeeded at loading none, and
  // started over forever. The importer is allowed to drop a pulp too thin for
  // the scan to hold, so the invariant is asserted on what ships.
  for (const [source, prefix] of [
    ["toothfairy", "tf-tooth-"],
    ["openfulljaw", "jaw-tooth-"],
  ])
    for (const part of manifest.parts.filter((p) => p.id.startsWith(prefix))) {
      const plan = publishedToothPlan(manifest, part.fdi, source);
      assert.ok(
        plan,
        `${part.id} ships without the tissue its own plan requires`,
      );
      assert.ok(plan.parts.length >= 2, `${part.id} has a one sided plan`);
    }
});
