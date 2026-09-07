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
  for (const fdi of [11, 18, 27, 31, 41, 48]) {
    const group = createPublishedToothModel(manifest, buffers, fdi);
    assert.ok(group, `no cutaway for FDI ${fdi}`);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    // The crown is wider than the root, so the widest slice is near the top.
    const size = box.getSize(new THREE.Vector3());
    assert.ok(size.y > 0.004, `FDI ${fdi} is ${size.y}m tall`);
    const crown = group.userData.published.axes.up;
    assert.ok(crown, `FDI ${fdi} has no published axes`);
    // Turning the tooth by the inverse of its own basis puts occlusal on +Y.
    const up = new THREE.Vector3(...crown).applyQuaternion(group.quaternion);
    assert.ok(up.y > 0.99, `FDI ${fdi} does not stand crown up: ${up.y}`);
  }
});

test("the lower first molars stay with the only source that has a canal", () => {
  for (const fdi of [36, 46]) {
    const plan = publishedToothPlan(manifest, fdi);
    assert.equal(plan.source, "fang");
    assert.ok(plan.parts.some((p) => p.tissue === "pulp"));
    assert.deepEqual(buffersForTooth(manifest, fdi), ["dental"]);
  }
  // Everything else is the patient, and needs only the patient's file.
  assert.deepEqual(buffersForTooth(manifest, 11), ["open-full-jaw"]);
  assert.equal(publishedToothPlan(manifest, 11).source, "openfulljaw");
  assert.equal(publishedToothPlan(manifest, 26), null, "FDI 26 is absent");
});

test("published teeth are read from the manifest, uppers included", () => {
  const teeth = publishedTeeth(manifest);
  assert.ok(teeth.has(11) && teeth.has(28), "upper teeth are published now");
  assert.ok(teeth.has(36) && teeth.has(46), "Kang stands in for both molars");
  assert.ok(!teeth.has(26), "FDI 26 is not published");
  // The patient has both lower first molars too, so Kang adds no number.
  assert.equal(teeth.size, 31, "every tooth the patient has");
});

test("the dentition model carries every patient part and is metre scaled", () => {
  const group = createPublishedDentitionModel(manifest, buffers);
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
