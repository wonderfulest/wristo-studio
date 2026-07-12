# Canvas Layer Order Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lower-right layer-order control that expands four Fabric controls for bring-to-front, bring-forward, send-backward, and send-to-back operations.

**Architecture:** Keep layer movement authoritative in `layerManager.ts` and add a small pure state/helper module for menu visibility and boundary checks. `controlManager.ts` renders and handles the Fabric controls, while `canvasManager.ts` supplies history recording and clears transient menu state on selection changes. No layer-menu state is persisted.

**Tech Stack:** Vue 3, TypeScript, Fabric.js 6.7, Pinia history store, Vitest

---

## File map

- Create `src/utils/layerOrderControl.ts`: pure layer-position and expanded-menu state helpers.
- Create `src/utils/layerOrderControl.test.ts`: unit coverage for eligibility, boundary states, and expansion state.
- Modify `src/engine/managers/layerManager.ts`: return whether each reorder operation changed the stack.
- Create `src/engine/managers/layerManager.test.ts`: verify fixed-layer boundaries and no-op detection with a mocked canvas.
- Modify `src/utils/controlManager.ts`: render the layer entry and four expandable Fabric controls, then call the existing layer manager.
- Modify `src/engine/managers/canvasManager.ts`: connect successful control operations to history capture and clear transient state when selection changes.
- Modify `src/i18n.ts`: add English and Chinese labels for the five layer controls.

### Task 1: Add pure layer-control state helpers

**Files:**
- Create: `src/utils/layerOrderControl.ts`
- Create: `src/utils/layerOrderControl.test.ts`

- [ ] **Step 1: Write the failing unit tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearExpandedLayerOrderControl,
  getLayerOrderAvailability,
  isLayerOrderControlExpanded,
  isLayerOrderControlTarget,
  toggleExpandedLayerOrderControl,
} from './layerOrderControl'

describe('layerOrderControl', () => {
  beforeEach(() => clearExpandedLayerOrderControl())

  it('accepts only interactive ordinary elements', () => {
    expect(isLayerOrderControlTarget({ id: 'time', eleType: 'time' })).toBe(true)
    expect(isLayerOrderControlTarget({ id: 'bg', eleType: 'background' })).toBe(false)
    expect(isLayerOrderControlTarget({ id: 'global', eleType: 'global' })).toBe(false)
    expect(isLayerOrderControlTarget({ id: 'locked', eleType: 'time', locked: true })).toBe(false)
    expect(isLayerOrderControlTarget({ id: 'hidden', eleType: 'time', selectable: false })).toBe(false)
    expect(isLayerOrderControlTarget({ id: 'plain' })).toBe(false)
  })

  it('reports top and bottom availability among movable objects', () => {
    const objects = [
      { id: 'global', eleType: 'global' },
      { id: 'bg', eleType: 'background' },
      { id: 'a', eleType: 'time' },
      { id: 'b', eleType: 'date' },
      { id: 'c', eleType: 'weather' },
    ]

    expect(getLayerOrderAvailability(objects, objects[4])).toEqual({ canMoveUp: false, canMoveDown: true })
    expect(getLayerOrderAvailability(objects, objects[3])).toEqual({ canMoveUp: true, canMoveDown: true })
    expect(getLayerOrderAvailability(objects, objects[2])).toEqual({ canMoveUp: true, canMoveDown: false })
  })

  it('toggles one expanded target and clears it', () => {
    expect(toggleExpandedLayerOrderControl('a')).toBe(true)
    expect(isLayerOrderControlExpanded('a')).toBe(true)
    expect(toggleExpandedLayerOrderControl('a')).toBe(false)
    expect(toggleExpandedLayerOrderControl('b')).toBe(true)
    clearExpandedLayerOrderControl()
    expect(isLayerOrderControlExpanded('b')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm run test:unit -- src/utils/layerOrderControl.test.ts`

Expected: FAIL because `./layerOrderControl` does not exist.

- [ ] **Step 3: Implement the pure helpers**

```ts
type LayerLike = {
  id?: unknown
  eleType?: unknown
  locked?: boolean
  selectable?: boolean
  evented?: boolean
  hasControls?: boolean
}

let expandedTargetId: string | null = null

const isFixedLayer = (target: LayerLike): boolean => {
  const type = String(target.eleType ?? '')
  return type === 'global' || type === 'background'
}

export function isLayerOrderControlTarget(target: LayerLike | null | undefined): boolean {
  return Boolean(
    target?.id != null &&
      target.eleType &&
      !isFixedLayer(target) &&
      !target.locked &&
      target.selectable !== false &&
      target.evented !== false &&
      target.hasControls !== false,
  )
}

export function getLayerOrderAvailability(objects: LayerLike[], target: LayerLike) {
  const movable = objects.filter((item) => item.id != null && item.eleType && !isFixedLayer(item))
  const index = movable.indexOf(target)
  return {
    canMoveUp: index >= 0 && index < movable.length - 1,
    canMoveDown: index > 0,
  }
}

export function toggleExpandedLayerOrderControl(id: string): boolean {
  expandedTargetId = expandedTargetId === id ? null : id
  return expandedTargetId === id
}

export function isLayerOrderControlExpanded(id: string): boolean {
  return expandedTargetId === id
}

export function clearExpandedLayerOrderControl(): void {
  expandedTargetId = null
}
```

- [ ] **Step 4: Run the focused unit test**

Run: `npm run test:unit -- src/utils/layerOrderControl.test.ts`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit the helper and tests**

```bash
git add src/utils/layerOrderControl.ts src/utils/layerOrderControl.test.ts
git commit -m "add layer order control state"
```

### Task 2: Make layer-manager operations report real changes

**Files:**
- Modify: `src/engine/managers/layerManager.ts`
- Create: `src/engine/managers/layerManager.test.ts`

- [ ] **Step 1: Write focused tests for changed and unchanged moves**

Mock `useCanvasStore`, `useLayerStore`, and `getElementById`, then create a canvas whose `moveObjectTo` mutates its object array. Cover these assertions:

```ts
expect(bringToFront('middle')).toBe(true)
expect(objects.map((item) => item.id)).toEqual(['global', 'background', 'bottom', 'top', 'middle'])
expect(bringToFront('middle')).toBe(false)
expect(sendToBack('bottom')).toBe(false)
expect(sendBackward('bottom')).toBe(false)
expect(bringForward('top')).toBe(false)
expect(sendToBack('top')).toBe(true)
expect(objects.slice(0, 2).map((item) => item.id)).toEqual(['global', 'background'])
```

The fixture must use `global` and `background` as the first two objects and three movable objects named `bottom`, `middle`, and `top`.

- [ ] **Step 2: Run the test and verify the return-value assertions fail**

Run: `npm run test:unit -- src/engine/managers/layerManager.test.ts`

Expected: FAIL because reorder functions currently return `void`.

- [ ] **Step 3: Return `boolean` from all four reorder functions**

For each function, return `false` when the canvas, target, eligibility, or movement boundary prevents a change. After a successful move and render/sync, return `true`. Use the existing fixed-layer normalization and movement calls; do not add a second ordering implementation.

Required signatures:

```ts
export function bringToFront(id: string): boolean
export function sendToBack(id: string): boolean
export function bringForward(id: string): boolean
export function sendBackward(id: string): boolean
```

Before `bringObjectToFront`, compare the target index with `objects.length - 1`. Before `sendToBack`, compare it with `fixedCount`. The existing adjacent-move boundary checks provide the no-op result for forward/backward.

- [ ] **Step 4: Run manager tests and typecheck**

Run: `npm run test:unit -- src/engine/managers/layerManager.test.ts && npm run typecheck`

Expected: both commands exit 0.

- [ ] **Step 5: Commit the manager contract**

```bash
git add src/engine/managers/layerManager.ts src/engine/managers/layerManager.test.ts
git commit -m "report layer order changes"
```

### Task 3: Add the expandable Fabric controls

**Files:**
- Modify: `src/utils/controlManager.ts`
- Modify: `src/engine/managers/canvasManager.ts`

- [ ] **Step 1: Extend the control-manager callback contract**

Add this option and include it in the runtime option type:

```ts
onLayerOrderChange?: (target: FabricLikeObject, canvas: Canvas) => void
```

Import the four layer-manager operations and the helpers from `layerOrderControl.ts`. Define a `LayerOrderAction` union and one dispatcher:

```ts
type LayerOrderAction = 'front' | 'forward' | 'backward' | 'back'

function applyLayerOrderAction(target: FabricLikeObject, action: LayerOrderAction): boolean {
  const id = target.id == null ? '' : String(target.id)
  if (!id) return false
  if (action === 'front') return bringToFront(id)
  if (action === 'forward') return bringForward(id)
  if (action === 'backward') return sendBackward(id)
  return sendToBack(id)
}
```

- [ ] **Step 2: Add icon renderers with enabled and disabled styles**

Add canvas renderers for a stacked-layers entry icon plus four arrow/bar icons. Use the existing circle renderer for the background, `#0f6b68` for enabled glyphs, and `#94a3b8` for disabled glyphs. Each renderer must inspect the target canvas order through `getLayerOrderAvailability`; front/forward share `canMoveUp`, and backward/back share `canMoveDown`.

- [ ] **Step 3: Add the entry control outside the lower-right scale handle**

Add `layerOrderControl` to the default control set without replacing `br`:

```ts
layerOrderControl: new Control({
  x: 0.5,
  y: 0.5,
  offsetX: offset * 2,
  offsetY: offset * 2,
  cursorStyle: 'pointer',
  mouseUpHandler: (_eventData, transform) => {
    const target = transform.target as FabricLikeObject | undefined
    if (!isLayerOrderControlTarget(target) || !target?.canvas || target.id == null) return false
    toggleExpandedLayerOrderControl(String(target.id))
    target.canvas.requestRenderAll()
    return true
  },
  render: renderLayerOrderEntryControl,
})
```

Do not add this entry in `corner4` mode unless the element already receives the unified default control set; preserve line and other element-specific controls.

- [ ] **Step 4: Add four conditional menu controls**

Create controls named `bringToFrontControl`, `bringForwardControl`, `sendBackwardControl`, and `sendToBackControl`. Position them on the right edge with the same X offset as the entry and Y offsets `-60`, `-40`, `-20`, and `0` relative to the lower-right anchor. Their `getVisibility` callbacks must require `isLayerOrderControlExpanded(String(target.id))`.

Each `mouseUpHandler` must:

```ts
const changed = applyLayerOrderAction(target, action)
if (!changed || !target.canvas) return false
target.canvas.setActiveObject(target)
runtimeOptions.onLayerOrderChange?.(target, target.canvas)
target.canvas.requestRenderAll()
return true
```

Keep the menu expanded after a successful action. Disabled boundary actions return `false` and do not invoke the callback.

- [ ] **Step 5: Wire selection cleanup and history capture**

In `canvasManager.ts`, import `clearExpandedLayerOrderControl`. Add this callback to `applyControlManager`:

```ts
onLayerOrderChange: (_target, canvas) => {
  syncSelectionIdsFromCanvas(canvasStore, canvas as FabricCanvas)
  historyStore.saveState('layer:reorder', { captureConfig: true })
},
```

Call `clearExpandedLayerOrderControl()` before selection synchronization in `selection:updated` and `selection:cleared`. Add and use `getExpandedLayerOrderControlId(): string | null` so `selection:created` clears the menu only when the newly active object differs from the expanded target.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `npm run test:unit -- src/utils/layerOrderControl.test.ts src/engine/managers/layerManager.test.ts && npm run typecheck`

Expected: all focused tests pass and typecheck exits 0.

- [ ] **Step 7: Commit the Fabric control integration**

```bash
git add src/utils/controlManager.ts src/engine/managers/canvasManager.ts
git commit -m "add canvas layer order controls"
```

### Task 4: Verify the complete editor flow

**Files:**
- Modify: `src/i18n.ts`
- Modify: `src/engine/managers/canvasManager.ts`

- [ ] **Step 1: Add user-facing control labels**

Add matching English and Chinese keys under the existing canvas-control section:

```ts
'canvasControls.layerOrder': 'Layer Order',
'canvasControls.bringToFront': 'Bring to Front',
'canvasControls.bringForward': 'Bring Forward',
'canvasControls.sendBackward': 'Send Backward',
'canvasControls.sendToBack': 'Send to Back',
```

Chinese values are `图层顺序`、`置于顶层`、`上移一层`、`下移一层`、`置于底层`。

- [ ] **Step 2: Bridge Fabric control hover to a native canvas tooltip**

In `canvasManager.ts`, map Fabric's active control key (`target.__corner`) to these labels. On `mouse:move`, assign the matching label to `canvas.upperCanvasEl.title`; otherwise assign an empty string. Also clear the title on `mouse:out` and during manager disposal.

```ts
const LAYER_CONTROL_TITLES: Record<string, string> = {
  layerOrderControl: 'Layer Order',
  bringToFrontControl: 'Bring to Front',
  bringForwardControl: 'Bring Forward',
  sendBackwardControl: 'Send Backward',
  sendToBackControl: 'Send to Back',
}
```

- [ ] **Step 3: Run the complete unit suite**

Run: `npm run test:unit`

Expected: all Vitest suites pass.

- [ ] **Step 4: Run the production build and whitespace validation**

Run: `npm run build && git diff --check`

Expected: TypeScript and Vite production build pass; `git diff --check` prints no errors.

- [ ] **Step 5: Perform manual editor acceptance**

Run: `npm run dev`

Verify all of the following in one design containing overlapping elements:

- the lower-right scale handle still scales the selected element;
- the new external entry expands and collapses four controls upward;
- hovering each layer control shows the matching English tooltip;
- each enabled operation changes both overlap order and the left layer list;
- top and bottom boundary controls render disabled and create no undo entry;
- repeated forward/backward actions keep the target selected and menu expanded;
- clicking empty canvas, selecting another element, locking the element, or deleting it closes the menu;
- background, global, locked, multi-selection, and element-specific no-control states do not expose the entry;
- undo/redo restores each changed order;
- save, leave, and reopen preserves the final order through `config.orderIds`.

- [ ] **Step 6: Commit labels and tooltip behavior**

```bash
git add src/i18n.ts src/engine/managers/canvasManager.ts
git commit -m "add layer control labels"
```
