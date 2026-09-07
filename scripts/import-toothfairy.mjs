// Import one ToothFairy3 case into the atlas.
//
//   Bolelli F, Lumetti L, Vinayahalingam S and colleagues (2025).
//   ToothFairy3, MICCAI 2025. https://ditto.ing.unimore.it/toothfairy3/
//   CC BY-SA 4.0.
//
// This is the second half of that import. scripts/toothfairy-surfaces.py does
// the first: it reads the case's voxel labels, meshes them, and writes binary
// STL plus a sidecar of what it did. This reads those, welds, simplifies and
// packs them into their own buffer, and folds the result into the manifest
// without touching any other set's entries.
//
// What this set brings that nothing else here has: a pulp cavity inside every
// one of the thirty two teeth, and both inferior alveolar canals. Until now
// one tooth in the whole atlas had a canal to show, and the nerve under the
// molar roots was drawn rather than segmented.
//
// Usage: node scripts/import-toothfairy.mjs [surfaces-directory]

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  openEdges,
  pack,
  publish,
  readBinaryStl,
  simplify,
  weld,
  writer,
} from "./mesh-tools.mjs";

const SURFACES =
  process.argv[2] || "documentation/refs/ToothFairy3/surfaces";

// A tooth carries the shape a reader looks at; a pulp is small and thin and
// collapses if it is cut too hard; the bone is background and can afford to
// be coarse. The canal is the reason this set is here, so it keeps its
// resolution even though it is only a tube.
const BUDGET = {
  tooth: 6000,
  pulp: 3000,
  bone: 34000,
  canal: 4000,
  sinus: 2000,
};

const sidecar = JSON.parse(
  readFileSync(join(SURFACES, "surfaces.json"), "utf8"),
);

const ID = {
  tooth: (part) => `tf-tooth-${part.fdi}`,
  pulp: (part) => `tf-pulp-${part.fdi}`,
  bone: (part) => `tf-bone-${part.label === 1 ? "mandible" : "maxilla"}`,
  canal: (part) => `tf-canal-${part.label === 3 ? "left" : "right"}`,
  sinus: (part) => `tf-sinus-${part.label === 5 ? "left" : "right"}`,
};

const buffer = writer("toothfairy", "toothfairy.bin");
const parts = [];

for (const entry of sidecar.parts) {
  const bytes = readFileSync(join(SURFACES, entry.file));
  const raw = readBinaryStl(bytes);
  // Marching cubes emits each cube's triangles separately, so the surface is
  // closed but the mesh is not until the shared corners are merged.
  const welded = weld(raw.positions, raw.indices);
  const reduced = await simplify(
    welded.positions,
    welded.indices,
    BUDGET[entry.group],
  );
  const open = openEdges(reduced.indices);
  if (open)
    throw new Error(
      `${entry.file} left ${open} open edges: a surface that is not closed ` +
        `shows its own inside when it is faded`,
    );
  parts.push(
    pack(
      buffer,
      ID[entry.group](entry),
      entry.name,
      entry.group,
      "toothfairy",
      reduced.positions,
      reduced.indices,
      {
        ...(entry.fdi ? { fdi: entry.fdi } : {}),
        jaw: entry.fdi
          ? entry.fdi < 30
            ? "maxilla"
            : "mandible"
          : entry.label === 1
            ? "mandible"
            : entry.label === 2
              ? "maxilla"
              : undefined,
        ...(entry.axes ? { axes: entry.axes, axesDerived: true } : {}),
        label: entry.label,
        shells: entry.shells,
        sourceMember: sidecar.sourceFile,
        sourceSha256: sidecar.sourceSha256,
        sourceVoxels: entry.voxels,
        sourceMm3: entry.mm3,
        meshedTriangles: entry.triangles,
        simplifiedError: Number(reduced.error.toFixed(5)),
      },
    ),
  );
}

publish({
  buffer,
  owns: ["toothfairy"],
  parts,
  sources: {
    toothfairy: {
      title:
        "ToothFairy3: segmentation of maxillofacial CBCT volumes",
      authors:
        "Federico Bolelli, Luca Lumetti, Shankeeth Vinayahalingam and colleagues; University of Modena and Reggio Emilia",
      year: 2025,
      doi: "10.1109/TMI.2024.3523096",
      doiNote:
        "That DOI is the 2023 ToothFairy challenge paper, which is the canal alone across 443 scans. It is the lineage of this release rather than its own paper; the release itself is the 2025 challenge and is cited from its page.",
      url: "https://ditto.ing.unimore.it/toothfairy3/",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      patient: `Case ${sidecar.case} of 532`,
      units: "millimeter",
      processing:
        "Voxel labels rather than meshes, so the surfaces are made here. Each label is taken at its largest connected component, padded, blurred by 0.7 of a voxel and passed through marching cubes at the half level, then smoothed with a Taubin filter that does not shrink it, welded and simplified with meshoptimizer to 6,000 triangles a tooth, 3,000 a pulp, 4,000 a canal, 2,000 a sinus floor and 34,000 a jaw of bone. Nothing is moved: the frame is the scan's own, turned a half turn about the anteroposterior axis to stand it up.",
      orientation:
        "The volume's stored affine claims superior is +Z and it is not: the voxel index it calls Z increases toward the feet. Orientation here is taken from the anatomy instead, and the correction is a rotation rather than a negated axis, because negating one axis would mirror the patient and put every left and right in this atlas on the wrong side of a real person.",
      derivation:
        "Segmented from the cone beam CT of one adult and released as training data for a segmentation challenge. This case was chosen from all 532 because it is one of fifteen carrying all thirty two teeth and a pulp inside every one of them, with both inferior alveolar canals in one piece and no bridge, crown or implant.",
      axes:
        "This dataset does not publish tooth axes, so they are measured here: the long axis is the tooth's own first principal component, the crown end of it is known from which jaw the tooth is in, and the labial direction is the part of \"away from the middle of the arch\" that is square to the arch itself. Checked against the axes Open-Full-Jaw does publish, the same method lands within a median of 9 degrees on all three axes and never more than 25.",
      pdlModel:
        "None. This dataset carries no periodontal ligament at all; the Open-Full-Jaw patient is the only source here that does.",
      limits:
        "One patient rather than a norm, and a scan rather than a model, so every surface is what a 0.3 mm voxel could resolve and no finer. The pulp reaches 78 to 97 percent of the way down each root and stops 0.6 to 4.5 mm short of the apex, because a canal narrower than the sampling cannot be recovered: chambers and the coronal and middle canal are real here, apical anatomy and working length are not, and a molar pulp arrives in two to four pieces for the same reason. The maxillary sinus and the upper jawbone are cut off by the scan's field of view, so what is here is a sinus floor and an alveolar process rather than a whole sinus or a whole maxilla. There is no periodontal ligament, no enamel and dentin division, no cementum, no gingiva and no nerve inside the canal. Redistributed under CC BY-SA 4.0: any derivative carries the same terms. That is not the license the rest of this atlas carries.",
      case: sidecar.case,
      caseSha256: sidecar.sourceSha256,
      voxelSpacingMm: sidecar.spacing,
      used: parts.filter((part) => part.fdi).map((part) => part.fdi),
    },
  },
});
