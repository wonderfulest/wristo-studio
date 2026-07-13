# Concave Solid Polygon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow simple concave polygons in Shape Polygon and GoalBar customPolygon while enforcing one solid color per polygon across Studio and Connect IQ.

**Architecture:** Relax the shared polygon geometry validator by removing convexity rejection while preserving all structural safety checks. Enforce solid-only behavior independently at the Studio encoder/renderer/panel, scaffold, Jinja/runtime boundary, and GoalBar customPolygon branches so legacy gradient data cannot bypass the UI.

**Tech Stack:** Vue 3, TypeScript, Fabric.js, Vitest, Python unittest, Jinja2, Monkey C.

---

### Task 1: Relax geometry validation

**Files:**
- Modify: `src/elements/goal/goalBar/goalBar.geometry.test.ts`
- Modify: `src/elements/goal/goalBar/goalBar.geometry.ts`
- Modify: `src/elements/shapes/polygon/polygon.geometry.test.ts`
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/tests/test_goal_bar_polygon.py`
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/super-extract-elements.py`

- [ ] Add failing tests proving a simple concave polygon is valid while a bow-tie remains invalid.
- [ ] Remove the convex winding rejection from TypeScript and Python validation.
- [ ] Run focused geometry and scaffold tests to confirm GREEN.

### Task 2: Enforce solid-only Shape Polygon

**Files:**
- Modify: `src/elements/shapes/polygon/polygon.encoder.test.ts`
- Modify: `src/elements/shapes/polygon/polygon.encoder.ts`
- Modify: `src/elements/shapes/polygon/polygon.renderer.ts`
- Modify: `src/elements/shapes/polygon/polygon.panel.vue`
- Modify: `src/elements/shapes/polygon/polygon.schema.ts`
- Modify: `src/i18n.ts`

- [ ] Add a failing encoder test proving legacy polygon gradients decode and encode with `gradientEnabled: false`.
- [ ] Force solid fill in encoder/renderer/schema and remove gradient controls from the panel.
- [ ] Add English and Chinese solid-only hint text.
- [ ] Run all Shape Polygon Vitest files.

### Task 3: Enforce solid-only GoalBar customPolygon

**Files:**
- Modify: `src/elements/goal/goalBar/goalBar.encoder.test.ts`
- Modify: `src/elements/goal/goalBar/goalBar.encoder.ts`
- Modify: `src/elements/goal/goalBar/goalBar.renderer.ts`
- Modify: `src/elements/goal/goalBar/goalBar.panel.vue`

- [ ] Add failing tests proving customPolygon forces gradient off while rectangle preserves gradient.
- [ ] Normalize customPolygon configs to `gradientEnabled: false` in encoder and renderer update/create paths.
- [ ] Hide gradient controls for customPolygon and display the single-color hint.
- [ ] Run focused GoalBar tests.

### Task 4: Enforce Connect IQ single-color polygons

**Files:**
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/tests/test_polygon_shape.py`
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/tests/test_goal_bar_polygon.py`
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/super-extract-elements.py`
- Modify: `../wristo-apps/SuperAlpha/source/SuperAlphaView.j2.mc`
- Modify: `../wristo-apps/SuperBarrel/shapes/Polygon.mc`
- Modify: `../wristo-apps/SuperBarrel/goal/GoalBar.mc`

- [ ] Add failing Python/source tests proving polygon gradients are stripped and GoalBar polygon branches never call gradient drawing.
- [ ] Force polygon and customPolygon gradient flags off in scaffold.
- [ ] Remove gradient options from the Polygon Jinja call and `Polygon.mc`.
- [ ] Make GoalBar customPolygon branches use only `color` while retaining rectangle gradient behavior.
- [ ] Run polygon, GoalBar polygon, rectangle and circle regression tests.

### Task 5: Verify

- [ ] Run all focused Vitest tests.
- [ ] Run focused scaffold Python tests with `/opt/homebrew/anaconda3/bin/python3`.
- [ ] Run `npm run build` in `wristo-studio`.
- [ ] Run `git diff --check` in every affected Git root.
- [ ] Preserve all unrelated dirty changes and do not commit, push, package, or deploy.
