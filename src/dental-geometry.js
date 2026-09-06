import * as THREE from "three";
import { dentalProfile } from "./dental.js";

export const DENTITION_STAGES = {
  adult: {
    label: "Adult",
    count: 32,
    description: "Complete permanent dentition, including third molars.",
  },
  child: {
    label: "Child",
    count: 20,
    description: "Complete primary dentition; not a scaled adult skull.",
  },
  mixed: {
    label: "Mixed",
    count: 24,
    description:
      "Representative early mixed dentition: permanent incisors and first molars, primary canines and molars. Eruption varies.",
  },
};

export function getDentitionFDIs(stage) {
  if (!DENTITION_STAGES[stage]) throw new RangeError("Unknown dentition stage");
  return [1, 2, 3, 4].flatMap((q) =>
    stage === "mixed"
      ? [
          q * 10 + 1,
          q * 10 + 2,
          (q + 4) * 10 + 3,
          (q + 4) * 10 + 4,
          (q + 4) * 10 + 5,
          q * 10 + 6,
        ]
      : Array.from(
          { length: stage === "child" ? 5 : 8 },
          (_, i) => (q + (stage === "child" ? 4 : 0)) * 10 + i + 1,
        ),
  );
}

const colors = {
  enamel: 0xf7f2df,
  dentin: 0xe5b861,
  pulp: 0xd8495c,
  cementum: 0xc8a173,
  pdl: 0x93c4bf,
  bone: 0xd4bfa2,
  gingiva: 0xcf798c,
};
const order = {
  bone: 0,
  gingiva: 1,
  pdl: 2,
  cementum: 3,
  enamel: 4,
  dentin: 5,
  pulp: 6,
};

function roundedProfile(profile) {
  let points = profile.map(([y, r, x = 0]) => [y, r, x]);
  for (let pass = 0; pass < 3; pass++) {
    const next = [points[0]];
    for (let i = 0; i < points.length - 1; i++) {
      for (const t of [0.25, 0.75])
        next.push(
          points[i].map(
            (value, axis) => value * (1 - t) + points[i + 1][axis] * t,
          ),
        );
    }
    next.push(points.at(-1));
    points = next;
  }
  return points;
}

// Ring profiles are schematic millimeter proportions, not patient measurements.
function surface(profile, depth = 1) {
  const vertices = [],
    indices = [],
    segments = 32;
  for (const [y, radius, x = 0] of profile) {
    for (let j = 0; j <= segments; j++) {
      const angle = (j / segments) * Math.PI * 2;
      vertices.push(
        (x + radius * Math.cos(angle)) / 1000,
        y / 1000,
        (radius * depth * Math.sin(angle)) / 1000,
      );
    }
  }
  for (let i = 0; i < profile.length - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j,
        b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function sectionGeometry(profile, depth, amount) {
  const left = [],
    right = [],
    z = amount * 1000;
  // Densify rings so the section also follows a plane moved off the midline.
  for (let i = 0; i < profile.length - 1; i++) {
    for (let j = 0; j < 8; j++) {
      const t = j / 8,
        a = profile[i],
        b = profile[i + 1];
      const y = a[0] + (b[0] - a[0]) * t,
        r = a[1] + (b[1] - a[1]) * t;
      const x = (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * t;
      if (Math.abs(z) > r * depth) continue;
      const width = Math.sqrt(Math.max(0, r * r - (z / depth) ** 2));
      left.push(new THREE.Vector2((x - width) / 1000, y / 1000));
      right.push(new THREE.Vector2((x + width) / 1000, y / 1000));
    }
  }
  if (left.length < 2) return new THREE.BufferGeometry();
  return new THREE.ShapeGeometry(
    new THREE.Shape([...left, ...right.reverse()]),
  );
}

export function createToothModel(fdi) {
  const tooth = dentalProfile(fdi);
  if (!tooth) throw new RangeError("Invalid FDI tooth number");
  const { primary, position, upper } = tooth;
  const molar = position >= (primary ? 4 : 6);
  const rootCount = molar
    ? upper
      ? 3
      : 2
    : !primary && upper && position === 4
      ? 2
      : 1;
  const canalCount = molar ? 3 : rootCount;
  const size = primary ? 0.76 : 1,
    width = (molar ? 5 : position > 3 ? 3.8 : 3.4) * size;
  const height = (position === 3 ? 10 : 8) * size,
    length = (position === 3 ? 16 : 14) * size;
  const group = new THREE.Group();
  group.name = tooth.fullName;
  group.userData = {
    fdi,
    schematic: true,
    primary,
    rootCount,
    canalCount,
    description:
      "Representative educational geometry. Roots are spread in the section plane for inspection; canal variations, microscopic fibers and patient-specific dimensions are not modeled.",
    sectionPlane: new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
    sectionEnabled: false,
  };
  const add = (tissue, profile, depth = 0.85) => {
    profile = roundedProfile(profile);
    const material = new THREE.MeshStandardMaterial({
      color: colors[tissue],
      roughness: 0.55,
      side: THREE.DoubleSide,
      transparent: tissue === "bone" || tissue === "gingiva",
      opacity: tissue === "bone" ? 0.18 : tissue === "gingiva" ? 0.7 : 1,
    });
    const mesh = new THREE.Mesh(surface(profile, depth), material);
    mesh.name = tissue;
    mesh.userData = { tissue, fdi, profile, depth };
    mesh.onBeforeRender = () => {
      group.userData.sectionPlane
        .set(new THREE.Vector3(0, 0, -1), group.userData.sectionAmount || 0)
        .applyMatrix4(group.matrixWorld);
    };
    const capRank = order[tissue] * 100 + group.children.length;
    const cap = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({
        color: colors[tissue],
        roughness: 0.8,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -(capRank + 1) / 50,
      }),
    );
    cap.name = `${tissue} section`;
    cap.userData = { tissue, fdi, sectionCap: true };
    cap.visible = false;
    cap.renderOrder = capRank;
    mesh.add(cap);
    group.add(mesh);
  };
  add(
    "bone",
    [
      [-length - 1, 0],
      [-length - 0.8, width * 1.5],
      [-3 * size, width * 1.5],
      [-2.4 * size, 0],
    ],
    0.9,
  );
  add(
    "gingiva",
    [
      [-3.5 * size, 0],
      [-3.2 * size, width * 1.56],
      [0, width * 1.3],
      [1 * size, width * 0.9],
      [1.1 * size, 0],
    ],
    0.9,
  );
  const crown = (scale) => [
    [0, 0],
    [0.1 * size, width * 0.75 * scale],
    [height * 0.25, width * scale],
    [height * 0.6 * scale, width * 0.99 * scale],
    [height * 0.78 * scale, width * (position < 3 ? 0.98 : 0.9) * scale],
    [
      height * (position > 3 ? 0.9 : 1) * scale,
      width * (position === 3 ? 0 : position < 3 ? 0.8 : 0.68) * scale,
    ],
    [height * (position > 3 ? 0.91 : 1.01) * scale, 0],
  ];
  add("enamel", crown(1), position < 3 ? 0.56 : 0.88);
  add("dentin", crown(primary ? 0.89 : 0.82), position < 3 ? 0.56 : 0.88);
  add(
    "dentin",
    [
      [-3 * size, 0],
      [-2.5 * size, width * 0.72],
      [-0.4 * size, width * 0.76],
      [size, width * 0.7],
      [2 * size, 0],
    ],
    position < 3 ? 0.56 : 0.88,
  );
  add(
    "pulp",
    [
      [-2 * size, 0],
      [-1.5 * size, width * 0.36],
      [height * 0.45, width * (primary ? 0.49 : 0.31)],
      [height * 0.68, 0],
    ],
    0.56,
  );
  if (position > 3) {
    for (const side of [-1, 1]) {
      for (const [tissue, scale] of [
        ["enamel", 1],
        ["dentin", primary ? 0.89 : 0.82],
      ]) {
        const x = side * width * 0.49 * scale;
        add(
          tissue,
          [
            [height * 0.65 * scale, 0, x],
            [height * 0.78 * scale, width * 0.4 * scale, x],
            [height * 0.95 * scale, width * 0.36 * scale, x],
            [height * 1.09 * scale, 0, x],
          ],
          0.95,
        );
      }
      const x = side * width * 0.24;
      add(
        "pulp",
        [
          [height * 0.27, 0, x],
          [height * 0.42, width * 0.16, x],
          [height * (primary ? 0.78 : 0.67), 0, x],
        ],
        0.7,
      );
    }
  }
  for (let r = 0; r < rootCount; r++) {
    const offset =
      rootCount === 1 ? 0 : (r / (rootCount - 1) - 0.5) * width * 1.05;
    const apex = offset * (primary ? 1.9 : 1.45),
      radius = (rootCount === 1 ? 2.25 : 1.3) * size;
    const root = (thickness) => [
      [-length, 0, apex],
      [-length * 0.92, radius * 0.26 * thickness, apex],
      [-length * 0.48, radius * 0.8 * thickness, offset * 1.25],
      [-0.15 * size, radius * thickness, offset],
      [0, 0, offset],
    ];
    add("pdl", root(1.24));
    add("cementum", root(1.12));
    add("dentin", root(1));
    const canals = !upper && molar && r === 0 ? 2 : 1;
    for (let c = 0; c < canals; c++) {
      const shift = canals === 2 ? (c - 0.5) * radius * 0.65 : 0;
      add(
        "pulp",
        [
          [-length, 0.07 * size, apex + shift * 0.3],
          [-length * 0.5, 0.2 * size, offset * 1.25 + shift],
          [-1.8 * size, 0.36 * size, offset + shift],
          [-0.1 * size, 0.4 * size, offset * 0.55 + shift * 0.4],
          [0.8 * size, 0.38 * size, offset * 0.25 + shift * 0.2],
          [1.4 * size, 0, offset * 0.15],
        ],
        0.8,
      );
    }
  }
  return group;
}

export function setToothSection(group, enabled, amount = 0) {
  if (!Number.isFinite(amount))
    throw new RangeError("Section offset must be finite");
  group.userData.sectionEnabled = Boolean(enabled);
  group.userData.sectionAmount = amount;
  group.updateWorldMatrix(true, true);
  group.userData.sectionPlane
    .set(new THREE.Vector3(0, 0, -1), amount)
    .applyMatrix4(group.matrixWorld);
  for (const mesh of group.children) {
    mesh.material.clippingPlanes = enabled ? [group.userData.sectionPlane] : [];
    mesh.material.needsUpdate = true;
    const cap = mesh.children[0];
    cap.visible = Boolean(enabled);
    cap.geometry.dispose();
    cap.geometry = enabled
      ? sectionGeometry(mesh.userData.profile, mesh.userData.depth, amount)
      : new THREE.BufferGeometry();
    cap.position.z = amount + 0.00001 + cap.renderOrder * 0.0000001;
  }
}

export function createDentitionModel(stage) {
  const fdis = getDentitionFDIs(stage),
    group = new THREE.Group();
  group.name = `${stage} schematic dental arches`;
  group.userData = {
    stage,
    schematic: true,
    toothCount: fdis.length,
    description: DENTITION_STAGES[stage].description,
  };
  const perSide = fdis.length / 4,
    radius = stage === "child" ? 0.021 : stage === "mixed" ? 0.027 : 0.034;
  fdis.forEach((fdi, index) => {
    const tooth = dentalProfile(fdi),
      model = createToothModel(fdi);
    const angle = (((index % perSide) + 0.5) / perSide) * Math.PI * 0.58;
    model.position.set(
      (tooth.right ? -1 : 1) * radius * Math.sin(angle),
      tooth.upper ? 0.012 : -0.012,
      radius * 1.3 * Math.cos(angle),
    );
    model.rotation.y = (tooth.right ? -1 : 1) * angle;
    if (tooth.upper) model.rotation.z = Math.PI;
    for (const mesh of model.children)
      if (["bone", "pdl", "cementum", "pulp"].includes(mesh.userData.tissue))
        mesh.visible = false;
    group.add(model);
  });
  return group;
}
