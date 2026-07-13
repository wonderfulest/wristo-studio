# Convex Polygon Gradient Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore four-direction gradients for convex Shape and GoalBar polygons while keeping concave polygons solid-only.

**Architecture:** Add a shared convexity predicate alongside polygon validity, then normalize gradient flags from that predicate at every Studio and export boundary. Monkey C independently checks convexity: convex polygons use sliced gradients, concave progress polygons use the existing rectangular clip and solid color.

**Tech Stack:** Vue 3, TypeScript, Fabric.js, Vitest, Python unittest, Jinja2, Monkey C.

---

### Task 1: Shared convexity classification

- [ ] Add failing tests for convex and concave classification.
- [ ] Implement `isConvexPolygon` in Studio and scaffold.
- [ ] Run geometry tests.

### Task 2: Shape Polygon conditional gradient

- [ ] Add failing encoder tests for convex-gradient preservation and concave-gradient downgrade.
- [ ] Restore gradient preview/encoding only when points are convex.
- [ ] Restore panel controls for convex polygons and show the concave-only hint otherwise.
- [ ] Run Shape Polygon tests.

### Task 3: GoalBar conditional gradient

- [ ] Add failing encoder tests for convex-gradient preservation and concave-gradient downgrade.
- [ ] Normalize gradient flags during create/update/vertex commit and conditionally expose panel controls.
- [ ] Keep concave progress on clipPath solid rendering and restore convex polygon gradient rendering.
- [ ] Run GoalBar tests.

### Task 4: Scaffold, Jinja, and Monkey C

- [ ] Add failing Python/source tests for convex gradient retention and concave downgrade.
- [ ] Classify polygons in scaffold and emit the normalized flag.
- [ ] Restore Polygon Jinja gradient options.
- [ ] Restore Polygon.mc convex-only sliced gradients.
- [ ] Make GoalBar.mc choose convex gradient versus concave clipped solid rendering.
- [ ] Run polygon and neighboring gradient regressions.

### Task 5: Verify

- [ ] Run focused Vitest and Python suites.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check` in all affected Git roots.
- [ ] Do not commit, push, package, or deploy.
