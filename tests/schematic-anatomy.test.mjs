import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSchematicParts, deriveAnchors } from "../src/schematic-anatomy.js";

const atlas = JSON.parse(
  readFileSync(new URL("../public/models/atlas.json", import.meta.url)),
);
const bytes = readFileSync(new URL("../public/models/omf.bin", import.meta.url));
const buffer = bytes.buffer.slice(
  bytes.byteOffset,
  bytes.byteOffset + bytes.byteLength,
);
const readVertices = (part) => {
  const values = new Float32Array(buffer, part.positions, part.vertexCount * 3);
  const out = [];
  for (let i = 0; i < values.length; i += 3)
    out.push([values[i], values[i + 1], values[i + 2]]);
  return out;
};

const anchors = deriveAnchors(atlas.parts, readVertices);
const mandibleVertices = readVertices(atlas.parts.find((part) => part.id === "FJ3289"));
const built = createSchematicParts(atlas.parts, readVertices);
const byId = new Map(built.map((part) => [part.id, part]));
const mandible = atlas.parts.find((part) => part.id === "FJ3289").bounds;

const inside = (bounds, box, slack) =>
  bounds[0].every((low, axis) => box[0][axis] >= low - slack) &&
  bounds[1].every((high, axis) => box[1][axis] <= high + slack);

test("every schematic structure builds finite geometry and a matching bounding box", () => {
  assert.ok(built.length >= 50, `expected a full schematic set, got ${built.length}`);
  for (const part of built) {
    assert.equal(part.schematic, true, part.id);
    assert.ok(part.note.length > 40, `${part.id} needs an explanatory note`);
    const position = part.geometry.getAttribute("position");
    assert.ok(position.count > 0, `${part.id} has no vertices`);
    for (const value of position.array)
      assert.ok(Number.isFinite(value), `${part.id} has a non-finite vertex`);
    for (const corner of part.bounds)
      for (const value of corner)
        assert.ok(Number.isFinite(value), `${part.id} has non-finite bounds`);
    // Everything must land in the head and neck crop the atlas describes.
    assert.ok(part.bounds[0][1] > atlas.crop.minimum - 0.02, `${part.id} sits below the neck crop`);
    assert.ok(part.bounds[1][1] < 1.70, `${part.id} sits above the head`);
  }
});

test("bilateral structures mirror across the midline and midline ones do not duplicate", () => {
  const pairs = built.filter((part) => part.id.endsWith("-r"));
  assert.ok(pairs.length >= 24);
  for (const right of pairs) {
    const left = byId.get(`${right.id.slice(0, -2)}-l`);
    assert.ok(left, `${right.id} has no left counterpart`);
    const rightCenter = (right.bounds[0][0] + right.bounds[1][0]) / 2;
    const leftCenter = (left.bounds[0][0] + left.bounds[1][0]) / 2;
    assert.ok(rightCenter < 0, `${right.id} should sit on the patient's right`);
    assert.ok(leftCenter > 0, `${left.id} should sit on the patient's left`);
    assert.ok(
      Math.abs(rightCenter + leftCenter) < 0.004,
      `${right.id} and its pair are not mirrored`,
    );
  }
  assert.ok(byId.has("SCH-nasopalatine-nerve"), "the midline nerve is built once");
  assert.ok(!byId.has("SCH-nasopalatine-nerve-r"));
});

test("the inferior alveolar nerve follows this mandible, not an idealized one", () => {
  for (const [id, side] of [
    ["SCH-inferior-alveolar-nerve-r", -1],
    ["SCH-inferior-alveolar-nerve-l", 1],
  ]) {
    const nerve = byId.get(id);
    assert.ok(inside(mandible, nerve.bounds, 0.004), `${id} leaves the mandible`);

    // The canal must run below the apices of the posterior teeth it supplies,
    // and reach forward at least as far as the premolars.
    for (const fdi of side < 0 ? [47, 46, 45] : [37, 36, 35]) {
      const apex = anchors.tooth(fdi).apex;
      assert.ok(
        nerve.bounds[0][1] < apex[1],
        `${id} does not pass below the apex of ${fdi}`,
      );
    }
    const mentalForamen = anchors.mentalForamen(side);
    assert.ok(
      nerve.bounds[1][2] >= mentalForamen[2] - 0.003,
      `${id} stops short of the mental foramen`,
    );
    // It must stay inside the buccal plate rather than float outside the bone.
    // The plate is measured off the mandible mesh itself at the first molar.
    const molarZ = anchors.tooth(side < 0 ? 46 : 36).center[2];
    const plate = mandibleVertices
      .filter((v) => (side < 0 ? v[0] < -0.015 : v[0] > 0.015) && Math.abs(v[2] - molarZ) < 0.005)
      .reduce((a, v) => (Math.abs(v[0]) > Math.abs(a[0]) ? v : a));
    assert.ok(
      Math.abs(nerve.bounds[side < 0 ? 0 : 1][0]) <= Math.abs(plate[0]),
      `${id} runs outside the buccal plate`,
    );
  }
});

test("the mental foramen sits on the buccal plate between the premolar apices", () => {
  for (const side of [-1, 1]) {
    const foramen = anchors.mentalForamen(side);
    const first = anchors.tooth(side < 0 ? 44 : 34);
    const second = anchors.tooth(side < 0 ? 45 : 35);
    assert.ok(
      foramen[2] > Math.min(first.apex[2], second.apex[2]) - 0.004 &&
        foramen[2] < Math.max(first.apex[2], second.apex[2]) + 0.004,
      "the foramen is not between the premolars",
    );
    assert.ok(
      foramen[1] < Math.min(first.apex[1], second.apex[1]),
      "the foramen is not below the premolar apices",
    );
    assert.ok(
      Math.abs(foramen[0]) >= Math.abs(first.center[0]),
      "the foramen is not on the buccal side of the roots",
    );
    assert.ok(foramen[1] > mandible[0][1], "the foramen is below the lower border");
  }
});

test("the maxillary sinus sits in the maxilla above the posterior tooth apices", () => {
  for (const [id, side] of [["SCH-maxillary-sinus-r", -1], ["SCH-maxillary-sinus-l", 1]]) {
    const sinus = byId.get(id);
    const maxilla = anchors.maxillaBounds(side);
    assert.ok(inside(maxilla, sinus.bounds, 0.006), `${id} leaves the maxilla`);
    const molar = anchors.tooth(side < 0 ? 16 : 26);
    assert.ok(
      sinus.bounds[1][1] > molar.apex[1],
      `${id} does not reach above the first molar apex`,
    );
    assert.ok(
      (sinus.bounds[0][0] + sinus.bounds[1][0]) / 2 / side > 0,
      `${id} is on the wrong side`,
    );
  }
});

test("the parotid gland wraps the ramus and its duct reaches the upper second molar", () => {
  for (const [suffix, side] of [["-r", -1], ["-l", 1]]) {
    const gland = byId.get(`SCH-parotid-gland${suffix}`);
    const duct = byId.get(`SCH-parotid-duct${suffix}`);
    const condyle = anchors.condyle(side);
    // The gland lies lateral to the condyle, over the ramus.
    const glandCenter = (gland.bounds[0][0] + gland.bounds[1][0]) / 2;
    assert.ok(
      Math.abs(glandCenter) > Math.abs(condyle[0]),
      "the parotid should lie lateral to the condyle",
    );
    // The duct opens beside the upper second molar.
    const molar = anchors.tooth(side < 0 ? 17 : 27);
    assert.ok(
      duct.bounds[1][2] >= molar.center[2] - 0.004,
      "the parotid duct does not reach the second molar",
    );
    assert.ok(duct.bounds[0][2] < condyle[2] + 0.004, "the parotid duct does not start at the gland");
  }
});

test("the articular disc sits between the condyle and the temporal bone", () => {
  for (const [suffix, side] of [["-r", -1], ["-l", 1]]) {
    const disc = byId.get(`SCH-articular-disc${suffix}`);
    const condyle = anchors.condyle(side);
    const temporal = anchors.temporalBounds(side);
    assert.ok(disc.bounds[1][1] > condyle[1], "the disc is not above the condyle");
    assert.ok(disc.bounds[0][1] < condyle[1] + 0.004, "the disc floats off the condyle");
    assert.ok(disc.bounds[1][1] < temporal[1][1], "the disc is above the temporal bone");
    // A disc, not a ball: much wider than it is tall.
    const width = disc.bounds[1][0] - disc.bounds[0][0];
    const height = disc.bounds[1][1] - disc.bounds[0][1];
    assert.ok(width > height * 3, "the disc is not flattened");
  }
});

test("the schematic set covers the divisions the source dataset omits", () => {
  const required = [
    "SCH-v3-r",
    "SCH-v2-r",
    "SCH-inferior-alveolar-nerve-r",
    "SCH-lingual-nerve-r",
    "SCH-mental-nerve-r",
    "SCH-buccal-nerve-r",
    "SCH-infraorbital-nerve-r",
    "SCH-greater-palatine-nerve-r",
    "SCH-nasopalatine-nerve",
    "SCH-posterior-superior-alveolar-nerve-r",
    "SCH-facial-nerve-r",
    "SCH-facial-marginal-r",
    "SCH-external-carotid-artery-r",
    "SCH-maxillary-artery-r",
    "SCH-facial-artery-r",
    "SCH-lingual-artery-r",
    "SCH-inferior-alveolar-artery-r",
    "SCH-superficial-temporal-artery-r",
    "SCH-facial-vein-r",
    "SCH-retromandibular-vein-r",
    "SCH-pterygoid-plexus-r",
    "SCH-parotid-gland-r",
    "SCH-parotid-duct-r",
    "SCH-submandibular-duct-r",
    "SCH-maxillary-sinus-r",
    "SCH-articular-disc-r",
  ];
  for (const id of required) assert.ok(byId.has(id), `${id} is missing`);

  // None of these may collide with a real source mesh identifier.
  const source = new Set(atlas.parts.map((part) => part.id));
  for (const part of built) assert.ok(!source.has(part.id), `${part.id} collides with a source mesh`);
});

test("the inferior alveolar artery accompanies its nerve through the canal", () => {
  // The two enter the canal together but arrive from different parents: the
  // nerve descends from the foramen ovale, the artery from the maxillary
  // artery. So the shared course is the canal itself, which is what the floor
  // of each bounding box and its forward reach describe.
  for (const suffix of ["-r", "-l"]) {
    const nerve = byId.get(`SCH-inferior-alveolar-nerve${suffix}`);
    const artery = byId.get(`SCH-inferior-alveolar-artery${suffix}`);
    assert.ok(
      Math.abs(nerve.bounds[0][1] - artery.bounds[0][1]) < 0.004,
      "the artery and nerve do not share the canal floor",
    );
    assert.ok(
      Math.abs(nerve.bounds[1][2] - artery.bounds[1][2]) < 0.004,
      "the artery and nerve do not reach the same point forward",
    );
    for (const axis of [0, 2]) {
      const nerveCenter = (nerve.bounds[0][axis] + nerve.bounds[1][axis]) / 2;
      const arteryCenter = (artery.bounds[0][axis] + artery.bounds[1][axis]) / 2;
      assert.ok(
        Math.abs(nerveCenter - arteryCenter) < 0.005,
        `the artery and nerve diverge on axis ${axis}`,
      );
    }
  }
});
