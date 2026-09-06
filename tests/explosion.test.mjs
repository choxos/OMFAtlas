import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createExplosionLayout, tissueGroup, tissueSeparation, TISSUE_ORDER } from "../src/explosion-layout.js";

test("inventory packs all visible meshes without overlap on narrow and wide screens", () => {
  const { parts } = JSON.parse(readFileSync(new URL("../public/models/atlas.json", import.meta.url)));
  for (const visible of [parts, ...[...new Set(parts.map((part) => part.group))].map((group) => parts.filter((part) => part.group === group))]) {
    for (const aspect of [0.4, 1, 1.8]) {
      const layout = createExplosionLayout(visible, aspect);
      const cells = [...layout.cells.values()];
      assert.equal(cells.length, visible.length);
      for (let i = 0; i < cells.length; i++) {
        const a = cells[i];
        assert.ok(Math.abs(a.x) + a.width / 2 <= layout.width / 2 + 1e-8);
        assert.ok(Math.abs(a.y) + a.height / 2 <= layout.height / 2 + 1e-8);
        for (const b of cells.slice(i + 1)) assert.ok(
          Math.abs(a.x - b.x) >= (a.width + b.width) / 2 - 1e-8 ||
          Math.abs(a.y - b.y) >= (a.height + b.height) / 2 - 1e-8,
        );
      }
    }
  }
  assert.equal(createExplosionLayout([]).cells.size, 0);
});

test("tissue separation is rigid and inventory keeps ordered tissue blocks", () => {
  const { parts } = JSON.parse(readFileSync(new URL("../public/models/atlas.json", import.meta.url)));
  assert.equal(tissueGroup({ group: "neck" }), "bones");
  const offsets = new Map();
  for (const part of parts) {
    const tissue = tissueGroup(part);
    if (offsets.has(tissue)) assert.deepEqual(tissueSeparation(part), offsets.get(tissue));
    else offsets.set(tissue, tissueSeparation(part));
  }
  assert.deepEqual(tissueSeparation({ group: "neck" }), tissueSeparation({ group: "bones" }));
  assert.notDeepEqual(tissueSeparation({ group: "muscles" }), tissueSeparation({ group: "bones" }));
  for (const aspect of [0.4, 1, 1.8]) {
    const { cells } = createExplosionLayout(parts, aspect);
    let precedingBottom = Infinity;
    for (const tissue of TISSUE_ORDER.filter((group) => group !== "neck")) {
      const block = parts.filter((part) => tissueGroup(part) === tissue).map((part) => cells.get(part.id));
      if (!block.length) continue;
      const top = Math.max(...block.map((cell) => cell.y + cell.height / 2));
      assert.ok(top <= precedingBottom + 1e-8, `${tissue} follows the preceding tissue without interleaving`);
      precedingBottom = Math.min(...block.map((cell) => cell.y - cell.height / 2));
    }
  }
});
