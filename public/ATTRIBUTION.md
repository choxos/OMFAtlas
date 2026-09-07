# Anatomy data and application attribution

**The published dental models are not covered by this file and are not all
CC BY 4.0.** Four separate datasets under `models/dental/` carry their own
terms, two of which bind derivatives and one of which forbids commercial use.
They have their own notice, and it must travel with them:
[models/dental/ATTRIBUTION.md](models/dental/ATTRIBUTION.md).

| File | Source | License |
| --- | --- | --- |
| `models/dental/dental.bin` | Diaz synthetic lower jaw; Kang immature molar | CC BY 4.0 |
| `models/dental/open-full-jaw.bin` | Open-Full-Jaw patient 12 | CC BY-NC-SA 4.0 |
| `models/dental/toothfairy.bin` | ToothFairy3 case F_026 | CC BY-SA 4.0 |


The separate 47 adapted facial/masticatory meshes under `models/facial/` come from BodyParts3D 3.0 and retain **CC Attribution-Share Alike 2.1 Japan**. See [their full source, transformation, and license notice](models/facial/ATTRIBUTION.md). The CC BY 4.0 statement below applies to the 4.0 base and high-resolution assets, not these supplemental assets.

BodyParts3D, © The Database Center for Life Science, licensed under Creative Commons Attribution 4.0 International.

- Official dataset: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- Official licensing: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- License: https://creativecommons.org/licenses/by/4.0/
- Publication: Mitsuhashi et al. (2009), BodyParts3D: 3D structure database for anatomical concepts. https://doi.org/10.1093/nar/gkn613

The browser geometry was obtained from Human Atlas by ashemag:
https://github.com/ashemag/human-atlas/tree/7a383d3ee2759e3ddf157c704fb8814fd0c50bcb

Upstream adaptations include millimeter/Z-up to meter/Y-up conversion, translation, meshoptimizer simplification with a 0.2% relative error limit, signed 16-bit normals, and binary packing.

OMF Atlas extracts and repacks 596 head-and-neck meshes from that geometry into one binary asset. Source mesh/concept identifiers are retained. Fifty-one meshes crossing the lower-neck plane at Y=1.438 meters are clipped with open cut ends; torso-only structures are excluded. Display categories and colors are adapted for dental education. No whole-body model is bundled. The adult male reference contains 28 permanent teeth; source segmentation of primary teeth and third molars is absent.

549 higher-detail surface meshes are also repacked directly from the official `isa_BP3D_4.0_obj_99.zip` archive, removing the reference application's additional simplification. The same coordinate transform and neck crop apply. These assets retain the archive's own reduced resolution, not unreduced scans. They are stored individually for on-demand loading. Archive SHA-256: `40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e`.

The 77 schematic oral and maxillofacial structures are original teaching geometry, not BodyParts3D assets and not derived from any third-party model. BodyParts3D 4.0 contains no maxillary or mandibular division of the trigeminal nerve, no facial nerve, no external carotid artery or any of its branches, no parotid gland, no facial vein, no paranasal sinus, and no temporomandibular articular disc; those structures are built at run time from landmarks measured on the licensed meshes. They are labeled as schematic wherever the application names them.

The tooth development diagrams are original schematic illustrations. They are drawn, not traced from histological sections, and no third-party figure is reproduced.

The procedural 3D teeth, adult/primary/mixed dental arches, tooth-section and canal diagrams are original schematic teaching illustrations. They are not scans, histological sections, or reconstructions of the BodyParts3D meshes. Tissue proportions and canal locations are conceptual; roots are spread into the section plane for inspection. No pediatric skull is fabricated from the adult source. Text describes typical anatomy and selected variants, with sources linked in the application. No source textbook illustrations are redistributed. The studio UI is inspired by Human Atlas.

## Human Atlas MIT notice

Copyright (c) 2026 ashemag

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
