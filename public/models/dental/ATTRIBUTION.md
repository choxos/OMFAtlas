# Published dental models

The files in this directory are derived from two openly licensed datasets.
Both are redistributed here under CC BY 4.0, the licence their authors chose.
Neither is drawn by this project, neither is segmented from a patient by this
project, and neither is registered onto the head and neck assembly.

`scripts/import-dental-models.mjs` produces `dental.bin` and `manifest.json`.
The manifest records, for every structure, the source archive, the digest of
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

## Attribution when redistributing

Keep this file with the assets. Both datasets require attribution to their
authors and a link to the licence, and neither may be presented as this
project's own work or as patient imaging.
