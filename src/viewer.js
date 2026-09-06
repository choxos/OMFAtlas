import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { groups, toothNumber } from "./content.js";
import { createExplosionLayout, tissueSeparation } from "./explosion-layout.js";
import {
  createToothModel,
  createDentitionModel,
  setToothSection,
} from "./dental-geometry.js";

export async function createViewer(
  host,
  atlas,
  onSelect,
  onReady,
  onDetail,
  onToothSelect,
  onExitDetail,
  onExplode = () => {},
) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.001, 10);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;
  host.append(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "Interactive 3D anatomy. Drag to rotate, scroll to zoom. Use the structure list and view buttons for keyboard access.",
  );
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.zoomToCursor = true;
  controls.minDistance = 0.008;
  controls.maxDistance = 1.2;
  const ambient = new THREE.HemisphereLight(0xffffff, 0x7c8694, 1.8);
  scene.add(ambient);
  const light = new THREE.DirectionalLight(0xfff7e7, 2.1);
  light.position.set(-1, 2, 3);
  scene.add(light);
  const fill = new THREE.DirectionalLight(0xc7e4ff, 1.1);
  fill.position.set(2, 0, -1);
  scene.add(fill);
  const buffers = new Map(await Promise.all(
    [...new Set(atlas.parts.map((part) => part.bufferUrl || "/models/omf.bin"))].map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`The anatomy geometry could not be loaded: ${url} (HTTP ${response.status}).`);
      return [url, await response.arrayBuffer()];
    }),
  ));
  function geometryFrom(part, buffer) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array(buffer, part.positions, part.vertexCount * 3),
        3,
      ),
    );
    geometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(
        new Int16Array(buffer, part.normals, part.vertexCount * 3),
        3,
        true,
      ),
    );
    geometry.setIndex(
      new THREE.BufferAttribute(
        new Uint32Array(buffer, part.indices, part.indexCount),
        1,
      ),
    );
    geometry.computeBoundingBox();
    return geometry;
  }
  const meshes = atlas.parts.map((part) => {
    const geometry = geometryFrom(part, buffers.get(part.bufferUrl || "/models/omf.bin"));
    const material = new THREE.MeshStandardMaterial({
      color: groups[part.group].color,
      roughness: 0.64,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.part = part;
    scene.add(mesh);
    return mesh;
  });
  const target = new THREE.Vector3(0, 1.57, 0.005);
  let currentState;
  let dentalModel = null,
    dentalKey = "",
    sectionKey = "",
    detailPending = false;
  let highResolution = new Map();
  const loadingDetail = new Set();
  function resolutionStatus(text) {
    host.dataset.resolution = text;
    const label = document.querySelector("#resolution-status");
    if (label) label.textContent = text;
  }
  async function upgradeSelected() {
    if (
      !currentState ||
      currentState.toothDetail ||
      currentState.arches ||
      currentState.age !== "adult"
    )
      return;
    const id = currentState.selected,
      mesh = meshes.find((m) => m.userData.part.id === id),
      part = highResolution.get(id);
    if (!mesh) return;
    if (mesh.userData.highResolution) {
      resolutionStatus(
        `Original detail · ${(mesh.geometry.index.count / 3).toLocaleString()} triangles`,
      );
      return;
    }
    if (!part) {
      resolutionStatus("Optimized assembly detail");
      return;
    }
    if (loadingDetail.has(id)) return;
    loadingDetail.add(id);
    resolutionStatus("Loading original surface detail…");
    try {
      const response = await fetch(part.url);
      if (!response.ok) throw new Error("Mesh download failed");
      const detailBuffer = await response.arrayBuffer();
      const geometry = geometryFrom(part, detailBuffer);
      mesh.geometry.dispose();
      mesh.geometry = geometry;
      layoutKey = "";
      mesh.userData.highResolution = true;
      if (currentState.selected === id)
        resolutionStatus(
          `Original detail · ${(part.indexCount / 3).toLocaleString()} triangles`,
        );
      applyExplosion();
    } catch {
      if (currentState.selected === id)
        resolutionStatus(
          "Original detail unavailable; optimized mesh retained",
        );
    } finally {
      loadingDetail.delete(id);
    }
  }
  fetch("/models/high-resolution/atlas.json")
    .then((r) => {
      if (!r.ok) throw new Error("No original detail catalogue");
      return r.json();
    })
    .then((data) => {
      highResolution = new Map(data.parts.map((p) => [p.id, p]));
      upgradeSelected();
    })
    .catch(() => resolutionStatus("Optimized assembly detail"));
  function disposeModel(model) {
    model.traverse((m) => {
      if (m.isMesh) {
        m.geometry.dispose();
        m.material.dispose();
      }
    });
    scene.remove(model);
  }
  let previousDistance = null,
    detailExitDistance = Infinity,
    framing = false;
  let explosion = 0, appliedExplosion = 0, overviewDistance = 0.55, layoutKey = "", layout;
  let normalArmed = false, normalStopUntil = 0, applyingZoom = false;
  const canExplode = () => currentState && !dentalModel && !currentState.isolated && currentState.mode === "3d";
  function stopAtNormal(gesture, deadline = performance.now() + 300) {
    view(currentDirection);
    normalArmed = true;
    normalStopUntil = gesture ? deadline : 0;
    host.dataset.normalStop = "true";
  }
  function progressZoom(factor, gesture, distance = camera.position.distanceTo(controls.target)) {
    if (!canExplode()) return false;
    if (gesture && performance.now() < normalStopUntil) {
      stopAtNormal(true, normalStopUntil);
      return true;
    }
    if (explosion > 0) {
      const next = explosion + Math.log(factor) * (factor > 1 ? 45 : 150);
      setExplosion(next);
      if (next <= 0) stopAtNormal(gesture);
      return true;
    }
    if (factor > 1 && distance * factor >= overviewDistance - 0.000001) {
      if (!normalArmed || distance < overviewDistance - 0.000001) stopAtNormal(gesture);
      else {
        normalArmed = false;
        host.dataset.normalStop = "false";
        setExplosion(Math.log(factor) * 45);
      }
      return true;
    }
    normalArmed = false;
    host.dataset.normalStop = "false";
    return false;
  }
  function setExplosion(value) {
    onExplode(THREE.MathUtils.clamp(value, 0, 100));
  }
  function applyExplosion() {
    const visible = meshes.filter((mesh) => mesh.visible);
    const key = visible.map((mesh) => mesh.userData.part.id).join(",") + camera.aspect;
    const changed = key !== layoutKey || appliedExplosion !== explosion;
    if (key !== layoutKey) {
      layout = createExplosionLayout(visible.map((mesh) => ({
        id: mesh.userData.part.id,
        group: mesh.userData.part.group,
        bounds: [mesh.geometry.boundingBox.min.toArray(), mesh.geometry.boundingBox.max.toArray()],
      })), camera.aspect);
      layoutKey = key;
    }
    const amount = canExplode() ? explosion / 100 : 0;
    appliedExplosion = explosion;
    for (const mesh of meshes) {
      const center = mesh.geometry.boundingBox.getCenter(new THREE.Vector3());
      const separated = new THREE.Vector3(...tissueSeparation(mesh.userData.part));
      const cell = layout.cells.get(mesh.userData.part.id);
      if (amount <= 0.45 || !cell) mesh.position.copy(separated).multiplyScalar(amount / 0.45);
      else mesh.position.copy(separated).lerp(new THREE.Vector3(cell.x - center.x, cell.y + target.y - center.y, -center.z), (amount - 0.45) / 0.55);
    }
    controls.enableRotate = amount < 0.8;
    controls.mouseButtons.LEFT = amount < 0.8 ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
    controls.touches.ONE = amount < 0.8 ? THREE.TOUCH.ROTATE : THREE.TOUCH.PAN;
    controls.zoomToCursor = amount === 0;
    host.dataset.explode = String(explosion);
    host.dataset.zoomStage = amount === 0 ? "assembled" : amount >= 0.95 ? "inventory" : "separating";
    if (amount > 0 && changed) view(amount > 0.45 ? "anterior" : currentDirection, true);
    else render();
  }
  function render() {
    renderer.render(scene, camera);
    const distance = camera.position.distanceTo(controls.target);
    const zoomingIn =
      previousDistance !== null && distance < previousDistance - 0.000001;
    const zoomingOut =
      previousDistance !== null && distance > previousDistance + 0.000001;
    const distanceBefore = previousDistance;
    previousDistance = distance;
    if (!framing && !applyingZoom && (zoomingIn || zoomingOut) &&
      progressZoom(distance / distanceBefore, true, distanceBefore)) return;
    if (
      !framing &&
      !detailPending &&
      currentState?.toothDetail &&
      zoomingOut &&
      distance > detailExitDistance
    ) {
      detailPending = true;
      queueMicrotask(() => {
        onExitDetail();
        detailPending = false;
      });
      return;
    }
    if (
      !framing &&
      zoomingIn &&
      currentState?.autoDetail &&
      !currentState.toothDetail &&
      explosion === 0 &&
      currentState.mode === "3d" &&
      !detailPending
    ) {
      const part = meshes.find(
        (m) => m.userData.part.id === currentState.selected,
      );
      const tooth = dentalModel
        ? dentalModel.children.find((m) => m.userData.fdi === currentState.fdi)
        : part;
      const fdi = dentalModel
        ? currentState.fdi
        : part && toothNumber(part.userData.part.name);
      if (
        fdi &&
        tooth?.visible &&
        camera.position.distanceTo(
          new THREE.Box3().setFromObject(tooth).getCenter(new THREE.Vector3()),
        ) < 0.055
      ) {
        detailPending = true;
        queueMicrotask(() => {
          onDetail(fdi);
          detailPending = false;
        });
      }
    }
  }
  let currentDirection = "oblique";
  function view(direction = "oblique", fit = false) {
    framing = true;
    normalArmed = false;
    normalStopUntil = 0;
    host.dataset.normalStop = "false";
    currentDirection = direction;
    let center = target.clone(),
      size = 0.3;
    if (fit && currentState) {
      const box = new THREE.Box3();
      if (dentalModel?.visible) box.expandByObject(dentalModel);
      else
        meshes.filter((m) => m.visible).forEach((m) => box.expandByObject(m));
      if (!box.isEmpty()) {
        center = box.getCenter(new THREE.Vector3());
        size = box.getSize(new THREE.Vector3()).length();
      }
    }
    let distance = Math.max(
      0.04,
      (size * (currentState?.toothDetail ? 1.5 : 1.7)) /
        Math.min(camera.aspect, 1),
    );
    if (explosion > 0 && canExplode()) {
      const box = new THREE.Box3();
      meshes.filter((mesh) => mesh.visible).forEach((mesh) => box.expandByObject(mesh));
      if (!box.isEmpty()) {
        center = box.getCenter(new THREE.Vector3());
        const extent = box.getSize(new THREE.Vector3());
        distance = Math.max(extent.y, extent.x / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.25 + extent.z / 2;
        distance = Math.max(distance, overviewDistance);
      }
      if (explosion > 45) direction = "anterior";
    } else if (!dentalModel && !currentState?.isolated) overviewDistance = distance;
    controls.maxDistance = Math.max(1.2, distance * 2);
    camera.far = Math.max(dentalModel ? 1 : 10, distance * 4);
    camera.updateProjectionMatrix();
    if (currentState?.toothDetail) detailExitDistance = distance * 1.65;
    const vectors = {
      anterior: [0, 0, 1],
      lateral: [1, 0, 0],
      inferior: [0, -1, 0.01],
      oblique: [0.65, 0.12, 1],
    };
    controls.target.copy(center);
    camera.up.set(0, 1, 0);
    camera.position
      .copy(center)
      .add(
        new THREE.Vector3(...vectors[direction])
          .normalize()
          .multiplyScalar(distance),
      );
    controls.update();
    render();
    framing = false;
  }
  const resize = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    if (explosion > 0) applyExplosion();
    else if (dentalModel) view(currentDirection, true);
    else render();
  });
  resize.observe(host);
  controls.addEventListener("change", render);
  let down = null;
  renderer.domElement.addEventListener("pointerdown", (e) => {
    down = e.isPrimary ? { x: e.clientX, y: e.clientY } : null;
  });
  renderer.domElement.addEventListener("pointercancel", () => {
    down = null;
  });
  renderer.domElement.addEventListener("pointermove", (e) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) down = null;
  });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    down = null;
    const rect = renderer.domElement.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    const hits = ray
      .intersectObjects(
        dentalModel?.visible ? [dentalModel] : meshes.filter((m) => m.visible),
        true,
      )
      .filter((hit) => {
        let m = hit.object;
        while (m) {
          if (!m.visible) return false;
          m = m.parent;
        }
        return true;
      });
    if (!hits.length && explosion > 45 && !dentalModel) {
      const projected = new THREE.Vector3();
      let nearest = e.pointerType === "touch" ? 24 : 16, picked;
      for (const mesh of meshes.filter((mesh) => mesh.visible)) {
        mesh.geometry.boundingBox.getCenter(projected).add(mesh.position).project(camera);
        const distance = Math.hypot((projected.x + 1) * rect.width / 2 - (e.clientX - rect.left), (1 - projected.y) * rect.height / 2 - (e.clientY - rect.top));
        if (projected.z >= -1 && projected.z <= 1 && distance < nearest) { nearest = distance; picked = mesh; }
      }
      if (picked) hits.push({ object: picked });
    }
    if (hits.length) {
      const data = hits[0].object.userData;
      if (data.part) onSelect(data.part.id);
      else if (data.fdi && !currentState.toothDetail) onToothSelect(data.fdi);
    } else if(!currentState.toothDetail) onSelect(null);
  });
  const api = {
    update(state) {
      const previousExplosion = explosion;
      currentState = state;
      explosion = Number.isFinite(state.explode) ? THREE.MathUtils.clamp(state.explode, 0, 100) : 0;
      const key = state.toothDetail
        ? `tooth-${state.fdi}`
        : state.arches || state.age !== "adult"
          ? state.age
          : "";
      if (key !== dentalKey) {
        detailExitDistance = Infinity;
        if (dentalModel) disposeModel(dentalModel);
        dentalModel = key
          ? state.toothDetail
            ? createToothModel(state.fdi)
            : createDentitionModel(state.age)
          : null;
        dentalKey = key;
        sectionKey = "";
        if (dentalModel) scene.add(dentalModel);
        camera.far = dentalModel ? 1 : 10;
        camera.updateProjectionMatrix();
      }
      if (dentalModel) resolutionStatus("Schematic teaching geometry");
      else upgradeSelected();
      if (dentalModel && state.toothDetail) {
        const nextSection = `${state.cutaway}-${state.sectionDepth}`;
        if (nextSection !== sectionKey) {
          setToothSection(dentalModel, state.cutaway, state.sectionDepth);
          sectionKey = nextSection;
        }
        dentalModel.children.forEach(
          (m) => (m.visible = !state.hiddenTissues.has(m.userData.tissue)),
        );
      }
      for (const mesh of meshes) {
        const part = mesh.userData.part;
        mesh.visible =
          !dentalModel &&
          (state.isolated
            ? part.id === state.selected
            : state.layers.has(part.group));
        const selected = part.id === state.selected;
        mesh.material.color.set(
          selected ? "#54aab9" : groups[part.group].color,
        );
        mesh.material.emissive.set(selected ? "#12383e" : "#000000");
        mesh.material.transparent =
          part.group === "bones" && state.opacity < 1 && !selected;
        mesh.material.opacity = mesh.material.transparent ? state.opacity : 1;
        mesh.material.depthWrite = !mesh.material.transparent;
      }
      applyExplosion();
      if (previousExplosion > 0 && explosion === 0) view(currentDirection);
    },
    view,
    zoom(factor, gesture = false) {
      if (progressZoom(factor, gesture)) return;
      const selectedTooth =
        !currentState.toothDetail &&
        !dentalModel &&
        meshes.find(
          (m) =>
            m.userData.part.id === currentState.selected &&
            toothNumber(m.userData.part.name) &&
            m.visible,
        );
      if (factor < 1 && selectedTooth) {
        const center = new THREE.Box3()
          .setFromObject(selectedTooth)
          .getCenter(new THREE.Vector3());
        camera.position.lerp(center, 1 - factor);
        controls.target.lerp(center, 1 - factor);
      } else
        camera.position
          .sub(controls.target)
          .multiplyScalar(factor)
          .add(controls.target);
      applyingZoom = true;
      controls.update();
      render();
      applyingZoom = false;
    },
    dispose() {
      renderer.domElement.removeEventListener("wheel", wheel, true);
      resize.disconnect();
      controls.dispose();
      meshes.forEach((m) => {
        m.geometry.dispose();
        m.material.dispose();
      });
      if (dentalModel) disposeModel(dentalModel);
      renderer.dispose();
    },
  };
  function wheel(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? host.clientHeight : 1);
    api.zoom(Math.exp(THREE.MathUtils.clamp(pixels, -120, 120) * 0.002), true);
  }
  renderer.domElement.addEventListener("wheel", wheel, { capture: true, passive: false });
  camera.aspect = host.clientWidth / host.clientHeight;
  camera.updateProjectionMatrix();
  view();
  onReady();
  return api;
}
