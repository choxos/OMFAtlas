# Published dental models

The files in this directory are derived from four openly licensed datasets.
None is drawn by this project, none is segmented by this project, and none is
registered onto the head and neck assembly.

**They are not all under the same license.** Two are CC BY 4.0. The other two
each bind derivatives to their own terms, and one of those two also forbids
commercial use. Each set of terms is kept in its own file, so the file
boundary is the license boundary and a reader who never opens one never
downloads it:

| File | Contents | License |
| --- | --- | --- |
| `dental.bin` | Diaz synthetic lower jaw, Kang immature molar | CC BY 4.0 |
| `open-full-jaw.bin` | Open-Full-Jaw patient 12, both jaws | CC BY-NC-SA 4.0 |
| `toothfairy.bin` | ToothFairy3 case F_026, a whole mouth | CC BY-SA 4.0 |

Each set has its own importer, because each has its own source archive and
those run to gigabytes: nobody should need all of them on disk to rebuild one.
`scripts/import-dental-models.mjs` owns the first two files and
`scripts/import-toothfairy.mjs` the third, and both share
`scripts/mesh-tools.mjs`. An importer replaces only the sets it names and
merges into `manifest.json` rather than rewriting it. The manifest records,
for every structure, which file it is in, the source archive, the digest of
the file it came from, the triangle count before and after simplification, and
the limits the source itself states.

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

## One patient's whole mouth, from the scan itself

Bolelli F, Lumetti L, Vinayahalingam S and colleagues. *ToothFairy3*, MICCAI
2025. <https://ditto.ing.unimore.it/toothfairy3/> · **CC BY-SA 4.0**

The published paper is the earlier ToothFairy challenge, which is the canal
alone across 443 scans: Bolelli F and colleagues (2025), *Segmenting the
Inferior Alveolar Canal in CBCTs Volumes: The ToothFairy Challenge*, IEEE
Transactions on Medical Imaging 44(4):1890-1906,
<https://doi.org/10.1109/TMI.2024.3523096>, PMID 40030587. It is the lineage
of this release rather than its own paper.

Case F_026 of the 532, chosen because it is one of fifteen carrying all
thirty two teeth with a pulp inside every one of them, both inferior alveolar
canals in a single piece each, and no bridge, crown or implant. It is the only
source here with a whole dentition, and the only one that can open any tooth
onto its own canal.

This dataset is voxels rather than meshes, so the surfaces are made here by
`scripts/toothfairy-surfaces.py`: each label is taken at its largest connected
component, padded, blurred by 0.7 of a voxel, passed through marching cubes at
the half level, smoothed with a Taubin filter that does not shrink it, then
welded and simplified with meshoptimizer to 6,000 triangles a tooth, 3,000 a
pulp, 4,000 a canal, 2,000 a sinus floor and 34,000 a jaw of bone. A pulp is
the exception to the largest component rule: a molar's arrives in two to four
pieces because a canal narrower than the sampling cannot stay connected, and
every piece over 2 mm³ is kept.

Nothing is moved. The frame is the scan's own, turned a half turn about the
anteroposterior axis to stand it up. That correction matters twice over. The
volume's stored affine claims superior is +Z and it is not: the index it calls
Z increases toward the feet, and believing it turns the jaw upside down and
puts the root apices 18 mm from the alveolar canal instead of 2 mm. Undoing
that by negating one axis would be a reflection, which would mirror the
patient and put every left and right in this atlas on the wrong side of a real
person, so the correction is a rotation and the determinant is asserted.

The dataset publishes no tooth axes, so they are measured here: the long axis
is the tooth's own first principal component, the crown end of it is known
from which jaw the tooth is in, and the labial direction is the part of "away
from the middle of the arch" that is square to the arch itself. Run against
the axes Open-Full-Jaw does publish, that method lands within a median of 9
degrees on all three axes and never more than 25, so the section names it
allows are close rather than exact and the interface says so.

This is one adult's scan, not a norm, and nothing in it is finer than the
0.3 mm the voxels were sampled at. Each pulp reaches 78 to 97 percent of the
way down its root and stops 0.6 to 4.5 mm short of the apex, because a canal
narrower than that cannot be recovered: chambers and the coronal and middle
canal are real here, apical anatomy and working length are not. The maxillary
sinus and the upper jawbone are cut off by the scan's field of view, so what
is here is a sinus floor and an alveolar process rather than a whole sinus or
a whole maxilla, and both are named that way on screen. There is no
periodontal ligament in this dataset, no enamel and dentin division, no
cementum, no gingiva, and no nerve inside the canal.

The pharynx, the mandibular incisive canals and the lingual canal are labeled
in the source and are not taken: the first is an airway rather than jaw
anatomy and the others survive as fragments of 7 to 12 mm³.

## Attribution when redistributing

Keep this file with the assets. All four datasets require attribution to their
authors and a link to the license, and none may be presented as this project's
own work.

Two of them add terms the CC BY 4.0 pair do not. **ShareAlike** applies to
both: the simplified meshes in `open-full-jaw.bin` and `toothfairy.bin` are
derivatives and must be distributed under the same license their source
carries, CC BY-NC-SA 4.0 and CC BY-SA 4.0 respectively. **NonCommercial**
applies to `open-full-jaw.bin` alone: it may not be used for commercial
advantage, and anything built on it inherits that restriction whatever the
rest of this repository is licensed as. `toothfairy.bin` carries no such
clause. The MIT `LICENSE` at the root of this repository covers the code,
never these assets.

Open-Full-Jaw and ToothFairy3 are also the two sets here that are real people
rather than models, one patient each, and both are presented that way on
screen: segmented patient scans shown as teaching material, not diagnostic
imaging and not a norm.
