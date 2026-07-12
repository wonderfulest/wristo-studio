# Layer Control Spacing and Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the layer-entry control with the other external control offsets and enlarge the four expanded layer-action buttons.

**Architecture:** Keep the change inside the existing Fabric control factory. Export named layout constants so the spacing, visible size, font size, and touch target are explicit and unit-testable without changing other object controls.

**Tech Stack:** TypeScript, Fabric.js 6.7, Vitest

---

### Task 1: Adjust layer-control layout constants

**Files:**
- Modify: `src/utils/controlManager.ts`
- Modify: `src/utils/controlManager.test.ts`

- [ ] **Step 1: Write the failing layout test**

Extend `src/utils/controlManager.test.ts`:

```ts
import {
  applyLayerOrderControlsToObject,
  LAYER_ORDER_ENTRY_OFFSET,
  LAYER_ORDER_MENU_CONTROL_SIZE,
  LAYER_ORDER_MENU_FONT_SIZE,
  LAYER_ORDER_MENU_TOUCH_SIZE,
} from './controlManager'

it('uses the shared external offset and enlarged menu controls', () => {
  const target = { controls: {} as Record<string, any> }
  applyLayerOrderControlsToObject(target as any)

  expect(LAYER_ORDER_ENTRY_OFFSET).toBe(10)
  expect(LAYER_ORDER_MENU_CONTROL_SIZE).toBe(16)
  expect(LAYER_ORDER_MENU_FONT_SIZE).toBe(14)
  expect(LAYER_ORDER_MENU_TOUCH_SIZE).toBe(32)
  expect(target.controls.layerOrderControl.offsetX).toBe(10)
  expect(target.controls.layerOrderControl.offsetY).toBe(10)
  expect(target.controls.bringForwardControl.sizeX).toBe(16)
  expect(target.controls.bringForwardControl.sizeY).toBe(16)
  expect(target.controls.bringForwardControl.touchSizeX).toBe(32)
  expect(target.controls.bringForwardControl.touchSizeY).toBe(32)
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm run test:unit -- src/utils/controlManager.test.ts`

Expected: FAIL because the named sizing constants are not exported and the entry still uses a `20px` offset.

- [ ] **Step 3: Add named constants and use them in rendering**

Add these exports near the existing `offset` constant in `src/utils/controlManager.ts`:

```ts
export const LAYER_ORDER_ENTRY_OFFSET = 10
export const LAYER_ORDER_MENU_CONTROL_SIZE = 16
export const LAYER_ORDER_MENU_FONT_SIZE = 14
export const LAYER_ORDER_MENU_TOUCH_SIZE = 32

const LAYER_ORDER_MENU_RADIUS = LAYER_ORDER_MENU_CONTROL_SIZE / 2
```

Change the layer-entry control to:

```ts
offsetX: LAYER_ORDER_ENTRY_OFFSET,
offsetY: LAYER_ORDER_ENTRY_OFFSET,
```

For each of the four expanded controls, add:

```ts
sizeX: LAYER_ORDER_MENU_CONTROL_SIZE,
sizeY: LAYER_ORDER_MENU_CONTROL_SIZE,
touchSizeX: LAYER_ORDER_MENU_TOUCH_SIZE,
touchSizeY: LAYER_ORDER_MENU_TOUCH_SIZE,
```

Update `renderLayerGlyph` so expanded action renderers pass `LAYER_ORDER_MENU_RADIUS` and `LAYER_ORDER_MENU_FONT_SIZE`, while the entry keeps the existing default radius and font size. Do not change `runtimeOptions.size`, `cornerSize`, clone, delete, scale, rotate, or element-specific controls.

- [ ] **Step 4: Run focused and full verification**

Run: `npm run test:unit -- src/utils/controlManager.test.ts && npm run test:unit && npm run build && git diff --check`

Expected: the focused test passes, the full Vitest suite has zero failures, the production build exits 0, and `git diff --check` prints no errors.

- [ ] **Step 5: Commit the adjustment**

```bash
git add src/utils/controlManager.ts src/utils/controlManager.test.ts
git commit -m "adjust layer control spacing and sizing"
```
