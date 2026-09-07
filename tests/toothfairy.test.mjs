import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import {
  createPublishedToothModel,
  publishedTeeth,
  publishedToothPlan,
} from "../src/dental-models.js";

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

const parts = manifest.parts.filter((p) => p.source === "toothfairy");
const of = (id) => parts.find((p) => p.id === id);
const teeth = parts.filter((p) => p.group === "tooth");
/** Does the tooth actually stand crown up?
 *
 *  Asking the tooth's own basis proves nothing: turning a tooth by the inverse
 *  of its basis puts that basis's up on +Y by algebra, whichever end of the
 *  tooth it points at. Asking the pulp or the ligament proves little either,
 *  because a pulp's centre is dragged apical by its canals and a molar's roots
 *  splay wider than its crown.
 *
 *  So this goes back to the one fact established from the anatomy rather than
 *  from any header or axis: in both datasets' own frames z is superior, which
 *  is why every upper tooth sits above every lower one. A lower tooth's crown
 *  is therefore at high source z and an upper tooth's at low source z, and
 *  after the model is built the crown has to be at high world y either way.
 *  Correlating the two across every vertex catches a transposed basis, a
 *  flipped sign, or another tooth's axes attached to this one. */
function crownRunsUp(group, fdi) {
  const mesh = group.children.find((m) => m.userData.tissue === "tooth");
  const position = mesh.geometry.attributes.position;
  const point = new THREE.Vector3();
  let n = 0, sz = 0, sy = 0, szz = 0, syy = 0, szy = 0;
  for (let i = 0; i < position.count; i++) {
    const z = position.getZ(i);
    point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
    n++; sz += z; sy += point.y; szz += z * z; syy += point.y * point.y;
    szy += z * point.y;
  }
  const r = (n * szy - sz * sy) / Math.sqrt((n * szz - sz * sz) * (n * syy - sy * sy));
  return r * (fdi > 30 ? 1 : -1);
}

const mid = (part, axis) => (part.bounds[0][axis] + part.bounds[1][axis]) / 2;

test("the scan carries a whole dentition and a pulp inside every tooth", () => {
  const fdis = teeth.map((p) => p.fdi).sort((a, b) => a - b);
  assert.equal(fdis.length, 32, "all thirty two teeth");
  assert.equal(new Set(fdis).size, 32, "no tooth twice");
  for (const tooth of teeth) {
    const pulp = of(`tf-pulp-${tooth.fdi}`);
    assert.ok(pulp, `FDI ${tooth.fdi} has no pulp`);
    for (let axis = 0; axis < 3; axis++)
      assert.ok(
        pulp.bounds[0][axis] > tooth.bounds[0][axis] - 0.6 &&
          pulp.bounds[1][axis] < tooth.bounds[1][axis] + 0.6,
        `FDI ${tooth.fdi} pulp is not inside its tooth`,
      );
    // A pulp is a few percent of the tooth. Anything near half of it is a
    // label that has leaked out into dentin.
    assert.ok(
      pulp.sourceMm3 / tooth.sourceMm3 > 0.02 &&
        pulp.sourceMm3 / tooth.sourceMm3 < 0.09,
      `FDI ${tooth.fdi} pulp is ${((100 * pulp.sourceMm3) / tooth.sourceMm3).toFixed(1)}% of its tooth`,
    );
  }
});

test("the patient is not mirrored and is the right way up", () => {
  // This atlas models a jaw with x toward the patient's left and z superior.
  // Getting the scan's inferior-running index back by negating it alone would
  // reach the same z and swap the patient's sides, which is exactly the bug
  // this asserts against: every side-bearing name here would be wrong.
  assert.ok(
    mid(of("tf-tooth-36"), 0) > mid(of("tf-tooth-46"), 0),
    "the lower left first molar must sit to the patient's left of the right one",
  );
  assert.ok(
    mid(of("tf-tooth-26"), 0) > mid(of("tf-tooth-16"), 0),
    "same for the upper first molars",
  );
  const upper = teeth.filter((p) => p.fdi < 30).map((p) => mid(p, 2));
  const lower = teeth.filter((p) => p.fdi > 30).map((p) => mid(p, 2));
  assert.ok(
    Math.min(...upper) > Math.max(...lower),
    "every upper tooth sits above every lower one",
  );
  // Molars are behind incisors, so y has to run posteriorly.
  assert.ok(
    mid(of("tf-tooth-47"), 1) > mid(of("tf-tooth-41"), 1),
    "y must run posteriorly",
  );
});

test("each alveolar canal runs under the molar roots of its own side", () => {
  const canals = {
    left: of("tf-canal-left"),
    right: of("tf-canal-right"),
  };
  for (const [side, canal] of Object.entries(canals)) {
    assert.ok(canal, `no ${side} canal`);
    // About 48 mm of canal, in one piece.
    const run = Math.max(
      ...canal.bounds[1].map((high, axis) => high - canal.bounds[0][axis]),
    );
    assert.ok(run > 35 && run < 70, `${side} canal spans ${run.toFixed(1)} mm`);
  }
  // x runs toward the patient's left, so the left canal is the one with the
  // greater x, and it has to be on the same side as the left molars.
  assert.ok(
    mid(canals.left, 0) > mid(canals.right, 0),
    "the canals are swapped",
  );
  for (const [fdi, canal] of [
    [37, canals.left],
    [47, canals.right],
  ]) {
    const molar = of(`tf-tooth-${fdi}`);
    assert.ok(
      Math.abs(mid(canal, 0) - mid(molar, 0)) < 12,
      `the canal beside FDI ${fdi} is on the wrong side`,
    );
    // The canal passes below the root apices, never through the crown.
    assert.ok(
      canal.bounds[0][2] < molar.bounds[0][2],
      `the canal beside FDI ${fdi} does not run below it`,
    );
  }
});

test("the derived tooth axes are a rotation, not a reflection", () => {
  for (const tooth of teeth) {
    assert.ok(tooth.axesDerived, `FDI ${tooth.fdi} should say its axes are derived`);
    const { side, up, out } = tooth.axes;
    const v = (a) => new THREE.Vector3().fromArray(a);
    for (const [a, b] of [
      [side, up],
      [up, out],
      [side, out],
    ])
      assert.ok(Math.abs(v(a).dot(v(b))) < 1e-4, `FDI ${tooth.fdi} is not square`);
    const determinant = new THREE.Matrix4()
      .makeBasis(v(side), v(up), v(out))
      .determinant();
    assert.ok(
      Math.abs(determinant - 1) < 1e-4,
      `FDI ${tooth.fdi} basis flips handedness`,
    );
  }
});

test("a tooth cutaway stands crown up whichever jaw it came from", () => {
  for (const tooth of teeth) {
    const group = createPublishedToothModel(
      manifest,
      buffers,
      tooth.fdi,
      "toothfairy",
    );
    assert.ok(group, `no cutaway for FDI ${tooth.fdi}`);
    group.updateMatrixWorld(true);
    assert.ok(
      crownRunsUp(group, tooth.fdi) > 0.7,
      `FDI ${tooth.fdi} is not standing crown up`,
    );
    const size = new THREE.Box3()
      .setFromObject(group)
      .getSize(new THREE.Vector3());
    assert.ok(size.y > 0.004 && size.y < 0.05, `FDI ${tooth.fdi}: ${size.y} m`);
    // Standing up means the tooth is not lying on its side. It does not mean
    // height always wins: a third molar is a squat, irregular thing and this
    // patient's upper ones are a few tenths of a millimetre wider than tall.
    assert.ok(
      size.y > 0.6 * Math.max(size.x, size.z),
      `FDI ${tooth.fdi} is lying down`,
    );
  }
});

test("every tooth in the mouth now has a published model", () => {
  const published = publishedTeeth(manifest);
  assert.equal(published.size, 32, "a whole dentition");
  for (const fdi of [11, 18, 26, 28, 31, 38, 41, 48])
    assert.ok(published.has(fdi), `FDI ${fdi} is not published`);
  // FDI 26 is the one the Open-Full-Jaw patient is missing.
  assert.equal(publishedToothPlan(manifest, 26, "openfulljaw"), null);
  assert.ok(publishedToothPlan(manifest, 26, "toothfairy"));
});

test("a tooth from the scan opens onto its own canal, not another patient's", () => {
  for (const fdi of [11, 26, 36, 46]) {
    const plan = publishedToothPlan(manifest, fdi, "toothfairy");
    assert.equal(plan.source, "toothfairy");
    assert.ok(plan.parts.some((p) => p.tissue === "pulp"), `FDI ${fdi} has no pulp`);
    for (const { part } of plan.parts)
      assert.equal(part.source, "toothfairy", "one patient for one tooth");
  }
});

test("nothing from the scan has an open edge", () => {
  for (const part of parts)
    assert.equal(part.openEdges, 0, `${part.id} has ${part.openEdges}`);
});
