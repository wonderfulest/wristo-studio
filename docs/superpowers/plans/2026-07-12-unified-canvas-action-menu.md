# Unified Canvas Action Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate clone/delete corner controls and icon-only layer menu with one green lower-right entry that expands six labeled action pills.

**Architecture:** Keep all behavior in the existing Fabric control factory and reuse the current clone, delete, and layer-order handlers. Define the six menu items from one descriptor list so labels, colors, offsets, hit areas, action names, and rendering remain consistent without introducing a DOM overlay.

**Tech Stack:** TypeScript, Fabric.js 6.7, Vitest

---

## File map

- Modify `src/utils/controlManager.ts`: green entry rendering, labeled pill rendering, six action controls, removal of standalone clone/delete controls.
- Modify `src/utils/controlManager.test.ts`: structural and sizing coverage for the unified menu.
- Modify `src/utils/layerOrderControl.ts`: rename the entry tooltip to `Object Actions` and add clone/delete menu titles.
- Modify `src/utils/layerOrderControl.test.ts`: tooltip-title coverage.
- Modify `src/i18n.ts`: add `Object Actions`, `Clone`, and `Delete` canvas-control labels.

### Task 1: Define the unified menu contract

**Files:**
- Modify: `src/utils/controlManager.test.ts`
- Modify: `src/utils/layerOrderControl.test.ts`
- Modify: `src/utils/layerOrderControl.ts`

- [ ] **Step 1: Write failing control-structure tests**

Extend `src/utils/controlManager.test.ts` with:

```ts
it('exposes one entry and six labeled menu actions without standalone corner actions', () => {
  const target = { controls: {} as Record<string, any> }
  applyLayerOrderControlsToObject(target as any)

  expect(target.controls.cloneControl).toBeUndefined()
  expect(target.controls.deleteControl).toBeUndefined()
  expect(target.controls.layerOrderControl.actionName).toBe('objectActions')
  expect(Object.keys(target.controls)).toEqual(expect.arrayContaining([
    'cloneActionControl',
    'deleteActionControl',
    'bringToFrontControl',
    'bringForwardControl',
    'sendBackwardControl',
    'sendToBackControl',
  ]))

  const menuControls = [
    target.controls.cloneActionControl,
    target.controls.deleteActionControl,
    target.controls.bringToFrontControl,
    target.controls.bringForwardControl,
    target.controls.sendBackwardControl,
    target.controls.sendToBackControl,
  ]
  expect(menuControls.every((control) => control.sizeX === 144)).toBe(true)
  expect(menuControls.every((control) => control.sizeY === 28)).toBe(true)
  expect(menuControls.every((control) => control.touchSizeX === 144)).toBe(true)
  expect(menuControls.every((control) => control.touchSizeY === 32)).toBe(true)
})
```

- [ ] **Step 2: Write failing title-map tests**

Extend `src/utils/layerOrderControl.test.ts`:

```ts
expect(getLayerOrderControlTitle('layerOrderControl')).toBe('Object Actions')
expect(getLayerOrderControlTitle('cloneActionControl')).toBe('Clone')
expect(getLayerOrderControlTitle('deleteActionControl')).toBe('Delete')
```

- [ ] **Step 3: Run both focused tests and verify failure**

Run: `npm run test:unit -- src/utils/controlManager.test.ts src/utils/layerOrderControl.test.ts`

Expected: FAIL because standalone corner controls still exist, the menu has only four icon controls, and the title map still returns `Layer Order`.

- [ ] **Step 4: Update the title map**

Change the title map in `src/utils/layerOrderControl.ts` to:

```ts
const LAYER_ORDER_CONTROL_TITLES: Record<string, string> = {
  layerOrderControl: 'Object Actions',
  cloneActionControl: 'Clone',
  deleteActionControl: 'Delete',
  bringToFrontControl: 'Bring to Front',
  bringForwardControl: 'Bring Forward',
  sendBackwardControl: 'Send Backward',
  sendToBackControl: 'Send to Back',
}
```

- [ ] **Step 5: Run the title-map test**

Run: `npm run test:unit -- src/utils/layerOrderControl.test.ts`

Expected: title-map tests pass while the control-structure test remains failing.

### Task 2: Render and handle six labeled Fabric action pills

**Files:**
- Modify: `src/utils/controlManager.ts`
- Modify: `src/utils/controlManager.test.ts`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Add explicit menu layout constants and descriptors**

In `src/utils/controlManager.ts`, replace the circular menu sizing constants with:

```ts
export const OBJECT_ACTION_MENU_WIDTH = 144
export const OBJECT_ACTION_MENU_HEIGHT = 28
export const OBJECT_ACTION_MENU_TOUCH_HEIGHT = 32
export const OBJECT_ACTION_MENU_GAP = 4
export const OBJECT_ACTION_MENU_OFFSET_X = LAYER_ORDER_ENTRY_OFFSET + OBJECT_ACTION_MENU_WIDTH / 2

type ObjectActionDescriptor = {
  key: string
  label: string
  glyph: string
  tone: 'primary' | 'danger'
}

const OBJECT_ACTIONS: ObjectActionDescriptor[] = [
  { key: 'cloneActionControl', label: 'Clone', glyph: '＋', tone: 'primary' },
  { key: 'deleteActionControl', label: 'Delete', glyph: '×', tone: 'danger' },
  { key: 'bringToFrontControl', label: 'Bring to Front', glyph: '⇈', tone: 'primary' },
  { key: 'bringForwardControl', label: 'Bring Forward', glyph: '↑', tone: 'primary' },
  { key: 'sendBackwardControl', label: 'Send Backward', glyph: '↓', tone: 'primary' },
  { key: 'sendToBackControl', label: 'Send to Back', glyph: '⇊', tone: 'primary' },
]
```

- [ ] **Step 2: Render the green entry and pill content**

Change `renderLayerOrderEntryControl` to draw a green filled circle using `runtimeOptions.cloneFill`, then draw the white actions glyph.

Add `renderObjectActionPill` that:

- draws a rounded `144 × 28` white background with the existing stroke;
- draws the glyph at the left inset;
- draws the English label left-aligned after the glyph;
- uses `#0f6b68` for normal enabled actions;
- uses `#ef4444` for `Delete`;
- uses `#94a3b8` for disabled layer actions;
- uses a `12px` sans-serif label and a `14px` bold glyph.

The renderer must receive the descriptor and current target, calculate enabled state only for the four layer actions, and keep clone/delete enabled for manageable targets.

- [ ] **Step 3: Build the six controls from the descriptor list**

In `createLayerOrderControls()`:

- keep `layerOrderControl` at the current `10px` lower-right offset;
- change its `actionName` to `objectActions`;
- create six menu controls with `sizeX/touchSizeX = 144`, `sizeY = 28`, and `touchSizeY = 32`;
- place pill centers at `OBJECT_ACTION_MENU_OFFSET_X`;
- place the bottom item `32px` above the entry center and place each earlier item another `32px` upward;
- bind `cloneActionControl.mouseUpHandler` to the existing `cloneHandler`;
- bind `deleteActionControl.mouseUpHandler` to the existing `deleteHandler`;
- keep the four layer actions bound to `createLayerActionHandler`;
- keep all six controls conditional on the existing expanded-state visibility.

Remove `cloneControl` and `deleteControl` from the default `base` controls. In `applyLayerOrderControlsToObject`, destructure those two legacy keys out of the current control map before merging the unified controls:

```ts
const {
  cloneControl: _legacyCloneControl,
  deleteControl: _legacyDeleteControl,
  ...currentControls
} = existingControls
target.controls = { ...currentControls, ...createLayerOrderControls() }
```

This guarantees already-created objects and custom-control elements also lose the two old corner entries. Do not remove or change the clone/delete handler implementations or their `CanvasManagerOptions` callbacks.

- [ ] **Step 4: Add localized labels**

In the English dictionary in `src/i18n.ts`, add:

```ts
'canvasControls.objectActions': 'Object Actions',
'canvasControls.clone': 'Clone',
'canvasControls.delete': 'Delete',
```

In the Chinese dictionary add `对象操作`、`克隆`、`删除`. Keep the existing four layer-action labels.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `npm run test:unit -- src/utils/controlManager.test.ts src/utils/layerOrderControl.test.ts && npm run typecheck`

Expected: focused tests pass and TypeScript exits 0.

- [ ] **Step 6: Run complete verification**

Run: `npm run test:unit && npm run build && git diff --check`

Expected: all Vitest suites pass, the production build exits 0, and whitespace validation prints no errors.

- [ ] **Step 7: Commit the unified menu**

```bash
git add src/utils/controlManager.ts src/utils/controlManager.test.ts src/utils/layerOrderControl.ts src/utils/layerOrderControl.test.ts src/i18n.ts
git commit -m "unify canvas element action menu"
```
