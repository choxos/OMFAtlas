# Source geometry resolution

## Source and license

The higher-detail assets use the official [BodyParts3D 4.0 OBJ archive](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/data-7.html), before the additional meshoptimizer simplification applied by human-atlas. The archive itself is labeled “Polygon reduction rate = 99%”; these are **not** unreduced original scans. The [original project download page](https://lifesciencedb.jp/bp3d/info_en/download/index.html) points to the same archive. No higher-detail source is implied beyond this verified improvement over the shipped reference geometry.

BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International. The [current archive license](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), updated February 27, 2025, permits redistribution and adaptations with attribution.

Adaptations: converted millimeters/Z-up to meters/Y-up using human-atlas's coordinate transform, cropped triangles at the same head-and-neck plane as the base atlas, quantized normals to signed 16-bit, and packaged indexed geometry into individual binary files. No subdivision, smoothing-generated topology, or synthetic resolution enhancement is applied. Crop ends remain open.

## Reproduction

Download and unpack the official ZIP to a temporary directory, then run from the repository root:

```sh
node scripts/upgrade-resolution.mjs /path/to/extracted/isa_BP3D_4.0_obj_99
```

The script reads the current `public/models/atlas.json` without modifying it. Only parts with a strictly higher triangle count receive an upgrade. `public/models/high-resolution/atlas.json` records the source URL, crop, missing or unchanged parts, and individual buffer URLs. Each record contains byte offsets for Float32 positions, normalized Int16 normals, and Uint32 indices. All offsets are four-byte aligned. `baseIndexCount` and `indexCount` make the gain auditable.

The converter asserts finite vertices, valid topology indices, matching normal counts, retained source-coordinate samples within 1 micrometer, and the neck crop boundary. Bounds are not used as a coordinate-identity test because simplification can remove small disconnected source islands. `--help` succeeds; a nonexistent source directory exits nonzero before creating output. The added script passes `node --check`; the local LSP did not return diagnostics before its timeout.

## Verified results, September 6, 2026

549 of 596 meshes have a true source-resolution upgrade; 47 retain their base geometry and none have missing OBJ sources. Upgraded structures increase from 738,280 to 1,923,576 triangles (2.61 times). Their individual buffers total 44,082,100 bytes. All 28 available adult tooth meshes, the mandible, and both maxillae improve. Source teeth do not include third molars or primary teeth.

| Structure | Base triangles | Higher-detail triangles |
| --- | ---: | ---: |
| Left lower first molar | 1,606 | 1,762 |
| Left upper first molar | 1,812 | 2,156 |
| Left maxilla | 3,598 | 5,198 |
| Mandible | 2,348 | 5,576 |
| Right maxilla | 3,660 | 5,324 |

All 549 generated buffers were independently read back as their declared typed arrays: byte sizes, final index offsets, index ranges, finite positions, crop boundaries, and strict triangle-count improvements passed. The converter ran end to end against the downloaded official archive. Browser integration is verified separately by the application QA.

Downloaded archive SHA-256: `40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e`.

Higher surface resolution does not supply absent internal anatomy or pediatric meshes. Detailed canal and periodontal visualizations remain separate educational schematics, not patient-specific reconstructions.
