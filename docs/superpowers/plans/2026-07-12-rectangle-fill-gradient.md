# Rectangle Fill Gradient Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two-color fill gradients with four fixed directions to Studio rectangle elements and generated Connect IQ apps.

**Architecture:** Keep backward-compatible flat gradient fields on the rectangle config. Build Fabric gradients in a focused Studio helper, normalize export values in the scaffold extractor, and render the gradient in the shared SuperBarrel rectangle runtime while SuperAlpha only passes normalized options through.

**Tech Stack:** Vue 3, TypeScript, Fabric.js, Vitest, Python unittest, Jinja2, Monkey C

---

### Task 1: Rectangle gradient model and Fabric specification

**Files:**
- Create: `src/elements/shapes/rectangle/rectangle.gradient.ts`
- Create: `src/elements/shapes/rectangle/rectangle.gradient.test.ts`
- Create: `src/elements/shapes/rectangle/rectangle.encoder.test.ts`
- Modify: `src/types/elements/shape.ts`
- Modify: `src/elements/shapes/rectangle/rectangle.schema.ts`
- Modify: `src/elements/shapes/rectangle/rectangle.encoder.ts`

- [ ] Write failing Vitest cases for all four Fabric coordinate mappings, invalid-direction fallback, gradient field round-trip, and legacy defaults.
- [ ] Run `npm run test:unit -- src/elements/shapes/rectangle/rectangle.gradient.test.ts src/elements/shapes/rectangle/rectangle.encoder.test.ts` and verify failures are caused by missing gradient support.
- [ ] Add `RectangleGradientDirection`, optional config fields, schema defaults, gradient normalization/spec creation, and encoder/decoder persistence.
- [ ] Re-run the focused tests and verify they pass.

### Task 2: Studio panel and live rectangle preview

**Files:**
- Modify: `src/elements/shapes/rectangle/rectangle.panel.vue`
- Modify: `src/elements/shapes/rectangle/rectangle.renderer.ts`
- Modify: `src/i18n.ts`
- Test: `src/elements/shapes/rectangle/rectangle.gradient.test.ts`

- [ ] Extend the failing helper tests to require a Fabric linear gradient with the requested dimensions and colors.
- [ ] Run the focused test and verify the new assertion fails.
- [ ] Enable gradient mode on the existing color picker, add a four-direction selector, and apply gradient fields through the standard patch path.
- [ ] Update rectangle create/update/resize synchronization so Fabric `fill` is regenerated from the solid fallback plus current gradient fields.
- [ ] Add English and Chinese labels for the gradient direction and four values.
- [ ] Run the focused rectangle tests and `npm run typecheck`.

### Task 3: Scaffold extraction and SuperAlpha option passthrough

**Files:**
- Create: `../wristo-connectiq-app-build/wristo-scaffold/tests/test_rectangle_gradient.py`
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/super-extract-elements.py`
- Modify: `../wristo-apps/SuperAlpha/source/SuperAlphaView.j2.mc`

- [ ] Write failing Python tests for legacy defaults, normalized colors, four accepted directions, invalid-direction fallback, and template passthrough.
- [ ] Run `python3 -m unittest tests.test_rectangle_gradient -v` from `../wristo-connectiq-app-build/wristo-scaffold` and verify expected failures.
- [ ] Add rectangle-only extraction fields and safe direction literal generation.
- [ ] Pass all four normalized options from the SuperAlpha rectangle block.
- [ ] Re-run the Python test and existing goal gradient tests.

### Task 4: Shared Monkey C rectangle renderer

**Files:**
- Modify: `../wristo-apps/SuperBarrel/shapes/Rectangle.mc`
- Test: `../wristo-connectiq-app-build/wristo-scaffold/tests/test_rectangle_gradient.py`

- [ ] Add failing source-contract assertions for the four runtime options, horizontal/vertical branching, reverse direction, opacity conversion, rounded rendering, and separate stroke drawing.
- [ ] Run the rectangle Python test and verify the contract assertions fail.
- [ ] Add default options and implement bounded horizontal/vertical gradient slices; use rounded nested fills when `borderRadius > 0`, apply `colorWithOpacity` per slice, and draw the existing solid stroke afterward.
- [ ] Re-run rectangle, goal gradient, and polygon scaffold tests.

### Task 5: Full verification

**Files:**
- Verify all modified files in the three repositories.

- [ ] Run all rectangle Vitest files.
- [ ] Run `npm run build` in `wristo-studio`.
- [ ] Run `python3 -m unittest discover -s tests -v` in `wristo-connectiq-app-build/wristo-scaffold`.
- [ ] Run `git diff --check` independently in `wristo-studio`, `wristo-connectiq-app-build`, and `wristo-apps`.
- [ ] Inspect repository status independently and report pre-existing unrelated changes separately from this feature.

