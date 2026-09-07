"""Turn one ToothFairy3 label map into surfaces the atlas can load.

    Bolelli F, Lumetti L, Vinayahalingam S and colleagues. ToothFairy3,
    MICCAI 2025. https://ditto.ing.unimore.it/toothfairy3/ . CC BY-SA 4.0.

ToothFairy3 is voxels, not meshes: 532 maxillofacial cone beam CT volumes at
0.3 mm isotropic with 78 labels, among them every one of the 32 teeth, the
pulp of every one of them, and both inferior alveolar canals. This script is
the voxel half of the import. It reads one case, meshes the labels worth
meshing, and writes binary STL plus a sidecar of provenance; the node half,
scripts/import-dental-models.mjs, welds, simplifies and packs those the same
way it does every other published set.

Usage: python3 scripts/toothfairy-surfaces.py [case] [labels-directory]

Two things about this data will silently produce a wrong jaw if taken on
trust, and both are handled here rather than assumed:

  The stored affine says superior is +Z, and it is not. The voxel index k
  demonstrably increases *inferiorly*: in the case used here the maxillary
  sinus sits at k 2.5, the upper teeth at 19.5 and the lower teeth at 48.8.
  Believing the header turns the jaw upside down and puts the root apices
  18 mm from the alveolar canal instead of 2 mm.

  Getting that back the obvious way, by negating k alone, is a reflection.
  It would mirror the patient, and every "right" and "left" in this atlas
  would then be on the wrong side of a real person. The frame is turned by a
  half turn about the anteroposterior axis instead, which is a rotation, and
  the determinant is asserted below.
"""

import gzip
import hashlib
import json
import os
import struct
import sys

import numpy as np
from scipy import ndimage
from skimage.measure import marching_cubes

CASE = sys.argv[1] if len(sys.argv) > 1 else "ToothFairy3F_026"
LABELS = (
    sys.argv[2]
    if len(sys.argv) > 2
    else os.path.expanduser("~/Downloads/ToothFairy3/labelsTr")
)
OUT = "documentation/refs/ToothFairy3/surfaces"

TEETH = [11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28,
         31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48]
TOOTH_NAMES = {1: "central incisor", 2: "lateral incisor", 3: "canine",
               4: "first premolar", 5: "second premolar", 6: "first molar",
               7: "second molar", 8: "third molar"}


def fdi_name(fdi):
    """Quadrant 1 is upper right and they run clockwise from the patient's
    view: 2 upper left, 3 lower left, 4 lower right."""
    quadrant = fdi // 10
    jaw = "Upper" if quadrant <= 2 else "Lower"
    side = "right" if quadrant in (1, 4) else "left"
    return f"{jaw} {side} {TOOTH_NAMES[fdi % 10]}"


# What is worth meshing, and at what smoothing. The pharynx is an airway
# rather than jaw anatomy, and the incisive and lingual canals survive as
# fragments of 7 to 12 mm3, so none of the three is taken.
OTHER = {
    1: ("Mandible", "bone"),
    2: ("Maxillary alveolar process", "bone"),
    3: ("Left inferior alveolar canal", "canal"),
    4: ("Right inferior alveolar canal", "canal"),
    5: ("Left maxillary sinus floor", "sinus"),
    6: ("Right maxillary sinus floor", "sinus"),
}

PAD = 2          # marching cubes leaves an open surface at the array edge
SIGMA = 0.7      # voxels; takes the staircase off a 0.3 mm sampled surface
TAUBIN = (0.5, -0.53, 12)   # lambda, mu, iterations
MIN_PIECE_MM3 = 2.0         # a pulp piece smaller than this is noise


# ---- NIfTI ---------------------------------------------------------------

DTYPES = {2: np.uint8, 4: np.int16, 8: np.int32, 16: np.float32,
          64: np.float64, 256: np.int8, 512: np.uint16, 768: np.uint32}


def read_nifti(path):
    with gzip.open(path, "rb") as handle:
        head = handle.read(348)
        endian = "<" if struct.unpack("<i", head[:4])[0] == 348 else ">"
        assert struct.unpack(endian + "i", head[:4])[0] == 348, path
        dim = struct.unpack(endian + "8h", head[40:56])
        datatype = struct.unpack(endian + "h", head[70:72])[0]
        pixdim = struct.unpack(endian + "8f", head[76:108])
        vox_offset = int(struct.unpack(endian + "f", head[108:112])[0])
        shape = tuple(dim[1:1 + dim[0]])
        handle.read(max(0, vox_offset - 348))
        data = np.frombuffer(
            handle.read(), dtype=np.dtype(DTYPES[datatype]).newbyteorder(endian)
        )
        data = data[: int(np.prod(shape))].reshape(shape, order="F")
    return data, np.array(pixdim[1:4], dtype=np.float64)


# ---- Meshing -------------------------------------------------------------

def taubin(vertices, faces, lam, mu, iterations):
    """Smooth without the shrinking a plain Laplacian causes. A canal here is
    three voxels across, and a shrinking filter closes it."""
    count = len(vertices)
    edges = np.vstack([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]])
    edges = np.vstack([edges, edges[:, ::-1]])
    order = np.lexsort((edges[:, 1], edges[:, 0]))
    edges = edges[order]
    keep = np.ones(len(edges), dtype=bool)
    keep[1:] = (edges[1:] != edges[:-1]).any(axis=1)
    edges = edges[keep]
    valence = np.bincount(edges[:, 0], minlength=count).astype(np.float64)
    valence[valence == 0] = 1

    out = vertices.astype(np.float64).copy()
    for step in range(iterations):
        weight = lam if step % 2 == 0 else mu
        summed = np.zeros_like(out)
        np.add.at(summed, edges[:, 0], out[edges[:, 1]])
        out += weight * (summed / valence[:, None] - out)
    return out


def signed_volume(vertices, faces):
    a, b, c = (vertices[faces[:, i]] for i in range(3))
    return float(np.einsum("ij,ij->i", a, np.cross(b, c)).sum() / 6.0)


def surface(mask, spacing):
    """One binary mask to a rotated, smoothed, outward wound mesh."""
    padded = np.pad(mask.astype(np.float32), PAD)
    field = ndimage.gaussian_filter(padded, SIGMA)
    vertices, faces, _, _ = marching_cubes(field, level=0.5)
    vertices = taubin(vertices, faces, *TAUBIN)
    vertices = (vertices - PAD) * spacing

    # Voxel index i runs toward the patient's right, j posteriorly and k
    # inferiorly. The rest of this atlas models a jaw with x toward the
    # patient's left, y posterior and z superior, so this is a half turn about
    # y. Negating k on its own would reach the same z and mirror the patient.
    rotation = np.diag([-1.0, 1.0, -1.0])
    assert abs(np.linalg.det(rotation) - 1.0) < 1e-12, "frame change must be a rotation"
    vertices = vertices @ rotation.T

    if signed_volume(vertices, faces) < 0:
        faces = faces[:, ::-1]
    return vertices, faces


def write_stl(path, pieces):
    """Binary STL. Several closed shells in one file is legal and is what a
    molar pulp is: a chamber and canals that the scan could not join."""
    triangles = sum(len(faces) for _, faces in pieces)
    with open(path, "wb") as handle:
        handle.write(b"OMFAtlas ToothFairy3 surface".ljust(80, b" "))
        handle.write(struct.pack("<I", triangles))
        for vertices, faces in pieces:
            corners = vertices[faces]
            normals = np.cross(
                corners[:, 1] - corners[:, 0], corners[:, 2] - corners[:, 0]
            )
            lengths = np.linalg.norm(normals, axis=1, keepdims=True)
            normals = np.divide(normals, lengths, where=lengths > 0)
            block = np.zeros((len(faces), 12), dtype="<f4")
            block[:, 0:3] = normals
            block[:, 3:12] = corners.reshape(len(faces), 9)
            raw = block.tobytes()
            for at in range(len(faces)):
                handle.write(raw[at * 48:(at + 1) * 48])
                handle.write(b"\0\0")
    return triangles


# ---- Tooth axes ----------------------------------------------------------

# The order the teeth sit in around each arch, which is what makes a "next
# tooth along" meaningful. Right third molar round to left third molar.
ARCH_ORDER = {
    "upper": [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
    "lower": [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
}


def arch_tangent(centers, order, fdi):
    """Which way the arch runs at this tooth: the line through its neighbours.

    Pointing straight out from the middle of the arch is only the buccal
    direction at the front. Behind the canines the arch has curved away and
    that ray turns backward instead: measured against Open-Full-Jaw's own
    published axes it was 40 to 66 degrees off at the molars. Following the
    arch and taking the perpendicular holds all the way round."""
    here = order.index(fdi)
    before = next((f for f in reversed(order[:here]) if f in centers), None)
    after = next((f for f in order[here + 1:] if f in centers), None)
    if before is None:
        before, after = fdi, after
    if after is None:
        before, after = before, fdi
    return centers[after] - centers[before]


def tooth_axes(points, fdi, arch_center, along):
    """The tooth's own frame, derived rather than published.

    Open-Full-Jaw ships each tooth's principal axes; ToothFairy3 does not, so
    they are measured here. The long axis is the first principal component of
    the tooth's own voxels. Which end of it is the crown is not guessed: the
    lower teeth bite upward and the upper teeth bite downward, and after the
    rotation above z is superior, so the sign is known from the FDI number.
    The labial direction is the part of "away from the middle of the arch"
    that is square to the arch itself."""
    center = points.mean(axis=0)
    _, _, basis = np.linalg.svd(points - center, full_matrices=False)
    up = basis[0] / np.linalg.norm(basis[0])
    crown_is_up = fdi >= 30           # quadrants 3 and 4 are the lower jaw
    if (up[2] > 0) != crown_is_up:
        up = -up

    flat = lambda v: v - up * float(v @ up)     # everything square to the axis
    unit = lambda v: v / np.linalg.norm(v)

    along = unit(flat(along))
    radial = flat(center - arch_center)
    out = radial - along * float(radial @ along)
    length = np.linalg.norm(out)
    assert length > 1e-6, f"FDI {fdi} has no direction out of its arch"
    out = out / length

    side = np.cross(up, out)          # right handed, as Open-Full-Jaw's is
    determinant = float(np.linalg.det(np.stack([side, up, out], axis=1)))
    assert abs(determinant - 1) < 1e-6, f"FDI {fdi} basis flips handedness"
    return {"center": center.tolist(), "side": side.tolist(),
            "up": up.tolist(), "out": out.tolist()}


# ---- Run -----------------------------------------------------------------

def main():
    path = os.path.join(LABELS, f"{CASE}.nii.gz")
    digest = hashlib.sha256(open(path, "rb").read()).hexdigest()
    data, pixdim = read_nifti(path)
    spacing = float(pixdim[0])
    assert np.allclose(pixdim, spacing), f"{CASE} is not isotropic"
    os.makedirs(OUT, exist_ok=True)

    voxel_mm3 = spacing ** 3
    present = [fdi for fdi in TEETH if (data == fdi).sum() >= 200]
    assert len(present) == 32, f"{CASE} has {len(present)} teeth, wanted 32"

    # The arch a tooth faces out of is its own jaw's, not both jaws together.
    def center_of(labels):
        points = np.argwhere(np.isin(data, labels)).astype(np.float64) * spacing
        return (points @ np.diag([-1.0, 1.0, -1.0]).T).mean(axis=0)

    arch = {"upper": center_of([f for f in TEETH if f < 30]),
            "lower": center_of([f for f in TEETH if f > 30])}
    centers = {fdi: center_of([fdi]) for fdi in present}

    parts = []

    def emit(name, group, pieces, extra):
        stl = f"{group}-{extra.get('fdi', extra.get('label'))}.stl"
        triangles = write_stl(os.path.join(OUT, stl), pieces)
        vertices = sum(len(v) for v, _ in pieces)
        parts.append({"file": stl, "name": name, "group": group,
                      "triangles": triangles, "vertices": vertices,
                      "shells": len(pieces), **extra})
        print(f"  {stl:<24}{name:<34}{triangles:>8} tris"
              f"{'' if len(pieces) == 1 else f'  {len(pieces)} shells'}")

    print(f"{CASE}: {data.shape} at {spacing} mm, sha256 {digest[:12]}")
    print("\nteeth")
    for fdi in present:
        mask = data == fdi
        biggest = keep_largest(mask)
        points = np.argwhere(biggest).astype(np.float64) * spacing
        points = points @ np.diag([-1.0, 1.0, -1.0]).T
        which = "upper" if fdi < 30 else "lower"
        emit(fdi_name(fdi), "tooth", [surface(biggest, spacing)],
             {"fdi": fdi, "label": fdi, "voxels": int(biggest.sum()),
              "mm3": round(biggest.sum() * voxel_mm3, 1),
              "axes": tooth_axes(points, fdi, arch[which],
                                 arch_tangent(centers, ARCH_ORDER[which], fdi)),
              "axesDerived": True})

    print("\npulp")
    for fdi in present:
        mask = data == (fdi + 100)
        pieces = pulp_pieces(mask, voxel_mm3)
        if not pieces:
            print(f"  FDI {fdi}: no pulp piece over {MIN_PIECE_MM3} mm3")
            continue
        emit(f"{fdi_name(fdi)}, pulp and canals", "pulp",
             [surface(piece, spacing) for piece in pieces],
             {"fdi": fdi, "label": fdi + 100, "voxels": int(mask.sum()),
              "mm3": round(mask.sum() * voxel_mm3, 1)})

    print("\nother")
    for label, (name, group) in OTHER.items():
        mask = data == label
        if mask.sum() < 200:
            print(f"  {name}: absent")
            continue
        biggest = keep_largest(mask)
        emit(name, group, [surface(biggest, spacing)],
             {"label": label, "voxels": int(biggest.sum()),
              "mm3": round(biggest.sum() * voxel_mm3, 1),
              "largestComponentFraction": round(float(biggest.sum() / mask.sum()), 5)})

    json.dump({
        "case": CASE,
        "sourceFile": f"labelsTr/{CASE}.nii.gz",
        "sourceSha256": digest,
        "shape": list(data.shape),
        "spacing": spacing,
        "generatedBy": "scripts/toothfairy-surfaces.py",
        "frame": "x toward the patient's left, y posterior, z superior, "
                 "millimeters, from a half turn of the voxel frame about y",
        "smoothing": {"gaussianSigmaVoxels": SIGMA, "taubin": list(TAUBIN),
                      "padVoxels": PAD},
        "parts": parts,
    }, open(os.path.join(OUT, "surfaces.json"), "w"), indent=1)
    print(f"\n{len(parts)} surfaces, "
          f"{sum(p['triangles'] for p in parts):,} triangles before decimation")


def keep_largest(mask):
    """The bone labels come with tens of sub cubic millimeter specks around
    them. 99.99 percent of the volume is one piece; the rest is noise."""
    labelled, count = ndimage.label(mask)
    if count <= 1:
        return mask
    sizes = np.bincount(labelled.ravel())
    sizes[0] = 0
    return labelled == sizes.argmax()


def pulp_pieces(mask, voxel_mm3):
    """A molar pulp is two to four pieces, because a canal narrower than the
    0.3 mm the scan samples at cannot stay connected. Keeping only the largest
    would throw away real canals, so every piece above the noise floor is
    kept and they are written as several shells of one surface."""
    labelled, count = ndimage.label(mask)
    if count == 0:
        return []
    sizes = np.bincount(labelled.ravel())
    sizes[0] = 0
    return [labelled == index for index in np.argsort(sizes)[::-1]
            if sizes[index] * voxel_mm3 >= MIN_PIECE_MM3]


if __name__ == "__main__":
    main()
