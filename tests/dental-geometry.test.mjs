import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createToothModel,
  setToothSection,
  createDentitionModel,
  getDentitionFDIs,
} from "../src/dental-geometry.js";

test("dentition stages contain exact unique primary, permanent and mixed teeth", () => {
  for (const [stage, count, primary] of [
    ["adult", 32, 0],
    ["child", 20, 20],
    ["mixed", 24, 12],
  ]) {
    const model = createDentitionModel(stage),
      fdis = getDentitionFDIs(stage);
    assert.equal(model.children.length, count);
    assert.equal(new Set(fdis).size, count);
    assert.equal(fdis.filter((fdi) => fdi > 50).length, primary);
    model.children.forEach((tooth) => {
      tooth.traverse((part) => {
        if (part.isMesh) assert.equal(part.userData.fdi, tooth.userData.fdi);
      });
      const upper =
        Math.floor(tooth.userData.fdi / 10) % 4 < 3 &&
        Math.floor(tooth.userData.fdi / 10) % 4 !== 0;
      assert.equal(tooth.rotation.z === Math.PI, upper);
    });
  }
});

test("tooth layers have representative root counts and finite geometry", () => {
  for (const [fdi, roots, canals] of [
    [11, 1, 1],
    [14, 2, 2],
    [16, 3, 3],
    [36, 2, 3],
    [54, 3, 3],
    [74, 2, 3],
  ]) {
    const model = createToothModel(fdi);
    assert.equal(model.userData.rootCount, roots);
    assert.equal(model.userData.canalCount, canals);
    assert.deepEqual(
      new Set(model.children.map((mesh) => mesh.userData.tissue)),
      new Set([
        "bone",
        "gingiva",
        "enamel",
        "dentin",
        "pulp",
        "pdl",
        "cementum",
      ]),
    );
    const size = new THREE.Box3()
      .setFromObject(model)
      .getSize(new THREE.Vector3());
    assert.ok(size.y > 0.015 && size.y < 0.03);
    model.children.forEach((mesh) =>
      assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite)),
    );
  }
});

test("section reveals filled surfaces and can be disabled or offset", () => {
  const model = createToothModel(16);
  for (const offset of [0, 0.001, -0.001]) {
    setToothSection(model, true, offset);
    for (const mesh of model.children) {
      assert.equal(
        mesh.material.clippingPlanes[0],
        model.userData.sectionPlane,
      );
      assert.equal(mesh.children[0].visible, true);
    }
    assert.ok(
      model.children.find((mesh) => mesh.userData.tissue === "enamel")
        .children[0].geometry.attributes.position.count > 3,
    );
    const caps = model.children.map((mesh) => mesh.children[0]);
    assert.equal(new Set(caps.map((cap) => cap.position.z)).size, caps.length);
    assert.ok(
      caps.every(
        (cap) =>
          cap.position.z - offset >= 0.000009 &&
          cap.position.z - offset < 0.0001,
      ),
    );
    assert.ok(
      caps.every(
        (cap) =>
          cap.material.polygonOffset &&
          cap.material.depthTest &&
          cap.material.depthWrite,
      ),
    );
  }
  setToothSection(model, false);
  model.children.forEach((mesh) => {
    assert.equal(mesh.material.clippingPlanes.length, 0);
    assert.equal(mesh.children[0].visible, false);
  });
  assert.throws(() => createToothModel(19), RangeError);
  assert.throws(() => createDentitionModel("unknown"), RangeError);
  assert.throws(() => setToothSection(model, true, NaN), RangeError);
});

test("canals meet the pulp chamber and dentin roots join the cervical trunk", () => {
  const span = (mesh, y) => {
    const points = mesh.userData.profile;
    const index = points.findIndex(
      (point, i) => i > 0 && point[0] >= y && points[i - 1][0] <= y,
    );
    if (index < 1) return null;
    const a = points[index - 1],
      b = points[index],
      t = (y - a[0]) / (b[0] - a[0]);
    const x = a[2] + (b[2] - a[2]) * t,
      radius = a[1] + (b[1] - a[1]) * t;
    return [x - radius, x + radius];
  };
  const intersects = (a, b) =>
    a && b && Math.min(a[1], b[1]) - Math.max(a[0], b[0]) > 0.05;
  for (const fdi of [
    ...getDentitionFDIs("adult"),
    ...getDentitionFDIs("child"),
  ]) {
    const model = createToothModel(fdi),
      size = model.userData.primary ? 0.76 : 1;
    const pulp = model.children.filter(
      (mesh) => mesh.userData.tissue === "pulp",
    );
    for (const canal of pulp.filter(
      (mesh) => mesh.userData.profile[0][0] < -5,
    )) {
      assert.ok(
        intersects(span(canal, 0.6 * size), span(pulp[0], 0.6 * size)),
        `FDI ${fdi}: canal joins chamber`,
      );
    }
    const dentin = model.children.filter(
      (mesh) => mesh.userData.tissue === "dentin",
    );
    const trunk = dentin.find(
      (mesh) =>
        mesh.userData.profile[0][0] < 0 && mesh.userData.profile[0][0] > -5,
    );
    assert.ok(trunk, `FDI ${fdi}: cervical trunk exists`);
    assert.ok(
      intersects(span(trunk, size), span(dentin[0], size)),
      `FDI ${fdi}: crown joins trunk`,
    );
    for (const root of dentin.filter(
      (mesh) => mesh.userData.profile[0][0] < -5,
    )) {
      assert.ok(
        intersects(span(root, -size), span(trunk, -size)),
        `FDI ${fdi}: root joins trunk`,
      );
    }
  }
});
