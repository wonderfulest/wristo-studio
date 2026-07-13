# Canvas Stage Pan Hold Delay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require a 1500ms hold before whole-stage panning begins from inside either a round or rectangular watch face, while preserving immediate panning outside the watch face.

**Architecture:** Keep the existing `immediate` versus `long-press` pointer-region state machine unchanged. Update the shared long-press delay constant used by `Design.vue`; the existing hit testing, 6px movement tolerance, pointer ownership, Fabric handoff, and stage synchronization remain untouched.

**Tech Stack:** Vue 3, TypeScript, Fabric.js 6.7.1, Node.js test runner

---

### Task 1: Change the shared inside-watch-face hold delay

**Files:**
- Modify: `tests/canvasPan.test.mjs:59-62`
- Modify: `src/utils/canvasPan.ts:12`

- [ ] **Step 1: Write the failing test**

Change the existing shared-delay assertion so it expresses the new interaction contract while retaining the existing tolerance assertion:

```js
test('canvas long press uses the agreed delay and movement tolerance', () => {
  assert.equal(CANVAS_LONG_PRESS_DELAY_MS, 1500)
  assert.equal(CANVAS_LONG_PRESS_TOLERANCE_PX, 6)
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
npm run test:canvas-pan
```

Expected: FAIL in `canvas long press uses the agreed delay and movement tolerance`, reporting actual `400` versus expected `1500`. The remaining canvas-pan tests should pass.

- [ ] **Step 3: Write the minimal implementation**

Update the single shared production constant:

```ts
export const CANVAS_LONG_PRESS_DELAY_MS = 1500
```

Do not change `Design.vue`: it already passes `CANVAS_LONG_PRESS_DELAY_MS` to `window.setTimeout()` for every `long-press` region, covering both round and rectangular watch-face interiors.

- [ ] **Step 4: Run focused and project verification**

Run:

```bash
npm run test:canvas-pan
npm run typecheck
npm run build
git diff --check
```

Expected: all commands exit with status 0; the canvas-pan suite reports all tests passing, type checking reports no errors, and Vite completes the production build.

- [ ] **Step 5: Commit the behavior change**

```bash
git add tests/canvasPan.test.mjs src/utils/canvasPan.ts
git commit -m "fix: require longer hold for canvas pan"
```
