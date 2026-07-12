# Rectangle Gradient Opacity Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Connect IQ rectangle gradients honor one uniform element opacity without Alpha accumulation.

**Architecture:** Replace overlapping nested rectangles in the shared `Rectangle.mc` runtime with bounded, non-overlapping gradient bands. Preserve the existing extraction, template passthrough, four directions, color interpolation, rounded outline, and independent stroke path.

**Tech Stack:** Monkey C, Python unittest source-contract tests

---

### Task 1: Add the regression contract

**Files:**
- Modify: `wristo-connectiq-app-build/wristo-scaffold/tests/test_rectangle_gradient.py`

- [ ] Add assertions requiring a band-bound calculation and explicit band start/end coordinates.
- [ ] Add an assertion rejecting the old `sizeRatio` nested-fill algorithm.
- [ ] Run the focused test and confirm it fails on the old runtime implementation.

### Task 2: Implement non-overlapping rounded bands

**Files:**
- Modify: `wristo-apps/SuperBarrel/shapes/Rectangle.mc`

- [ ] Clamp the effective corner radius to half of the rectangle's shorter dimension.
- [ ] For each horizontal or vertical band, compute its non-overlapping axis interval.
- [ ] Compute the perpendicular inset at rounded corners using the circle equation.
- [ ] Fill each band once using its center-sampled interpolated color and existing opacity conversion.
- [ ] Keep the current solid fill and separate stroke paths unchanged.

### Task 3: Verify

**Files:**
- Verify: `wristo-connectiq-app-build/wristo-scaffold/tests/test_rectangle_gradient.py`
- Verify: `wristo-apps/SuperBarrel/shapes/Rectangle.mc`

- [ ] Run the focused rectangle test in an environment with Jinja2.
- [ ] Run related scaffold tests when dependencies are available.
- [ ] Run `git diff --check` in both affected repositories.
- [ ] Review the final diff for unrelated changes.
