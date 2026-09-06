# Validation record

Date: September 6, 2026. Local production preview: http://127.0.0.1:3017.

## Automated checks

- `npm test`: all ten tests passed. Checks cover all 52 tooth identifiers, all 596 base meshes, all 549 higher-resolution buffers, dentition counts, tissue geometry, filled section surfaces, and positive-volume chamber/canal and crown/root connections.
- `npm run build`: passed. Vite reports a nonblocking JavaScript chunk-size warning (579.29 kB minified; 153.85 kB gzip).
- `npm audit --audit-level=high`: zero vulnerabilities reported.
- `git diff --check`: passed for tracked changes; implementation files are currently untracked.
- `node scripts/validate-camera.mjs /path/to/browse http://127.0.0.1:3017`: passed against the production preview. The runnable browser regression covers selection without close-up, zoom-in, zoom-out returning to the head, child context preservation, and wheel zoom-out returning to the primary arches. `--help` and syntax checks passed.

## Browser observations

The application was exercised in a real headless browser, including the production build, not just inspected as source.

- Expanded head-and-neck geometry loaded and rendered; initial view displayed 450 of 596 meshes. The vascular preset displayed 163 meshes. Searching jugular returned the two source vein segments, and isolation rendered the selected segment.
- Higher-resolution geometry loaded on selection. The mandible reported 5,576 triangles; upper first molar 2,156; the selected jugular segment 187. The base assembly remains available while detail loads.
- Adult, child, and mixed selectors changed both the 3D arches and charts to 32, 20, and 24 teeth respectively. The mixed count is labeled as an example, not a developmental rule.
- Repeated zoom-in entered the selected tooth's 3D cutaway. Hiding all tissues except pulp revealed the connected chamber and three representative canals; disabling cutaway restored their full 3D surfaces.
- Tooth selection was compared visually before and after selecting FDI 16: head framing stayed fixed rather than centering on the selected tooth. Explicit zoom and cutaway actions remain responsible for camera movement.
- FDI 16 displayed MB1, MB2, DB, and P in its conceptual canal map. Selecting Vertucci VII displayed the 1-2-1-2 configuration.
- The tooth/periodontium section supported tissue selection and visibility changes.
- The primary chart displayed 20 entries and primary tooth inspection rendered different schematic proportions and root divergence, with explicit source limits.
- Switching back to permanent teeth and inspecting FDI 36 restored a correctly sized 3D canvas.
- An unmatched search displayed an empty state. A saved mandible remained available in study content.
- Completing the six-question self-test with one wrong answer produced 5/6; restart returned to question one.
- Credits opened and closed successfully. No application JavaScript errors were observed; screenshot capture produced GPU readback performance warnings.
- Responsive viewport checks at 390×844 and 320×568 found no horizontal page overflow. Tooth cutaway controls occupied a separate dock, and mobile detail panels could be opened/closed without covering the entire model. These checks were viewport emulation, not physical touch-device testing.

Final production screenshots were captured and visually inspected:

- [Expanded studio explorer](studio-head-neck.png)
- [Rotatable tooth cutaway](studio-tooth-cutaway.png)
- [Isolated pulp and root canals](isolated-root-canals.png)

The earlier `head-neck.png` and `root-canals.png` screenshots are retained as baseline evidence of the first release, not the current UI.

## September 6 interaction and facial-muscle follow-up

- Production build and all 13 Node tests pass. New checks cover facial binary validity, tissue-rigid offsets, and noninterleaving tissue inventory blocks.
- `scripts/validate-explorer.mjs` passed against the production preview: clear button, same-part toggle, Escape, empty canvas, slower outward progress, normal-view detent in both directions, ordered named inventory, reverse zoom, wheel progression, and reassemble.
- The same browser check confirms the desktop inspector is present initially and the canvas rectangle is unchanged after selection.
- `scripts/validate-camera.mjs` passed again: tooth selection, zoom into cutaway, zoom out to head/arches, child context, and wheel exit.
- The combined 643-mesh viewer visibly renders the recovered facial musculature. This is a registered cross-version assembly, not a clinical validation; see FACIAL-SOURCE.md.
- Desktop inventory screenshot: [tissue grouping](tissue-inventory.png). Mobile viewport 390×844: inventory automatically opens the named list, with no horizontal overflow. Physical touch hardware was not tested.
- Editor diagnostics remained unavailable (timeout/missing Biome); `node --check`, build, tests and browser checks were used. Vite retains its nonblocking JavaScript chunk-size warning.

## Clinical and verification limits

This is an educational release, not exhaustive coverage of dentistry or a clinically validated reference. Dental internals and developmental arches are procedural schematics, not segmented anatomy. Forty-seven registered 3.0 facial/masticatory muscles now supplement the 4.0 base, but most facial veins and pediatric head anatomy remain absent. Detailed exclusions and source-resolution limits are listed in the README, MODEL-COVERAGE.md, FACIAL-SOURCE.md, RESOLUTION.md, and in-app coverage information.

Automated tests do not establish medical accuracy. Independent dental-specialist editorial review remains necessary. Mobile testing used browser viewports, not physical touch devices. A complete accessibility audit was not performed. The editor diagnostic integration was unavailable; the successful build and runtime checks do not substitute for that integration.
