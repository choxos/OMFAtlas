import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import {
  buffersForTooth,
  createPublishedDentitionModel,
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

const jawParts = manifest.parts.filter((p) => p.source === "openfulljaw");
const jawTeeth = jawParts.filter((p) => p.group === "tooth");

test("every part points at a buffer that holds it", () => {
  for (const part of manifest.parts) {
    const entry = manifest.buffers[part.buffer];
    assert.ok(entry, `${part.id} names no buffer`);
    const end = Math.max(
      part.positions + part.vertexCount * 12,
      part.normals + part.vertexCount * 12,
      part.indices + part.indexCount * 4,
    );
    assert.ok(end <= entry.bytes, `${part.id} runs past ${part.buffer}`);
  }
});

test("the patient jaw carries both arches and one ligament per tooth", () => {
  // Patient 12 has every tooth but the upper left first molar.
  const fdis = jawTeeth.map((p) => p.fdi).sort((a, b) => a - b);
  assert.equal(fdis.length, 31);
  assert.ok(!fdis.includes(26), "FDI 26 is absent in this patient");
  const upper = fdis.filter((f) => f < 30);
  assert.equal(upper.length, 15, "fifteen upper teeth");
  assert.equal(fdis.length - upper.length, 16, "sixteen lower teeth");
  for (const tooth of jawTeeth)
    assert.ok(
      jawParts.some((p) => p.group === "pdl" && p.fdi === tooth.fdi),
      `FDI ${tooth.fdi} has no ligament`,
    );
  for (const jaw of ["mandible", "maxilla"])
    assert.ok(
      jawParts.some((p) => p.group === "bone" && p.jaw === jaw),
      `no ${jaw} bone`,
    );
});

test("universal numbering maps to the FDI number of the same tooth", () => {
  for (const [unn, fdi] of [
    [1, 18],
    [8, 11],
    [9, 21],
    [16, 28],
    [17, 38],
    [24, 31],
    [25, 41],
    [32, 48],
  ]) {
    const part = jawTeeth.find((p) => p.universal === unn);
    if (part) assert.equal(part.fdi, fdi, `universal ${unn}`);
  }
});

test("a ligament sits around the root of its own tooth", () => {
  for (const tooth of jawTeeth) {
    const pdl = jawParts.find((p) => p.group === "pdl" && p.fdi === tooth.fdi);
    for (let axis = 0; axis < 3; axis++) {
      assert.ok(
        pdl.bounds[0][axis] > tooth.bounds[0][axis] - 2 &&
          pdl.bounds[1][axis] < tooth.bounds[1][axis] + 2,
        `FDI ${tooth.fdi} ligament is not on its tooth`,
      );
    }
  }
});

test("both arches are in one frame, uppers above lowers", () => {
  const mid = (part, axis) => (part.bounds[0][axis] + part.bounds[1][axis]) / 2;
  // The scan's Z is superior. Every upper tooth sits above every lower one.
  const upper = jawTeeth.filter((p) => p.fdi < 30).map((p) => mid(p, 2));
  const lower = jawTeeth.filter((p) => p.fdi > 30).map((p) => mid(p, 2));
  assert.ok(
    Math.min(...upper) > Math.max(...lower),
    "an upper tooth is not above every lower one",
  );
});

test("standing a tooth up is a rotation, not a reflection", () => {
  for (const tooth of jawTeeth) {
    const { side, up, out } = tooth.axes;
    const v = (a) => new THREE.Vector3().fromArray(a);
    for (const [a, b] of [
      [side, up],
      [up, out],
      [side, out],
    ])
      assert.ok(Math.abs(v(a).dot(v(b))) < 1e-3, `FDI ${tooth.fdi} not square`);
    const determinant = new THREE.Matrix4()
      .makeBasis(v(side), v(up), v(out))
      .determinant();
    assert.ok(
      Math.abs(determinant - 1) < 1e-3,
      `FDI ${tooth.fdi} basis flips handedness`,
    );
  }
});

test("a tooth cutaway stands crown up whichever jaw it came from", () => {
  // The same check the scan's teeth get: correlate each vertex's source z,
  // which is superior in this dataset's own frame, against its world y after
  // the model is built. Asking the tooth's own basis would return +Y by
  // algebra whichever end of the tooth it pointed at.
  for (const tooth of jawTeeth) {
    const group = createPublishedToothModel(
      manifest,
      buffers,
      tooth.fdi,
      "openfulljaw",
    );
    assert.ok(group, `no cutaway for FDI ${tooth.fdi}`);
    group.updateMatrixWorld(true);
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
    const r =
      (n * szy - sz * sy) /
      Math.sqrt((n * szz - sz * sz) * (n * syy - sy * sy));
    assert.ok(
      r * (tooth.fdi > 30 ? 1 : -1) > 0.7,
      `FDI ${tooth.fdi} is not standing crown up`,
    );
    const size = new THREE.Box3()
      .setFromObject(group)
      .getSize(new THREE.Vector3());
    assert.ok(size.y > 0.004 && size.y < 0.05, `FDI ${tooth.fdi}: ${size.y}m`);
  }
});

test("this patient's tooth carries this patient's ligament", () => {
  for (const fdi of [11, 31, 46]) {
    const plan = publishedToothPlan(manifest, fdi, "openfulljaw");
    assert.equal(plan.source, "openfulljaw");
    assert.ok(plan.parts.some((p) => p.tissue === "pdl"), "the ligament");
    // This dataset has no pulp at all, so it must never claim one.
    assert.ok(!plan.parts.some((p) => p.tissue === "pulp"));
    for (const { part } of plan.parts)
      assert.equal(part.source, "openfulljaw", "one patient for one tooth");
    assert.deepEqual(buffersForTooth(manifest, fdi, "openfulljaw"), [
      "open-full-jaw",
    ]);
  }
  assert.equal(
    publishedToothPlan(manifest, 26, "openfulljaw"),
    null,
    "this patient is missing FDI 26",
  );
  // Kang is a seven year old's molar and is offered as a model of its own,
  // never as a stand in for an adult tooth a reader asked to see.
  const kang = publishedToothPlan(manifest, 46, "fang");
  assert.equal(kang.source, "fang");
  assert.deepEqual(buffersForTooth(manifest, 46, "fang"), ["dental"]);
  assert.equal(publishedToothPlan(manifest, 11, "fang"), null);
});

test("published teeth are read from the manifest, per patient", () => {
  const model = publishedTeeth(manifest, "openfulljaw");
  assert.equal(model.size, 31, "every tooth this patient has");
  assert.ok(!model.has(26), "this patient is missing FDI 26");
  assert.ok(model.has(11) && model.has(28), "upper teeth included");
  const scan = publishedTeeth(manifest, "toothfairy");
  assert.equal(scan.size, 32, "the other patient has a whole dentition");
  assert.ok(scan.has(26));
  // With no patient named it is every tooth either of them can show.
  assert.equal(publishedTeeth(manifest).size, 32);
});

test("the dentition model carries every patient part and is metre scaled", () => {
  const group = createPublishedDentitionModel(manifest, buffers, "openfulljaw");
  assert.ok(group);
  assert.equal(group.children.length, jawParts.length);
  group.updateMatrixWorld(true);
  const size = new THREE.Box3()
    .setFromObject(group)
    .getSize(new THREE.Vector3());
  // A jaw is about a tenth of a metre across, never a hundred.
  for (const axis of ["x", "y", "z"])
    assert.ok(size[axis] > 0.01 && size[axis] < 0.25, `${axis} is ${size[axis]}`);
});

test("nothing published here has an open edge", () => {
  for (const part of manifest.parts)
    assert.equal(part.openEdges, 0, `${part.id} has ${part.openEdges}`);
});
