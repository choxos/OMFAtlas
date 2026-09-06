import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { groups, toothNumber } from "./content.js";
import { createExplosionLayout, tissueSeparation } from "./explosion-layout.js";
import { createSchematicParts, deriveLandmarks } from "./schematic-anatomy.js";
import {
  createToothModel,
  createDentitionModel,
  setToothSection,
} from "./dental-geometry.js";

export async function createViewer(host, atlas, handlers) {
  const {
    onSelect,
    onReady,
    onDetail,
    onToothSelect,
    onExitDetail,
    onExplode = () => {},
    onPartsChanged = () => {},
    onHover = () => {},
    onProgress = () => {},
  } = handlers;
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
  const BASE_BUFFER = "/models/omf.bin";
  async function loadBuffer(url, report) {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(
        `The anatomy geometry could not be loaded: ${url} (HTTP ${response.status}).`,
      );
    const total = Number(response.headers.get("content-length")) || 0;
    // Without a length header, or without a readable stream, fall back to the
    // whole buffer at once rather than reporting a progress bar that lies.
    if (!report || !total || !response.body) return response.arrayBuffer();
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      report(Math.min(99, Math.round((received / total) * 100)));
    }
    const buffer = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    report(100);
    return buffer.buffer;
  }
  // Only the base assembly is awaited. The registered facial muscles are
  // another 15.6 MB and the first frame does not need them, so they arrive
  // afterwards and their meshes join the scene when they do.
  const buffers = new Map([[BASE_BUFFER, await loadBuffer(BASE_BUFFER, onProgress)]]);
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
  const meshes = [];
  function addMesh(part, geometry) {
    const material = new THREE.MeshStandardMaterial({
      color: groups[part.group].color,
      // Schematic structures get a flatter, slightly self-lit surface so they
      // never read as scanned tissue next to the source meshes.
      roughness: part.schematic ? 0.9 : 0.64,
      emissive: part.schematic ? groups[part.group].color : 0x000000,
      emissiveIntensity: part.schematic ? 0.16 : 0,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.part = part;
    scene.add(mesh);
    meshes.push(mesh);
    return mesh;
  }
  for (const part of atlas.parts)
    if ((part.bufferUrl || BASE_BUFFER) === BASE_BUFFER)
      addMesh(part, geometryFrom(part, buffers.get(BASE_BUFFER)));

  // The source dataset stops short of most oral and maxillofacial
  // neurovascular anatomy, so those structures are built from this assembly's
  // own landmarks. See src/schematic-anatomy.js for what that means.
  const baseVertices = (part) => {
    const values = new Float32Array(
      buffers.get(BASE_BUFFER),
      part.positions,
      part.vertexCount * 3,
    );
    const out = [];
    for (let i = 0; i < values.length; i += 3)
      out.push([values[i], values[i + 1], values[i + 2]]);
    return out;
  };
  const landmarks = deriveLandmarks(atlas.parts, baseVertices);
  for (const built of createSchematicParts(atlas.parts, baseVertices)) {
    const { geometry, ...part } = built;
    atlas.parts.push(part);
    addMesh(part, geometry);
  }
  const labelTexture = (text) => {
    const scale = 3;
    const pad = 9 * scale;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const font = `${12 * scale}px "Inter", system-ui, sans-serif`;
    context.font = font;
    canvas.width = Math.ceil(context.measureText(text).width) + pad * 2;
    canvas.height = 24 * scale + pad;
    const draw = canvas.getContext("2d");
    draw.font = font;
    draw.fillStyle = "rgba(255,255,255,0.94)";
    draw.strokeStyle = "rgba(23,36,47,0.22)";
    draw.lineWidth = scale;
    const radius = 7 * scale;
    const w = canvas.width - scale,
      h = canvas.height - scale;
    draw.beginPath();
    draw.roundRect(scale / 2, scale / 2, w, h, radius);
    draw.fill();
    draw.stroke();
    draw.fillStyle = "#17242f";
    draw.textBaseline = "middle";
    draw.fillText(text, pad, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    return { texture, ratio: canvas.width / canvas.height };
  };

  const pin = new THREE.Group();
  pin.visible = false;
  const beadMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.0016, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0x1d6d7b }),
  );
  const haloMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.0031, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0x54aab9, transparent: true, opacity: 0.32 }),
  );
  const pinLabel = new THREE.Sprite(
    new THREE.SpriteMaterial({ transparent: true, depthTest: false }),
  );
  pinLabel.position.set(0, 0.0072, 0);
  pin.add(beadMesh, haloMesh, pinLabel);
  scene.add(pin);
  let pinnedLandmark = null;

  function sizePin() {
    if (!pin.visible) return;
    const distance = camera.position.distanceTo(pin.position);
    const perPixel =
      (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance) /
      Math.max(1, renderer.domElement.clientHeight);
    const labelHeight = perPixel * 21;
    pinLabel.scale.set(labelHeight * (pinLabel.userData.ratio || 4), labelHeight, 1);
    pinLabel.position.set(0, labelHeight * 1.5, 0);
    const bead = perPixel * 3.4;
    beadMesh.scale.setScalar(bead / 0.0016);
    haloMesh.scale.setScalar(bead / 0.0016);
  }

  function showLandmark(id) {
    const found = landmarks.find((l) => l.id === id) || null;
    pinnedLandmark = found;
    pin.visible = Boolean(found);
    if (!found) return;
    pin.position.fromArray(found.position);
    const { texture, ratio } = labelTexture(found.name);
    pinLabel.material.map?.dispose();
    pinLabel.material.map = texture;
    pinLabel.material.needsUpdate = true;
    pinLabel.userData.ratio = ratio;
  }

  // Look at the jaws, not the middle of the cranium. This is a dental atlas,
  // and it also lifts the mandible clear of the dock along the bottom edge.
  const target = new THREE.Vector3(0, 1.543, 0.005);
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
  /** The modeled tooth in one jaw whose centre is closest to the orbit target. */
  function nearestTooth(upper) {
    let best = null;
    let bestDistance = Infinity;
    const centre = new THREE.Vector3();
    for (const mesh of meshes) {
      const fdi = toothNumber(mesh.userData.part.name);
      if (!fdi || fdi < 30 !== upper) continue;
      mesh.geometry.boundingBox.getCenter(centre);
      const distance = centre.distanceTo(controls.target);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = fdi;
      }
    }
    return best;
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
    sizePin();
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
      // Zooming into the gums opens the same cutaway as zooming into a tooth,
      // framed on the periodontium instead of the crown. The tooth it opens on
      // is the one nearest whatever the camera is already looking at, so
      // zooming into the front of the mouth gives an incisor.
      const gingivaJaw = part && /^Gingiva of (upper|lower) jaw$/.exec(part.userData.part.name)?.[1];
      const target = dentalModel
        ? dentalModel.children.find((m) => m.userData.fdi === currentState.fdi)
        : part;
      const fdi = dentalModel
        ? currentState.fdi
        : gingivaJaw
          ? nearestTooth(gingivaJaw === "upper")
          : part && toothNumber(part.userData.part.name);
      if (
        fdi &&
        target?.visible &&
        camera.position.distanceTo(
          new THREE.Box3().setFromObject(target).getCenter(new THREE.Vector3()),
        ) < 0.055
      ) {
        detailPending = true;
        queueMicrotask(() => {
          onDetail(fdi, { periodontium: Boolean(gingivaJaw) });
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
    // The tooth model is built with its cervical line at the origin, so
    // framing the periodontium means framing a short band around y = 0.
    if (fit && currentState?.toothDetail && currentState.perioFocus && dentalModel?.visible) {
      controls.target.set(0, 0, 0);
      camera.up.set(0, 1, 0);
      camera.position
        .set(0, 0, 0)
        .add(new THREE.Vector3(0.55, 0.16, 1).normalize().multiplyScalar(0.032));
      camera.far = 1;
      camera.updateProjectionMatrix();
      controls.update();
      detailExitDistance = 0.032 * 1.65;
      render();
      framing = false;
      return;
    }
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
    // The scene fills the window rather than sitting in a grid cell, so the
    // multiplier is larger than it used to be. Dividing by the aspect pulls
    // the camera back far enough to fit the width, but on a phone in portrait
    // that ratio is about 0.46 and the head ends up tiny in a tall window
    // whose lower quarter is covered by the dock anyway. The divisor has a
    // floor, which leaves wide windows untouched and stops the portrait case
    // from over-compensating.
    let distance = Math.max(
      0.04,
      (size * (currentState?.toothDetail ? 1.5 : 2.2)) /
        Math.max(0.62, Math.min(camera.aspect, 1)),
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
  // A tap is a single pointer that went down and came up without travelling
  // and without a second pointer joining it. Tracking only one pointer let the
  // end of a pinch count as a tap and select whatever sat under the finger.
  const taps = new Map();
  let multiTouch = false;
  const tapThreshold = (event) => (event.pointerType === "touch" ? 12 : 5);
  let down = null;
  renderer.domElement.addEventListener("pointerdown", (e) => {
    if (taps.size === 0) multiTouch = false;
    taps.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (taps.size > 1) multiTouch = true;
    down = taps.size === 1 ? { x: e.clientX, y: e.clientY } : null;
  });
  renderer.domElement.addEventListener("pointercancel", (e) => {
    taps.delete(e.pointerId);
    multiTouch = true;
    down = null;
  });
  // Naming the structure under the cursor is the fastest way to read an
  // unfamiliar assembly, so the pointer picks continuously. The pick is
  // throttled to one animation frame and skipped while dragging.
  const pointer = new THREE.Vector2();
  const hoverRay = new THREE.Raycaster();
  let hoverQueued = false;
  let hoverId = null;
  function pickAt(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    hoverRay.setFromCamera(
      pointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        (-(clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    return hoverRay.intersectObjects(
      dentalModel?.visible ? [dentalModel] : meshes.filter((m) => m.visible),
      true,
    )[0];
  }
  renderer.domElement.addEventListener("pointermove", (e) => {
    const start = taps.get(e.pointerId);
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > tapThreshold(e))
      multiTouch = true;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > tapThreshold(e))
      down = null;
    if (e.pointerType === "touch" || hoverQueued) return;
    hoverQueued = true;
    requestAnimationFrame(() => {
      hoverQueued = false;
      const hit = pickAt(e.clientX, e.clientY);
      const data = hit?.object.userData;
      const part = data?.part;
      const id = part ? part.id : data?.tissue ? `tissue:${data.tissue}` : null;
      if (id === hoverId) return;
      hoverId = id;
      onHover(part || null, { x: e.clientX, y: e.clientY });
    });
  });
  renderer.domElement.addEventListener("pointerleave", () => {
    hoverId = null;
    onHover(null);
  });
  renderer.domElement.addEventListener("pointerup", (e) => {
    const start = taps.get(e.pointerId);
    const singleTap = Boolean(start) && taps.size === 1 && !multiTouch;
    taps.delete(e.pointerId);
    if (!singleTap || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > tapThreshold(e))
      return;
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
    landmarks: () => landmarks.map((l) => ({ ...l })),
    showLandmark(id) {
      showLandmark(id);
      render();
    },
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
          (part.schematic ? state.schematic !== false : true) &&
          (state.isolated
            ? part.id === state.selected
            : state.layers.has(part.group));
        const selected = part.id === state.selected;
        mesh.material.color.set(
          selected ? "#54aab9" : groups[part.group].color,
        );
        mesh.material.emissive.set(selected ? "#12383e" : "#000000");
        // Every tissue group carries its own opacity, so bone can be faded
        // to follow a nerve through it. The selected structure stays solid.
        const fade = state.opacity?.get(part.group) ?? 1;
        mesh.material.transparent = fade < 1 && !selected;
        mesh.material.opacity = mesh.material.transparent ? fade : 1;
        mesh.material.depthWrite = !mesh.material.transparent;
      }
      applyExplosion();
      // The pin marks a point on the assembled mandible. Separating the
      // assembly or opening a tooth model moves that bone out from under it.
      if (pinnedLandmark && (explosion > 0 || dentalModel)) showLandmark(null);
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

  // Registered facial and masticatory muscles, fetched after the first frame.
  // A failure here leaves the rest of the atlas usable, so it reports rather
  // than rejecting the viewer that already exists.
  const deferred = atlas.parts.filter(
    (part) => part.bufferUrl && part.bufferUrl !== BASE_BUFFER,
  );
  if (deferred.length)
    (async () => {
      const urls = [...new Set(deferred.map((part) => part.bufferUrl))];
      try {
        for (const url of urls) buffers.set(url, await loadBuffer(url));
      } catch (error) {
        onPartsChanged({ pending: 0, failed: deferred.length, message: error.message });
        return;
      }
      for (const part of deferred)
        addMesh(part, geometryFrom(part, buffers.get(part.bufferUrl)));
      layoutKey = "";
      if (currentState) api.update(currentState);
      onPartsChanged({ pending: 0, failed: 0 });
    })();

  return api;
}
