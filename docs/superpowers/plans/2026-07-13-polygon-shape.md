# Polygon Shape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-class editable polygon Shape and carry its normalized points and styling through Studio export into the shared Connect IQ runtime.

**Architecture:** Studio owns a `PolygonElementConfig` with normalized points and renders it with Fabric `Polygon`; polygon geometry reuses the existing GoalBar validation contract. The scaffold serializes the same points into Monkey C, the Jinja template calls a new shared `Polygon.mc`, and the runtime handles solid, opacity, border, and four-direction sliced gradients.

**Tech Stack:** Vue 3, TypeScript, Fabric.js, Vitest, Python unittest, Jinja2, Monkey C.

---

### Task 1: Polygon geometry and persistent type contract

**Files:**
- Create: `src/elements/shapes/polygon/polygon.geometry.ts`
- Create: `src/elements/shapes/polygon/polygon.geometry.test.ts`
- Create: `src/elements/shapes/polygon/polygon.schema.ts`
- Modify: `src/types/elements/shape.ts`
- Modify: `src/types/elements/index.ts`

- [ ] Write tests proving the default six-point polygon is valid, cloned defensively, and invalid input falls back to the default.
- [ ] Run `npx vitest run src/elements/shapes/polygon/polygon.geometry.test.ts` and confirm failure because the module is absent.
- [ ] Add `PolygonElementConfig`, default normalized six-point data, clone/validate/fallback helpers, and the polygon schema.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Encoder and Fabric renderer

**Files:**
- Create: `src/elements/shapes/polygon/polygon.encoder.test.ts`
- Create: `src/elements/shapes/polygon/polygon.encoder.ts`
- Create: `src/elements/shapes/polygon/polygon.renderer.test.ts`
- Create: `src/elements/shapes/polygon/polygon.renderer.ts`

- [ ] Write encoder tests for decode/encode round trips, defensive point copies, gradient persistence, and invalid-point fallback.
- [ ] Run the encoder test and confirm failure because the encoder is absent.
- [ ] Implement encoder/decode behavior using the polygon geometry helpers and the existing Shape color conventions.
- [ ] Re-run encoder tests and confirm they pass.
- [ ] Write renderer tests proving normalized points become Fabric-local points, resize is absorbed into width/height, and updating points rebuilds the shape without changing its center.
- [ ] Run the renderer test and confirm failure because the renderer is absent.
- [ ] Implement creation/update, gradient fill, store synchronization, controls, layer registration, and resize normalization using Fabric `Polygon`.
- [ ] Re-run renderer and encoder tests and confirm they pass together.

### Task 3: Settings panel, vertex editing, menu, and plugin registration

**Files:**
- Create: `src/elements/shapes/polygon/PolygonMiniEditor.vue`
- Create: `src/elements/shapes/polygon/polygon.panel.vue`
- Create: `src/elements/shapes/polygon/polygon.plugin.ts`
- Create: `src/elements/shapes/polygon/polygon.panel.test.ts`
- Modify: `src/engine/plugins/pluginLoader.ts`
- Modify: `src/elements/schemaMap.ts`
- Modify: `src/components/layout/app-menu/AppMenuShape.vue`
- Modify: `src/i18n.ts`

- [ ] Write a panel/registration test proving `polygon` is registered, its settings component is reachable, and commits valid cloned points only.
- [ ] Run the focused test and confirm failure because polygon registration and panel are absent.
- [ ] Extract or wrap the GoalBar mini-editor behavior as a polygon-local component backed by the existing geometry/edit model contract.
- [ ] Implement width, height, fill/gradient, border, opacity, and transactional vertex editing in the panel.
- [ ] Register the plugin/schema/menu item and add English/Chinese labels.
- [ ] Re-run the focused test and all polygon Studio tests.

### Task 4: Scaffold extraction and Jinja generation

**Files:**
- Create: `../wristo-connectiq-app-build/wristo-scaffold/tests/test_polygon_shape.py`
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/super-extract-elements.py`
- Modify: `../wristo-apps/SuperAlpha/source/SuperAlphaView.j2.mc`

- [ ] Write Python tests for normalized valid points, invalid-point default fallback, four gradient directions, and a rendered `Polygon.draw` template block.
- [ ] Run `python3 -m unittest wristo-scaffold.tests.test_polygon_shape -v` from `../wristo-connectiq-app-build` and confirm failure because polygon extraction/template support is absent.
- [ ] Add polygon validation/serialization to the scaffold, emitting `polygonPoints` and compact `polygonPointsLiteral`.
- [ ] Extend the existing rectangle/circle gradient extraction branch to include polygon.
- [ ] Add the Jinja polygon block with center, width, height, points, fill, border, opacity, and gradient options.
- [ ] Re-run the Python test and confirm it passes.

### Task 5: Shared Monkey C Polygon runtime

**Files:**
- Create: `../wristo-apps/SuperBarrel/shapes/Polygon.mc`
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/tests/test_polygon_shape.py`

- [ ] Extend the runtime source test to require normalized point conversion, `fillPolygon`, closed `drawLine` border, `ColorUtils.colorWithOpacity`, four directions, clipping, and `MAX_GRADIENT_SLICES`.
- [ ] Run the Python test and confirm the new runtime assertions fail because `Polygon.mc` is absent.
- [ ] Implement `WonderBarrel.Polygon.draw` with runtime validation, screen-point conversion, solid/alpha rendering, closed border rendering, and bounded four-direction gradient clipping.
- [ ] Re-run the polygon Python test and neighboring rectangle/circle/GoalBar scaffold tests.

### Task 6: Full verification

**Files:**
- Verify all files above without modifying unrelated dirty files.

- [ ] Run all focused polygon Vitest files.
- [ ] Run focused scaffold tests for polygon, rectangle gradient, circle gradient, and GoalBar polygon.
- [ ] Run `npm run build` in `wristo-studio`.
- [ ] Run `git diff --check` separately in `wristo-studio`, `wristo-connectiq-app-build`, and `wristo-apps`.
- [ ] Review `git status --short` and confirm every changed path is either pre-existing user work or part of the approved polygon scope.
- [ ] Report exact passing checks and any environment-only blockers; do not commit, push, package, or deploy.
