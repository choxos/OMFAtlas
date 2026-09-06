# OMF Atlas

An oral and maxillofacial anatomy website for dental students, dentists, and dental specialists, inspired by [Human Atlas](https://github.com/ashemag/human-atlas).

## Run

Node.js 22.13 or newer is required.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3016. No accounts, API keys, or backend are required.

```sh
npm test
npm run build
npm run preview
```

The production site is written to `dist/` and can be served by a static host at its root. The app currently uses root-relative asset paths. Google Fonts is optional; local sans-serif fallbacks remain available when offline.

## Included

- Head-and-neck-only 3D explorer: 643 selectable source meshes across 14 layers, including 47 registered facial and masticatory muscles recovered from BodyParts3D 3.0.
- Original-archive surface detail loads on selection for 549 structures, including all 28 source teeth and the mandible/maxillae. Upgraded meshes have 2.61 times the aggregate triangle count of their optimized equivalents; this is source geometry, not synthetic subdivision.
- A model-first studio interface inspired by Human Atlas, with floating layers, an always-visible desktop inspector (collapsible on mobile), search, opacity, separation, camera presets, zoom, and isolation. Selecting a part does not change the model viewport's desktop position or size.
- Adult/child selection changes the actual 3D teaching arches: 32 permanent, 20 primary, or a representative 24-tooth mixed dentition. Child teeth use different tissue proportions and root divergence, not a scaled adult skull.
- 32 permanent and 20 primary tooth reference entries, with FDI and Universal notation, eruption timing, primary shedding ranges, external morphology, and root patterns.
- Tooth-specific internal-anatomy notes, example canal arrangements, and an interactive explorer of all eight Vertucci configurations.
- Zoom into a selected tooth to open a rotatable 3D cutaway. Toggle enamel, dentin, pulp/root canals, cementum, periodontal ligament, alveolar bone, and gingiva; move the section plane or restore the external surfaces.
- Selecting a tooth does not recenter the head. Zoom out past the cutaway scale to return to the head or developmental arches; the explicit Back button does the same.
- Zoom stops at the normal 100% assembly before crossing into separation or close-up. Continued outward input separates intact tissue groups first, then arranges individual structures in tissue blocks: bones (including neck), muscles, teeth, then other tissues. The named list follows that ordering. Wheel/pinch has a 300 ms normal-view pause; separate toolbar clicks proceed on the next click. Zoom-out separation is deliberately slower than zoom-in; the Display controls slider also sets the arrangement directly.
- Deselect with the clear button, Escape, an empty-canvas click, or a second click on the selected structure.
- Additional labeled 2D tooth/periodontium diagrams include sulcus and junctional epithelium, plus a separate canal-configuration explorer.
- Periodontal anatomy, clinical study connections, learning-level notes, saved structures, guided study, and a scored self-test.
- In-app references and explicit model-coverage information.

## Educational scope

The source assembly contains 28 permanent teeth through the second molars and 615 other head-and-neck meshes. Some named structures consist of multiple source meshes. Anatomy is cropped below the C7 disk; crossing structures have open cut ends. See [model coverage](documentation/qa/MODEL-COVERAGE.md) and [facial muscle registration](documentation/qa/FACIAL-SOURCE.md) for source details. The cross-version facial overlay has a held-out bone surface RMS mismatch of 0.26 mm; clinical attachment accuracy has not been independently validated.

Primary teeth, third molars, dental arches, and internal dental tissues use procedural 3D teaching geometry, not segmented source anatomy. The cutaway spreads representative roots into the section plane, exaggerates thin tissues, and does not implement all canal variants. It is not a treatment access outline. Typical patterns and eruption ranges do not predict an individual patient.

This release is not an exhaustive clinical dentistry reference. Parotid gland, facial vein, and external jugular trunk meshes remain absent. The venous layer contains the two internal jugular segments. Pediatric skull/soft-tissue anatomy, craniofacial growth, tooth buds, root resorption, microscopic periodontal fibers, patient-specific imaging, pathology, and dynamic occlusion are not modeled. Independent dental-specialist editorial review is needed before curricular or clinical adoption. Model coverage is visible in the app.

## Data and maintenance

`src/dental.js`, `src/endodontics.js`, and `src/periodontium.js` hold dental content and source links. `src/content.js` holds regional study notes. `src/viewer.js` renders the extracted binary meshes with Three.js. The interface is plain JavaScript and CSS, built with Vite.

`src/dental-geometry.js` builds the schematic dental arches and internal tissues. [Validation evidence](documentation/qa/VALIDATION.md) distinguishes software checks from medical editorial review.

To reproduce the geometry, check out Human Atlas at `7a383d3ee2759e3ddf157c704fb8814fd0c50bcb`, then run:

```sh
node scripts/extract-models.mjs /absolute/path/to/human-atlas
npm test
```

Application code uses the repository MIT license. BodyParts3D 4.0 geometry is CC BY 4.0; the separate adapted 3.0 facial meshes retain CC BY-SA 2.1 Japan. Preserve [the full attribution](public/ATTRIBUTION.md) and [facial asset attribution](public/models/facial/ATTRIBUTION.md) when redistributing assets.

Run `node scripts/validate-explorer.mjs /path/to/browse http://localhost:3017` and `node scripts/validate-camera.mjs /path/to/browse http://localhost:3017` against a running production preview for browser interaction checks. [Reference UI study](documentation/qa/REFERENCE-UX.md) distinguishes upstream behavior from requested extensions.

To rebuild optional high-detail meshes, obtain the official OBJ archive and run `node scripts/upgrade-resolution.mjs /path/to/isa_BP3D_4.0_obj_99`. [Resolution evidence and reproduction](documentation/qa/RESOLUTION.md) record the source checksum, measured improvements, and limits. Per-structure files total 44.08 MB but load only when selected.
