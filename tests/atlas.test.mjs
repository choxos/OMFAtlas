import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { dentalProfile, partForTooth } from "../src/dental.js";
import { toothNumber, groups, questions } from "../src/content.js";
import { endoProfile, endoSources, canalPatterns } from "../src/endodontics.js";
import { tissues, toothSection } from "../src/periodontium.js";

const atlas = JSON.parse(
  readFileSync(new URL("../public/models/atlas.json", import.meta.url)),
);
const bytes = readFileSync(
  new URL("../public/models/omf.bin", import.meta.url),
);
const buffer = bytes.buffer.slice(
  bytes.byteOffset,
  bytes.byteOffset + bytes.byteLength,
);

test("FDI and Universal identifiers agree across permanent and primary quadrants", () => {
  const fixtures = [
    [11, 8],
    [21, 9],
    [31, 24],
    [41, 25],
    [18, 1],
    [28, 16],
    [38, 17],
    [48, 32],
    [36, 19],
    [55, "A"],
    [65, "J"],
    [75, "K"],
    [85, "T"],
    [51, "E"],
    [61, "F"],
    [71, "O"],
    [81, "P"],
  ];
  for (const [fdi, universal] of fixtures)
    assert.equal(dentalProfile(fdi).universal, universal, `FDI ${fdi}`);
  for (const invalid of [0, 10, 19, 49, 50, 56, 66, 76, 86, 91, 11.5, NaN])
    assert.equal(dentalProfile(invalid), null);
});

test("52 valid tooth entries have sourced internal anatomy and valid eruption units", () => {
  const universal = new Set();
  for (let quadrant = 1; quadrant <= 8; quadrant++) {
    for (let position = 1; position <= (quadrant < 5 ? 8 : 5); position++) {
      const tooth = dentalProfile(quadrant * 10 + position),
        endo = endoProfile(tooth);
      assert.ok(endoSources[endo.source], tooth.fullName);
      assert.ok(
        endo.canals.length && endo.variant.length && tooth.morphology.length,
      );
      assert.equal(tooth.unit, quadrant < 5 ? "years" : "months");
      universal.add(tooth.universal);
    }
  }
  assert.equal(universal.size, 52);
  assert.equal(dentalProfile(11).eruption, "7–8");
  assert.equal(dentalProfile(51).eruption, "8–12");
  assert.equal(dentalProfile(75).shed, "10–12");
});

test("geometry buffers are valid and remain in the head and neck region", () => {
  assert.equal(atlas.parts.length, 596);
  assert.equal(new Set(atlas.parts.map((p) => p.id)).size, 596);
  for (const group of [
    "muscles",
    "arteries",
    "veins",
    "nerves",
    "brain",
    "eyes",
  ])
    assert.ok(
      atlas.parts.some((p) => p.group === group),
      group,
    );
  for (const part of atlas.parts) {
    assert.ok(groups[part.group], part.name);
    assert.ok(
      part.bounds[0][1] >= 1.438 - 1e-5 && part.bounds[1][1] < 1.9,
      part.name,
    );
    for (const [field, count, width] of [
      ["positions", part.vertexCount * 3, 4],
      ["normals", part.vertexCount * 3, 2],
      ["indices", part.indexCount, 4],
    ]) {
      assert.equal(part[field] % width, 0, `${part.id} ${field} alignment`);
      assert.ok(
        part[field] + count * width <= buffer.byteLength,
        `${part.id} ${field} bounds`,
      );
    }
    assert.equal(part.indexCount % 3, 0);
    const positions = new Float32Array(
      buffer,
      part.positions,
      part.vertexCount * 3,
    );
    for (let i = 0; i < positions.length; i++) {
      assert.ok(Number.isFinite(positions[i]), part.id);
      assert.ok(
        positions[i] >= part.bounds[0][i % 3] - 1e-5 &&
          positions[i] <= part.bounds[1][i % 3] + 1e-5,
        `${part.id} vertex bounds`,
      );
    }
    for (const index of new Uint32Array(buffer, part.indices, part.indexCount))
      assert.ok(index < part.vertexCount, part.id);
  }
});

test("all 28 modeled teeth resolve without pretending primary or third-molar meshes exist", () => {
  const teeth = atlas.parts.filter((p) => p.group === "teeth");
  assert.equal(teeth.length, 28);
  assert.equal(new Set(teeth.map((p) => toothNumber(p.name))).size, 28);
  for (const part of teeth)
    assert.equal(partForTooth(atlas.parts, toothNumber(part.name)).id, part.id);
  for (const fdi of [18, 28, 38, 48, 51, 75])
    assert.equal(partForTooth(atlas.parts, fdi), undefined);
  assert.equal(toothNumber("Mandible"), null);
});

test("canal explorer and tissue section expose the complete teaching controls", () => {
  assert.equal(canalPatterns.length, 8);
  assert.deepEqual(
    canalPatterns.map((p) => p.sequence),
    ["1", "2–1", "1–2–1", "2", "1–2", "2–1–2", "1–2–1–2", "3"],
  );
  for (const tissue of tissues)
    assert.ok(toothSection(tissue.id).includes(`data-tissue="${tissue.id}"`));
  assert.ok(toothSection("pulp", new Set()).includes("opacity:0.07"));
  for (const q of questions)
    assert.ok(q.answer >= 0 && q.answer < q.choices.length);
});

test("original-detail manifest upgrades real source meshes with valid buffers", () => {
  const high = JSON.parse(
    readFileSync(
      new URL("../public/models/high-resolution/atlas.json", import.meta.url),
    ),
  );
  assert.equal(high.parts.length, 549);
  for (const part of high.parts) {
    const base = atlas.parts.find((p) => p.id === part.id);
    assert.ok(base, part.id);
    assert.equal(part.baseIndexCount, base.indexCount);
    assert.ok(part.indexCount > base.indexCount, part.id);
    assert.equal(part.url, `/models/high-resolution/${part.id}.bin`);
    const bytes = readFileSync(
      new URL(`../public${part.url}`, import.meta.url),
    );
    assert.equal(bytes.byteLength, part.bytes);
    assert.equal(part.indices + part.indexCount * 4, bytes.byteLength);
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );
    const positions = new Float32Array(
      buffer,
      part.positions,
      part.vertexCount * 3,
    );
    for (let i = 0; i < positions.length; i++) {
      assert.ok(Number.isFinite(positions[i]), part.id);
      if (i % 3 === 1) assert.ok(positions[i] >= 1.438 - 1e-5, part.id);
    }
    for (const index of new Uint32Array(buffer, part.indices, part.indexCount))
      assert.ok(index < part.vertexCount, part.id);
  }
});

test("published dental models carry their source, license and limits", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../public/models/dental/manifest.json", import.meta.url)),
  );
  for (const [name, entry] of Object.entries(manifest.buffers)) {
    const bytes = statSync(
      new URL(`../public/models/dental/${entry.file}`, import.meta.url),
    ).size;
    assert.equal(bytes, entry.bytes, `${name} matches the manifest`);
  }

  // Which set is under which terms, and which file carries it, written here
  // rather than read from the manifest. Deciding what to check from the same
  // field being checked proves nothing: setting both restricted licenses to
  // "CC BY 4.0" in the manifest used to satisfy this whole test, because the
  // restriction check was conditional on the license it was verifying.
  const TERMS = {
    diaz: { license: "CC BY 4.0", buffer: "dental", restricted: false },
    fang: { license: "CC BY 4.0", buffer: "dental", restricted: false },
    openfulljaw: {
      license: "CC BY-NC-SA 4.0",
      buffer: "open-full-jaw",
      restricted: true,
    },
    toothfairy: {
      license: "CC BY-SA 4.0",
      buffer: "toothfairy",
      restricted: true,
    },
  };
  assert.deepEqual(
    Object.keys(manifest.sources).sort(),
    Object.keys(TERMS).sort(),
    "a new dataset must be given its terms here before it can ship",
  );
  for (const [name, source] of Object.entries(manifest.sources)) {
    const terms = TERMS[name];
    assert.equal(source.license, terms.license, `${name} license`);
    assert.ok(
      source.licenseUrl.includes(
        terms.license.toLowerCase().replace("cc ", "").replace(/ /g, "/"),
      ),
      `${name} license URL must match its license: ${source.licenseUrl}`,
    );
    // The file boundary is the license boundary, so nothing under one set of
    // terms may be packed into a file that carries another.
    for (const part of manifest.parts.filter((p) => p.source === name))
      assert.equal(part.buffer, terms.buffer, `${part.id} is in the wrong file`);
    // A reader cannot honour a term they are not told about, so a set that
    // binds derivatives has to say so where its limits are read, not only in
    // a file beside the assets.
    if (terms.restricted) {
      assert.match(
        source.limits,
        new RegExp(terms.license.replace(/[.]/g, "\\.")),
        `${name} must name its license in its limits`,
      );
      assert.match(
        source.limits,
        /derivative|ShareAlike|same terms/i,
        `${name} must say derivatives carry its terms`,
      );
    }
    assert.ok(source.doi.length > 8, "every source names a DOI");
    // The limits are the difference between a model of a jaw and a jaw, so a
    // source that does not state them cannot ship.
    assert.ok(source.limits.length > 60, `${source.title} needs its limits`);
    assert.ok(source.processing.length > 40, `${source.title} needs its method`);
    assert.ok(source.pdlModel.length > 40, `${source.title} needs its ligament note`);
  }

  const groups = new Set([
    "bone", "tooth", "pdl", "pulp", "canal", "sinus", "appliance",
  ]);
  for (const part of manifest.parts) {
    assert.ok(groups.has(part.group), `${part.id} has an unknown group`);
    assert.ok(manifest.sources[part.source], `${part.id} names no source`);
    assert.match(part.sourceSha256, /^[0-9a-f]{64}$/, `${part.id} needs its digest`);
    assert.ok(part.vertexCount > 0 && part.indexCount % 3 === 0, part.id);
    // Every offset has to sit inside the buffer it points into.
    for (const [at, length] of [
      [part.positions, part.vertexCount * 12],
      [part.normals, part.vertexCount * 12],
      [part.indices, part.indexCount * 4],
    ]) {
      assert.equal(at % 4, 0, `${part.id} offset is unaligned`);
      assert.ok(
        at + length <= manifest.buffers[part.buffer].bytes,
        `${part.id} runs past ${part.buffer}`,
      );
    }
    // A solid that is not closed cannot be faded without showing its inside.
    assert.equal(part.openEdges, 0, `${part.id} has ${part.openEdges} open edges`);
  }

  const teeth = manifest.parts.filter((p) => p.source === "diaz" && p.group === "tooth");
  const ligaments = manifest.parts.filter((p) => p.source === "diaz" && p.group === "pdl");
  assert.equal(teeth.length, 14, "the lower arch is complete");
  assert.equal(ligaments.length, 14, "every tooth has its ligament");
  for (const tooth of teeth)
    assert.ok(
      ligaments.some((l) => l.fdi === tooth.fdi),
      `no ligament for FDI ${tooth.fdi}`,
    );
});
