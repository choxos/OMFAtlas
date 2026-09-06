# Human Atlas interaction study

Reference: https://github.com/ashemag/human-atlas

Inspected clean clone: `/tmp/omfatlas-reference`, commit `7a383d3ee2759e3ddf157c704fb8814fd0c50bcb`.

This is a source-level interaction inventory, not a claim that browser scenarios passed. The complete application files `app/page.tsx`, `app/scene.tsx`, `app/explosion-layout.ts`, `app/pointer-tap.ts`, `app/anatomy.ts`, `app/globals.css`, README, and both validation scripts were inspected. Unused UI component-library files are not app behaviors.

## Zoom and assembly are distinct in the reference

The reference uses ordinary OrbitControls wheel/pinch zoom. It does **not** connect wheel distance to explosion. Its bottom slider explicitly controls assembly from 0 to 100 percent. The requested wheel-driven transition in OMF Atlas therefore extends the reference interaction rather than copying a wheel handler.

The reference inventory is a spatial arrangement of individually selectable 3D meshes, not an HTML list of every anatomical part. Its systems panel lists systems and their counts. Search lists up to 80 matching concepts. A selected compound concept lists its first 50 included meshes.

## Camera and framing

- Perspective camera: 34-degree field of view. Damped orbit controls, damping 0.085, distance limits 0.07 to 40 scene units. The assembled camera targets the body rather than the selected structure.
- Selecting a mesh highlights it and opens the inspector without recentering. Selecting from search behaves the same way.
- Four camera presets: three-quarter, front, side, back. Choosing one stops auto-rotation and refits. Non-front presets are disabled above 80% explosion.
- Auto-rotation is a separate toggle. It is disabled at 40% explosion or above and suppressed during isolation.
- Isolation fits only selected geometry, using the actual viewport space left by the inspector and other controls. A camera view offset avoids placing the object behind the panel. Leaving isolation clears that offset and fits the assembly/inventory.
- Layout responds to viewport aspect ratio. Fit calculations reserve space for left controls, top identity, bottom dock, and mobile inspector. Resize invalidates the packing layout.
- Reset restores default visible systems, clears selection and isolation, assembles the anatomy, stops rotation, closes panels, and returns to three-quarter view.

Source: `app/scene.tsx:19-24`, `:78-85`, `:115-123`; `app/page.tsx:28`, `:40`.

## Two-stage exploded inventory

1. **0 to 45%:** systems move radially, using each system's angular index. Vertical separation expands around the body center. The reference uses 0.48 units radial and 28% vertical expansion at the end of this phase.
2. **45 to 100%:** every individual mesh interpolates from its separated-system position to its own frontal packing cell. Depth converges to zero at the center of each mesh; individual geometry is not flattened.
3. **100%:** all currently visible meshes have distinct nonoverlapping projected bounding-box cells. It is not a fixed uniform grid and does not pack hidden meshes.

Packing uses each mesh's source X/Y extents, a minimum extent of 0.035, and 0.04 padding. Cards sort by height descending with ID as a deterministic tie-breaker, then fill shelf rows. Target width depends on total card area and clamped viewport aspect. Positions are centered around the layout's bounding rectangle.

Explosion is damped toward the slider state at rate 8. Camera distance begins adapting after roughly 30%; the transitioning camera faces front above 50%. Left drag and one-finger touch become pan at 80%; orbit is disabled then. Ground and platform disappear at 50%. Small center markers appear above 75%.

Screen-space projected bounds support tiny structures: if ordinary triangle picking misses above 45%, nearby bounds can still be picked within 16 pixels for a mouse or 24 for touch. Above 50%, mouse hover displays the part name with a 12-pixel proximity tolerance. Tooltip placement is clamped to the viewport. These details matter when hundreds of tiny vessels are packed together.

Source: `app/explosion-layout.ts:4-14`; `app/scene.tsx:37-42`, `:89-96`, `:101-124`.

## Selection and clearing

- A canvas tap chooses a single source mesh; a search result may select several mesh IDs belonging to a concept. Selection stops auto-rotation, exits isolation, opens details, and closes search/layers overlay.
- Selected meshes remain visible even when their system is otherwise hidden. Selection uses a mint highlight blended into the system color.
- The inspector has an explicit **Clear selection** footer action. This clears selected IDs and isolation and closes the inspector.
- Inspector X only closes details. It does not clear selection. Clicking the selected part again does not toggle it off, and clicking empty canvas does not clear it in this reference revision.
- Changing a system toggle, solo-system name, preset, or Hide all clears selected IDs and isolation. Opening search or systems hides details but does not itself clear selection.
- Selection is a real tap, not merely pointer-up: movement thresholds are 5 pixels mouse / 12 touch, moving away and back still invalidates the gesture, any multitouch sequence blocks a tap, and cancellation invalidates it.

For OMF Atlas, the user explicitly asked to unselect a part. An obvious clear button plus empty-canvas clearing, same-part toggling, and Escape are reasonable additions beyond the reference. All must route through one clear-state operation so isolation and tooth-detail state do not remain stuck.

Source: `app/page.tsx:25-29`, `:47`; `app/pointer-tap.ts:2-21`; `app/scene.tsx:88-97`.

## Panels, search, layers, and details

- Full-viewport light-gray stage. Header top-left, find/about top-right, systems panel left, compact camera rail right, assembly slider bottom-center, instructions and credits at the bottom.
- Fifteen potential anatomical systems, with only nonempty ones displayed. Default hides the outer body-surface layer but shows other systems. That outer surface is translucent at 10%, does not write depth, and is excluded from picking while solid anatomy is visible.
- System switches toggle independently; system names solo that system. Presets provide All, Skeleton, and six organ systems. Visible-piece count and Hide all remain in the panel footer.
- `/` opens focused search unless typing in an input or textarea. Search is case-insensitive over concept name and identifier, trimmed, sorted by shorter names first, and limited to 80 matches. Empty search suggests eight major organs. No-results and refinement guidance are explicit.
- Search uses a combobox with accessible list selection. Its panel closes when the combobox closes. Camera controls have descriptive labels, titles, and pressed/disabled states.
- Details are a nonmodal sheet with pointer dismissal disabled. Opening focuses the heading. Header and action footer stay fixed while content scrolls. Description distinguishes exact named-organ explanations from fallback system context. Metadata shows source concept ID and selected-piece count; compound concepts show members; source attribution remains linked.
- Isolate toggles to Show surrounding anatomy and always assembles the selected geometry first. Source/about is a separate sheet with model counts, license, educational limitations, and primary-source links.
- Loading uses a percentage, loaded-piece context, progress bar, and status role. Model or WebGL errors use an alert and reload action.

Source: `app/page.tsx:14-49`; `app/anatomy.ts:1-36`.

## Mobile, layout, and visual treatment

- Final CSS uses Inter/system sans, light neutral surfaces, muted blue-gray text, system color dots, dark slate active controls, white translucent glass, thin borders, 14–16px panel radii, and restrained shadows. Later CSS overrides earlier declarations; copying only the first rules gives the wrong result.
- Below 768px systems become a bottom-dock popover; search is compact near the top; camera buttons form a horizontal row above the anatomy; details are a bottom sheet above the dock. Camera controls hide while mobile details are open.
- In short landscape, layers/details become side panels. Details hide competing top controls; the dock moves out of the details panel footprint.
- Controls use 44px touch targets where practical, enlarged invisible slider/switch hit regions, 16px mobile search text, safe-area offsets, wrapping long names, overscroll containment, stable scrollbars, and keyboard focus outlines.
- Reduced-motion CSS removes CSS transitions and animations. The source does not disable Three.js explosion damping through that media preference.
- There is no child/adult control in the rendered application: this reference is adult male only. CSS mentioning an anatomy-choice selector does not establish an active selector in `page.tsx`.

Source: complete `app/globals.css`, especially later mobile overrides; `app/page.tsx:31-49`.

## Loading and rendering performance

- Geometry downloads in up to three parallel chunks, optionally using gzip with DecompressionStream. Progress reflects completed chunks.
- Source meshes are merged by system/chunk for rendering. Per-part GPU textures store translation, visibility, and selection; separate mesh objects retain exact pickable geometry. Normal attributes use normalized signed 16-bit data.
- Rendering occurs only while dirty, although a requestAnimationFrame loop continues to update damping/state. Pixel ratio is capped at 2 on desktop and 1.5 on small or short viewports.
- WebGL initialization failures and context loss are surfaced. Unmount aborts downloads and disposes controls, buffers, textures, materials, environment, renderer, observers, and animation loop.
- README reports approximately 33MB compressed, 2,234 meshes, and 2,288,268 triangles. These are reference documentation/data constraints, not measured OMF performance or a mandate to lower OMF's selected-mesh resolution.

## OMF gaps observed before the current changes

`src/viewer.js` originally used center-relative radial offsets for the entire explosion range, without a packing destination, camera inventory framing, enlarged picking targets, or inventory-specific panning. Its maximum camera distance of 1.2 was fixed. Its existing tooth zoom-entry/exit logic must remain a prior phase of the requested progression. The current app already has age/dental teaching features absent from the reference; those should not be removed while adopting the studio interaction.

## Proposed wheel progression for OMF

Use a continuous assembly amount shared by slider, buttons, wheel, and pinch, but keep the existing close tooth-detail exit first. From assembled head, normal outward zoom reaches a viewport-relative overview distance; further outward input increases the 0–100% assembly amount. Reverse input decreases it back to zero before ordinary close zoom resumes. Use normalized input rather than a fixed number of wheel events. Programmatic fit/resize must not feed back into user-driven explosion detection.

Keep the reference's 45% phase boundary, visible-only bounding-box packing, frontal/pan inventory, and nearby target picking. At near-complete inventory (for example entry 95%, exit below 90%), reveal the user-requested searchable textual list of visible parts alongside the spatial inventory. This list is an OMF extension and must not steal the canvas's wheel zoom while the pointer is over the canvas; wheel over the list should scroll the list. Avoid threshold oscillation, preserve layers, and suppress head explosion during isolated teaching models. Verify reverse transitions and selection in both directions on desktop and touch-sized viewports.

## Reference verification contracts

`scripts/validate-interactions.mjs` checks nonoverlapping cells for all meshes and each system at aspect ratios 0.46, 1, and 1.7; source-ID search/inspection; invalid inspection preserving selection; empty query errors; tap, moved-away-and-back drag, multitouch, cancellation; and empty packing. `scripts/validate-atlas.mjs` verifies source counts, geometry offsets, finite positions, valid indices, concept membership, and triangle total. These are useful patterns but are not substitutes for browser manipulation of the OMF implementation.
