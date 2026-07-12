# Chart Control Point Resize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable eight-handle canvas resizing for `barChart` and `lineChart`, persist normalized dimensions, and make panel width and height read-only.

**Architecture:** Add a small chart-size helper that owns dimension limits and scale normalization. Both chart renderers use it from guarded Fabric `modified` handlers, then redraw through their existing update functions and synchronize encoded state through `elementDataStore`. The existing global `resize8` control set remains the sole source of control visuals and drag behavior.

**Tech Stack:** Vue 3, TypeScript, Fabric.js, Pinia, Element Plus, Vitest, Vite

---

## File map

- Create `src/elements/charts/chartSize.ts`: chart dimension limits and pure scale-to-size normalization.
- Create `src/elements/charts/chartSize.test.ts`: focused normalization and limit tests.
- Modify `src/utils/controlManager.ts`: make both chart types eligible for unified controls.
- Modify `src/elements/charts/barChart/barChart.renderer.ts`: enable `resize8`, attach one guarded scale handler, redraw, and synchronize stored config.
- Modify `src/elements/charts/lineChart/lineChart.renderer.ts`: apply the same lifecycle to line charts.
- Modify both chart encoders and add encoder tests: encode displayed dimensions safely during transient Fabric scaling.
- Modify both chart panels: show disabled width and height controls with no update handlers.

### Task 1: Define and test the chart dimension contract

**Files:**
- Create: `src/elements/charts/chartSize.ts`
- Create: `src/elements/charts/chartSize.test.ts`

- [ ] **Step 1: Write the failing normalization tests**

```ts
import { describe, expect, it } from 'vitest'
import { normalizeChartSize } from './chartSize'

describe('normalizeChartSize', () => {
  it('applies independent Fabric scales to bar chart dimensions', () => {
    expect(normalizeChartSize('barChart', 120, 80, 1.5, 0.5)).toEqual({ width: 180, height: 40 })
  })

  it('clamps bar and line charts to their own limits', () => {
    expect(normalizeChartSize('barChart', 10, 500, 1, 1)).toEqual({ width: 60, height: 227 })
    expect(normalizeChartSize('lineChart', 10, 10, 1, 1)).toEqual({ width: 50, height: 20 })
  })

  it('falls back to scale one for invalid scale values', () => {
    expect(normalizeChartSize('lineChart', 100, 40, Number.NaN, 0)).toEqual({ width: 100, height: 40 })
  })
})
```

- [ ] **Step 2: Run the test and verify the helper is missing**

Run: `npm run test:unit -- src/elements/charts/chartSize.test.ts`

Expected: FAIL because `./chartSize` does not exist.

- [ ] **Step 3: Implement the pure helper**

```ts
export type ResizableChartType = 'barChart' | 'lineChart'

const LIMITS = {
  barChart: { minWidth: 60, maxWidth: 454, minHeight: 20, maxHeight: 227 },
  lineChart: { minWidth: 50, maxWidth: 454, minHeight: 20, maxHeight: 227 },
} as const

function safeScale(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function normalizeChartSize(type: ResizableChartType, width: number, height: number, scaleX = 1, scaleY = 1) {
  const limits = LIMITS[type]
  return {
    width: Math.round(clamp(width * safeScale(scaleX), limits.minWidth, limits.maxWidth)),
    height: Math.round(clamp(height * safeScale(scaleY), limits.minHeight, limits.maxHeight)),
  }
}
```

- [ ] **Step 4: Run the focused test**

Run: `npm run test:unit -- src/elements/charts/chartSize.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the size contract**

```bash
git add src/elements/charts/chartSize.ts src/elements/charts/chartSize.test.ts
git commit -m "test chart resize dimensions"
```

### Task 2: Enable controls, normalize resize events, and persist displayed sizes

**Files:**
- Modify: `src/utils/controlManager.ts`
- Modify: `src/elements/charts/barChart/barChart.renderer.ts`
- Modify: `src/elements/charts/lineChart/lineChart.renderer.ts`
- Modify: `src/elements/charts/barChart/barChart.encoder.ts`
- Modify: `src/elements/charts/lineChart/lineChart.encoder.ts`
- Create: `src/elements/charts/barChart/barChart.encoder.test.ts`
- Create: `src/elements/charts/lineChart/lineChart.encoder.test.ts`

- [ ] **Step 1: Write failing encoder tests for transient scaling**

```ts
expect(encodeBarChart(chart({ width: 100, height: 80, scaleX: 1.5, scaleY: 0.5 }))).toMatchObject({ width: 150, height: 40 })
expect(encodeLineChart(chart({ width: 100, height: 80, scaleX: 2, scaleY: 0.5 }))).toMatchObject({ width: 200, height: 40 })
```

Each local `chart()` fixture supplies the encoder's existing required id, position, origin, and style fields.

- [ ] **Step 2: Run the encoder tests and verify old dimensions are returned**

Run: `npm run test:unit -- src/elements/charts/barChart/barChart.encoder.test.ts src/elements/charts/lineChart/lineChart.encoder.test.ts`

Expected: FAIL because both encoders ignore `scaleX` and `scaleY`.

- [ ] **Step 3: Make encoders use normalized displayed dimensions**

```ts
const size = normalizeChartSize('barChart', Number(anyEl.width ?? 0), Number(anyEl.height ?? 0), Number(anyEl.scaleX ?? 1), Number(anyEl.scaleY ?? 1))
// return width: size.width, height: size.height
```

Use `lineChart` in the line-chart encoder.

- [ ] **Step 4: Enable the shared eight-handle controls**

Add `barChart` and `lineChart` to `DESIGNER_CONTROL_TYPES`. In both renderer creation options set `designerControlMode: 'resize8'`, `hasControls: true`, `lockScalingX: false`, `lockScalingY: false`, and `lockScalingFlip: true`, then call `applyControlsToObject(group)`.

- [ ] **Step 5: Attach one guarded resize handler per chart**

```ts
function attachScaleHandler(group: any): void {
  if (group.__chartScaleHandlerBound) return
  group.__chartScaleHandlerBound = true
  let committing = false
  group.on('modified', () => {
    if (committing) return
    const sx = Number(group.scaleX ?? 1)
    const sy = Number(group.scaleY ?? 1)
    if (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) return
    committing = true
    try {
      const size = normalizeChartSize(group.eleType, Number(group.width), Number(group.height), sx, sy)
      group.set({ scaleX: 1, scaleY: 1 })
      updateChart(group, size)
      useElementDataStore().patchElement(String(group.id), encodeChart(group))
    } finally {
      committing = false
    }
  })
}
```

Use the concrete update and encode functions in each renderer. Preserve `left` and `top`; after rebuilding children, reapply controls, call `setCoords()`, and request a render.

- [ ] **Step 6: Run focused tests**

Run: `npm run test:unit -- src/elements/charts/chartSize.test.ts src/elements/charts/barChart/barChart.encoder.test.ts src/elements/charts/lineChart/lineChart.encoder.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit renderer and encoder support**

```bash
git add src/utils/controlManager.ts src/elements/charts/chartSize.ts src/elements/charts/barChart src/elements/charts/lineChart
git commit -m "add chart control point resizing"
```

### Task 3: Make panel dimensions read-only and verify the feature

**Files:**
- Modify: `src/elements/charts/barChart/barChart.panel.vue`
- Modify: `src/elements/charts/lineChart/lineChart.panel.vue`

- [ ] **Step 1: Disable both width and height fields**

For all four `el-input-number` controls, add `disabled` and remove the width/height `@change` handlers:

```vue
<el-input-number v-model="formModel.width" :min="60" :max="454" disabled />
```

Keep the existing per-chart min/max values. Do not disable chart style or data controls.

- [ ] **Step 2: Verify no width or height panel update remains**

Run: `rg -n "applyUpdate\(\{ (width|height):" src/elements/charts/{barChart,lineChart}/*.panel.vue`

Expected: no matches.

- [ ] **Step 3: Run the unit suite and production build**

Run: `npm run test:unit`

Expected: all tests pass.

Run: `npm run build`

Expected: Vue TypeScript checking and Vite production build complete successfully.

- [ ] **Step 4: Check the final diff**

Run: `git diff --check`

Expected: no whitespace errors. Confirm unrelated pre-existing working-tree changes are not staged.

- [ ] **Step 5: Commit the panel change**

```bash
git add src/elements/charts/barChart/barChart.panel.vue src/elements/charts/lineChart/lineChart.panel.vue
git commit -m "make chart dimensions read only"
```

