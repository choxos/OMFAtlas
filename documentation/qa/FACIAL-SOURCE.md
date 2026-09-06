# Facial muscle source investigation

Verified September 6, 2026. The original base atlas is unchanged; registered facial assets are packaged separately.

## Outcome

The official BodyParts3D 3.0 archive supplies 47 missing facial-expression and masticatory muscle meshes. Their 95%-reduction geometry was retrieved directly from the official archive using HTTP byte ranges, avoiding a full 522 MB download. Four shared bone meshes were also retrieved as alignment controls. Together the 51 files contain 789,416 triangles and 57,547,846 uncompressed bytes.

These are **version 3.0 models, not version 4.3**. A common similarity transform, fitted to three shared bones and validated against a fourth held-out bone, now aligns them with the 4.0 base. The unchanged coordinate transform alone is not valid; measurements before and after registration are below.

## Primary sources

- [Official version 3.0 archive directory](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/), containing `BodyParts3D_3.0_obj_95.zip` and `BodyParts3D_3.0_obj_99.zip`.
- [Official name and FMA-ID list](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/parts_list_e.txt). Selected archive filenames are FMA IDs; the table verifies their anatomical names.
- [Version 3.0 README and license](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/README_e.html). The 95% variant retains more geometry than the 99% variant. The source remains reduced geometry, not an unreduced patient scan.
- [Version 3.0 release notes](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/release_3.0_e.html) disclose incomplete coverage and possible gaps/overlap between structures.
- [Current Anatomography source-site license](https://lifesciencedb.jp/bp3d/info_en/license/index.html).

The source archive README and downloaded OBJ headers specify **CC Attribution-Share Alike 2.1 Japan**. Required attribution: BodyParts3D, Copyright© The Database Center for Life Science licensed by CC Attribution-Share Alike 2.1 Japan. Preserve this license for adapted facial assets separately from the 4.0 archive's current CC BY 4.0 attribution.

## Why the 4.3 route did not solve facial muscles

The [olivercase downloader repository](https://github.com/olivercase/body_parts_3d_api) was used only to identify official endpoints; its downloader was read, not executed. The live official `get-info.cgi?version=4.3&cmd=concept-objfiles-list` ZIP identifies Data Version 4.3, Objects set 4.3, and 3,210 unique FJ element IDs. Its canonical set omits the target facial muscles.

The live official `upload-all-list` table contains named older FJ facial uploads and newer unmapped variants, but these rows have no BP/FMA mapping and are outside the 4.3 canonical set. Attempting `download.cgi` for unmapped left temporalis FJ170 produced no usable mesh. Those uploads are not misrepresented as downloadable 4.3 assets.

## Download artifacts

Temporary staging directory: `/tmp/omfatlas-facial43.HOETc2/`.

- `objs/FMA*.obj`: 47 muscles plus 4 bone controls.
- `selected.json`: exact names, IDs, triangle/vertex counts, byte sizes, and raw millimeter bounds.
- `fetch-selected.mjs`: bounded HTTP Range downloader, using official ZIP central-directory records and decompression; validates HTTP 206 responses, decompressed lengths, and finite vertices.
- `FMA2Obj.txt` and `obj2FMA.html`: live official 4.3 metadata, not inferred from the mirror.

Key muscle IDs: orbicularis oris FMA46841; superficial masseters FMA49001/49002; deep masseters FMA49004/49005; temporales FMA49007/49008; medial pterygoids FMA49012/49013; lower lateral-pterygoid heads FMA49022/49023; upper heads FMA49024/49025. All side-pairs are right/left respectively.

The collection also includes bilateral frontalis, occipitalis, orbital/palpebral orbicularis oculi, corrugator supercilii, levator labii superioris alaeque nasi, levator labii superioris, zygomaticus major/minor, depressor labii inferioris, levator anguli oris, mentalis, depressor anguli oris, buccinator, risorius, nasalis, and procerus. No parotid model was found in this 3.0 name list.

## Coordinate compatibility: direct overlay fails

Raw OBJ coordinates are millimeters in the source axes. We compared up to 256 evenly spaced vertices per bone to the nearest vertex of the corresponding official 4.0 original OBJ. This tests geometry, not merely bounding-box overlap. No fitted transformation was applied for this test.

| Bone | 3.0 ID | 4.0 ID | 3.0 to 4.0 median / p95 (mm) | 4.0 to 3.0 median / p95 (mm) |
| --- | --- | --- | ---: | ---: |
| Mandible | FMA52748 | FJ3289 | 10.069 / 13.547 | 3.873 / 14.600 |
| Frontal bone | FMA52734 | FJ3200 | 3.187 / 6.658 | 7.060 / 10.103 |
| Right maxilla | FMA53649 | FJ3375 | 4.236 / 10.431 | 5.217 / 12.243 |
| Left maxilla | FMA53650 | FJ3269 | 4.376 / 10.203 | 5.484 / 12.193 |

Thus applying only the existing millimeter-to-meter/Y-up conversion would be incorrect.

## Validated registration and separate import

A single similarity ICP transform was fitted using mandible, frontal bone, and right maxilla. Left maxilla was withheld from fitting. Each iteration matched vertices only within the corresponding bone, retained the nearest 95% of correspondences, and solved a scale/rotation/translation fit by SVD. The fit converged in 14 iterations. Bounds provided only the initialization, not the evidence of registration.

For column-vector raw source coordinates in millimeters, `v40 = scale * rotation * v30 + translationMm`:

```json
{
  "scale": 1.059369874098004,
  "rotation": [
    [0.9999999697814653, -0.00022542358070208187, 0.00009808811509434028],
    [0.00022540964137606034, 0.9999999644993117, 0.00014209810025212806],
    [-0.00009812014387505785, -0.000142075985950868, 0.9999999850934261]
  ],
  "translationMm": [-0.15057996010419217, 15.397670982185474, -99.29859059211003]
}
```

Independent validation computed exact point-to-triangle distances, including triangle-interior projections and edge distances, over approximately 512 evenly spaced vertices in each direction per bone. This avoids mistaking sparse mesh vertex spacing for surface misalignment. Validation included all triangles of the destination mesh, without distance trimming.

| Bone | 3.0 to 4.0 surface RMS / p95 (mm) | 4.0 to 3.0 surface RMS / p95 (mm) |
| --- | ---: | ---: |
| Mandible, training | 0.104 / 0.183 | 0.053 / 0.108 |
| Frontal bone, training | 0.168 / 0.312 | 0.073 / 0.146 |
| Right maxilla, training | 0.260 / 0.526 | 0.086 / 0.160 |
| Left maxilla, held out | 0.258 / 0.499 | 0.089 / 0.165 |

Held-out maximum sampled surface distances were 1.070 mm (3.0→4.0) and 0.291 mm (4.0→3.0). These results support a common coordinate transformation for educational visualization. They do not prove every muscle attachment is anatomically exact, remove source modeling defects, or constitute specialist validation. The check samples vertices, not every point on every surface.

The numerical driver is staged at `/tmp/omfatlas-facial43.HOETc2/register.py`. It used NumPy 2.4.0 and SciPy 1.14.1. SciPy warned that this NumPy version is outside its supported version range; the computation completed, and the surface-distance validation used direct NumPy geometry independently of the ICP nearest-vertex search.

`node scripts/import-facial-muscles.mjs /tmp/omfatlas-facial43.HOETc2` applies the fixed validated transform, then the existing millimeter-to-meter/Y-up conversion. Normals rotate consistently. The import retains every source triangle and produces:

- `public/models/facial/atlas.json`: 47 `BP3-FMA*` records, names, bounds, byte offsets, source SHA-256 hashes, transform, separate license, and `/models/facial/facial.bin` buffer URL.
- `public/models/facial/facial.bin`: 706,042 triangles, 16,390,216 bytes. Float32 positions, normalized signed Int16 normals, Uint32 indices, four-byte aligned offsets.

The four validation bones are deliberately excluded to avoid duplicate skeletal geometry. Import assertions check the expected mesh count, source vertex/triangle counts, shared OBJ position/normal indexing, finite coordinates, valid indices, and neck-plane scope. The converter and `--help` ran successfully, and `node --check` passed.
