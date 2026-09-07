# Published dental models

The files in this directory are derived from three openly licensed datasets.
None is drawn by this project, none is segmented by this project, and none is
registered onto the head and neck assembly.

**They are not all under the same license.** Two are CC BY 4.0. The third,
Open-Full-Jaw, is **CC BY-NC-SA 4.0**: it may not be used commercially, and
anything derived from it carries the same terms. The two licenses are kept in
separate files so the file boundary is the license boundary:

| File | Contents | License |
| --- | --- | --- |
| `dental.bin` | Diaz synthetic lower jaw, Kang immature molar | CC BY 4.0 |
| `open-full-jaw.bin` | Open-Full-Jaw patient 12, both jaws | CC BY-NC-SA 4.0 |

`scripts/import-dental-models.mjs` produces both, plus `manifest.json`. The
manifest records, for every structure, which file it is in, the source archive,
the digest of the file it came from, the triangle count before and after
simplification, and the limits the source itself states.

## Synthetic lower jaw

Diaz and colleagues (2024). *Data of synthetic 3D models of the human jaw,
including teeth, ligaments, and bone structures.* Mendeley Data, V1.
<https://doi.org/10.17632/xjsx7nfhj8.1> · CC BY 4.0

Cortical and cancellous alveolar bone, fourteen lower teeth and a periodontal
ligament shell for each, taken from the binary STL files of the published
archive. Vertices are welded on exact coordinates. Nothing is decimated,
smoothed, scaled or moved: the assembly positions are the source's own.

The source built the ligament by extruding 0.25 mm radially around each root.
It is a synthetic shell of even thickness, not a segmented ligament, and its
width cannot be read as a measurement. The dataset carries no pulp, no
cementum, no gingiva and no nerve, and it is a model rather than a patient.

## Immature first permanent molar

Kang, Fang Fang (2024). Models for Shi H, Kang FF, Liu Q, *Stress induced on
permanent mandible first molar and space maintainer under normal masticatory
forces: a finite element study.* figshare.
<https://doi.org/10.6084/m9.figshare.24591537.v1> · CC BY 4.0

The study: PeerJ 12:e17456, <https://doi.org/10.7717/peerj.17456> · CC BY 4.0

The outer surface of a mandibular first permanent molar, its pulp cavity, its
periodontal ligament and the band and loop space maintainer built on it. The
STEP solids are tessellated with OpenCASCADE through occt-import-js at a
linear deflection of 0.0015 of the bounding box and an angular deflection of
0.5 radians, welded, then simplified to 34,000 triangles each. The manifest
records the tessellated count and the simplification error for each.

The shape was built from the cone beam CT of a seven year old in mixed
dentition, so it is an immature tooth and not an adult standard form. The
outer surface is not divided into enamel and dentin. The pulp cavity is the
cavity that was modeled, not pulp tissue: it carries no apical foramen, no
lateral canals, no vessels and no nerve, and no canal length or preparation
amount can be measured from it. The source gives the ligament thickness as
0.15 mm in its methods and 0.2 mm in its discussion; the paper states both.

## One patient's upper and lower jaw

Gholamalizadeh T, Moshfeghifar F, Ferguson Z, Schneider T, Panozzo D, Darkner
S, Makaremi M, Chan F, Sondergaard PL, Erleben K (2022). *Open-Full-Jaw: an
open-access dataset and pipeline for finite element models of human jaw.*
Computer Methods and Programs in Biomedicine 224:107009.
<https://doi.org/10.1016/j.cmpb.2022.107009> · PMID 35872385

Repository: <https://github.com/diku-dk/Open-Full-Jaw> · **CC BY-NC-SA 4.0**

Patient 12 of the seventeen: the mandible and the maxilla, thirty one teeth as
individual solids, and a periodontal ligament for each of them. The per tooth
binary STL files and the jaw's ASCII STL bone and ligament surfaces are welded
and simplified with meshoptimizer to 6,000 triangles a tooth, 3,000 a ligament
and 34,000 a jaw of bone. The ligament arrives as one mesh per jaw and is
separated here into its connected shells, one per tooth, each given to the
tooth whose center it is nearest; the import refuses to run unless that comes
out as one shell per tooth. Nothing is smoothed, thickened or moved, and both
arches stay in the coordinate frame the scan was segmented in, which is what
lets them stand in one scene as one person's mouth.

The dataset also publishes each tooth's principal axes, and its own pipeline
names them: toward the distal side, toward the labial side, toward the
occlusal side. Those are carried into the manifest, which is what lets a tooth
be stood on its own long axis and its cutting planes be named buccolingual,
mesiodistal and horizontal rather than after an axis of the scanner.

This is one adult segmented from a cone beam CT and clinically validated by
the study, not a standard form. The teeth are worn, tipped and spaced as that
person's are, and the upper left first molar is absent because that person is
missing it. The dataset carries bone, teeth and ligament only: no pulp and no
canal, no enamel and dentin division, no cementum, no gingiva and no nerve.
The ligament was generated as the gap between each root and its socket rather
than by extruding a fixed thickness, so its width follows the socket, but it
is a generated surface and not segmented ligament tissue.

The CBCT scans behind the dataset were provided by 3Shape A/S.

## Attribution when redistributing

Keep this file with the assets. All three datasets require attribution to
their authors and a link to the license, and none may be presented as this
project's own work.

Open-Full-Jaw adds two terms the other two do not. **NonCommercial:** it may
not be used for commercial advantage, so anything built on `open-full-jaw.bin`
inherits that restriction whatever the rest of this repository is licensed as.
**ShareAlike:** the simplified meshes in `open-full-jaw.bin` are a derivative
of it and must be distributed under CC BY-NC-SA 4.0 as well. The MIT `LICENSE`
at the root of this repository covers the code, never these assets.

Open-Full-Jaw is also the one set here that is a real person rather than a
model, and it is presented that way on screen: it is a segmented patient scan
shown as teaching material, not diagnostic imaging and not a norm.
