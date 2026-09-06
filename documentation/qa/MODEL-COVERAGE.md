# Head and neck model coverage

Current combined viewer: **643 meshes**, including the 596-mesh 4.0 extraction documented below plus **47 registered 3.0 facial/masticatory muscles**, raising the muscle layer to 175. The supplemental assets contain 706,042 triangles and are separately licensed CC BY-SA 2.1 Japan. They restore masseter, temporalis, pterygoid and facial-expression muscles omitted from the 4.0 release. See [source and registration evidence](FACIAL-SOURCE.md). Counts and omissions below describe the base 4.0 extraction unless stated otherwise.

## Source and extraction

Verified against `ashemag/human-atlas` commit `7a383d3ee2759e3ddf157c704fb8814fd0c50bcb` on 2026-09-06. Its packaged BodyParts3D 4.0 adult male atlas contains 2,234 meshes. Extraction keeps 596 and excludes 1,638. Mesh counts are not counts of distinct organs or anatomical concepts. No pediatric source geometry is provided.

`node scripts/extract-models.mjs /path/to/human-atlas` rebuilds the artifacts. Binary layout: float32 positions, signed int16 normals, uint32 triangle indices, four-byte aligned byte offsets. Existing IDs, English names, source systems and FMA concept IDs are preserved. Display groups correct source classifications such as brain ventricles under `cardiac` and levator scapulae under `skeletal` without changing the source system field.

## Spatial boundary

Source coordinates are meters with Y up. Include geometry at or above **Y = 1.438 m**, immediately below the inferior edge of the C7 intervertebral disk (source bound 1.4381112 m). No X/Z crop is imposed. Fifty-one included meshes cross the plane. Crossing triangles are clipped, interpolating vertices and normals. Cut ends remain open and `part.clipped` is true. No cap, continuation or missing branch is invented. Lower neck anatomy, thoracic attachments of neck muscles, vessels, skin, trachea and esophagus below that level are outside this view. This is not an intact complete neck dissection.

Twenty-six meshes intersect the plane but are excluded as torso/shoulder structures: bilateral external intercostals, levatores costarum breves and longi, thoracic rotators, iliocostalis thoracis, longissimus thoracis, rhomboid major and minor, serratus posterior superior, transverse trapezius, dorsal scapular arteries, first ribs, and the first two thoracic vertebrae. Descending trapezius and muscles spanning the neck retain their portions above the crop. All other source meshes intersecting the plane are included.

## Packaged display groups

| Group | Meshes |
| --- | ---: |
| bones | 24 |
| neck | 13 |
| teeth | 28 |
| gingiva | 2 |
| muscles | 128 |
| arteries | 161 |
| veins | 2 |
| nerves | 36 |
| brain | 112 |
| eyes | 36 |
| glands | 6 |
| airway | 28 |
| soft | 16 |
| skin | 4 |

## Important omissions and limits

- Only 28 permanent tooth meshes, no third molar or primary-tooth segmentation. Adult/child dentition diagrams or schematic meshes must be identified separately.
- Only the left and right internal jugular vein segments reach this crop. The source itself does not supply complete intracranial/facial venous geometry.
- The source mesh-name inventory has no masseter, temporalis, pterygoid muscle, parotid gland, facial vein, external jugular vein, or thyroid gland entries. Related grouped concepts are not additional segmented geometry. This is not complete dentistry or head/neck coverage.
- Tooth internals and periodontal details supplied by the application are schematic. Pediatric craniofacial accuracy cannot be inferred from an adult male source.
- Duplicated names and separate meshes sharing concept IDs are retained. Clinical interpretation requires specialist review.

## Resolution and verification

The current extraction has **535,567 vertices, 749,913 triangles, 18,639,752 binary bytes**. It adds no simplification. The reference uses meshoptimizer with a 0.2% relative-error limit and a 22% index-count target. The [official download page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html) provides `isa_BP3D_4.0_obj_99.zip` (136 MB), itself labeled 99% polygon reduction. Those OBJ files remove the reference's additional simplification, not restore unreduced anatomy. Filenames map to IDs, e.g. `FJ1252.obj`. Transform: `[x * .001, z * .001 + .0781112, -y * .001 - .1]` from millimeters/Z-up.

Extraction ran successfully. All source and output positions were finite, triangle indices valid, retained coordinates within the crop, and torso-exclusion names absent. An independent post-write read checked all 596 buffer extents, finite coordinates and index limits. The extractor includes an executable crossing-triangle assertion. `node --check scripts/extract-models.mjs` passed. Visual integration and pediatric/tooth-detail behavior require separate application QA.

## Schematic additions

Added September 6, 2026. `src/schematic-anatomy.js` builds 77 structures that the source dataset does not contain, because the gaps cover most of what an oral and maxillofacial atlas is about. BodyParts3D 4.0 has 55 nerve concepts in total and every one is orbital; its head arteries are the carotids and the intracranial tree.

| Group | Built | Notes |
| --- | ---: | --- |
| Nerves | 43 | V3 with the inferior alveolar, mental, incisive, lingual, buccal, mylohyoid and auriculotemporal branches; V2 with the infraorbital, posterior/middle/anterior superior alveolar, greater and lesser palatine branches; the midline nasopalatine nerve; the facial nerve trunk and its five terminal branches |
| Arteries | 16 | External carotid, lingual, facial, maxillary, inferior alveolar, superficial temporal, posterior superior alveolar, greater palatine |
| Veins | 8 | Facial, retromandibular, external jugular, pterygoid plexus |
| Glands | 6 | Parotid gland, parotid duct, submandibular duct |
| Airway | 2 | Maxillary sinus |
| Soft tissue | 2 | Temporomandibular articular disc |

Every one of these carries `schematic: true`, is badged in the structure list, the hover label and the inspector, and can be hidden as a set. Courses are fitted at run time to landmarks measured on the licensed meshes, never typed in; `tests/schematic-anatomy.test.mjs` asserts those anchoring rules.

Still absent from both the source and the schematic set: the glossopharyngeal, vagus, accessory and hypoglossal nerves; the pterygopalatine and submandibular ganglia; the palatine tonsils; the cervical lymph nodes; and the frontal, ethmoid and sphenoid sinuses. Independent dental-specialist review of the schematic courses has not been carried out.
