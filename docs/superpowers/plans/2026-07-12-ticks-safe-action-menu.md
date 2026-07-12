# Ticks Safe Action Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让任意缩放比例的 ticks 右下角 `•••` 操作入口及展开菜单始终完整位于画布内，同时保持普通元素菜单行为不变。

**Architecture:** 共享控制管理器继续创建同一组对象操作控件，但 `corner4Inset` 模式为入口和菜单项注入专用 position handler。入口跟随对象右下角并被限制到安全锚点；展开菜单基于该锚点向左、向上布局，现有可见性、渲染和点击 handler 不变。

**Tech Stack:** TypeScript、Fabric.js、Vitest、Vue 3、Vite

---

## 文件结构

- 修改 `src/utils/controlManager.ts`：让 `createLayerOrderControls` 接收 inset 模式，增加安全入口和菜单项位置处理器。
- 修改 `src/utils/controlManager.test.ts`：验证超大 ticks、小尺寸 ticks、展开菜单和普通元素的坐标契约。

### Task 1: 为 ticks 对象操作菜单增加安全定位

**Files:**
- Modify: `src/utils/controlManager.ts`
- Test: `src/utils/controlManager.test.ts`

- [ ] **Step 1: 写出失败测试**

在 `applyControlsToObject` 测试组增加通用位置 helper：

```ts
function getNamedControlPosition(target: any, key: string, dim: Point) {
  const control = target.controls[key]
  return control.positionHandler(dim, [1, 0, 0, 1, 300, 300], target, control)
}
```

增加以下测试：

```ts
it('keeps the oversized ticks action entry above the bottom-right resize control', () => {
  const target = createTarget('corner4Inset') as any
  target.canvas = { getWidth: () => 600, getHeight: () => 600 }
  applyControlsToObject(target)

  expect(getNamedControlPosition(target, 'layerOrderControl', new Point(800, 800)))
    .toMatchObject({ x: 570, y: 540 })
})

it('opens the oversized ticks action menu to the left and upward', () => {
  const target = createTarget('corner4Inset') as any
  target.canvas = { getWidth: () => 600, getHeight: () => 600 }
  applyControlsToObject(target)

  expect(getNamedControlPosition(target, 'sendToBackControl', new Point(800, 800)))
    .toMatchObject({ x: 498, y: 508 })
  expect(getNamedControlPosition(target, 'cloneActionControl', new Point(800, 800)))
    .toMatchObject({ x: 498, y: 348 })
})

it('keeps the ticks action entry attached while the object is inside the safe area', () => {
  const target = createTarget('corner4Inset') as any
  target.canvas = { getWidth: () => 600, getHeight: () => 600 }
  applyControlsToObject(target)

  expect(getNamedControlPosition(target, 'layerOrderControl', new Point(200, 200)))
    .toMatchObject({ x: 410, y: 410 })
})

it('keeps the regular action menu outside the object bottom-right corner', () => {
  const target = createTarget('corner4') as any
  target.canvas = { getWidth: () => 600, getHeight: () => 600 }
  applyControlsToObject(target)

  expect(getNamedControlPosition(target, 'layerOrderControl', new Point(800, 800)))
    .toMatchObject({ x: 710, y: 710 })
  expect(getNamedControlPosition(target, 'sendToBackControl', new Point(800, 800)))
    .toMatchObject({ x: 782, y: 678 })
})
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm run test:unit -- src/utils/controlManager.test.ts`

Expected: FAIL；`corner4Inset` 的入口仍为 `(710, 710)`，菜单仍位于对象外侧。

- [ ] **Step 3: 实现安全锚点与菜单位置处理器**

把 `ControlSetMode` 类型移动到 `createLayerOrderControls` 之前，并增加：

```ts
function getDefaultControlPosition(
  dim: Point,
  finalMatrix: TMat2D,
  control: Pick<Control, 'x' | 'y' | 'offsetX' | 'offsetY'>,
): Point {
  return new Point(
    control.x * dim.x + control.offsetX,
    control.y * dim.y + control.offsetY,
  ).transform(finalMatrix)
}

function getInsetActionAnchor(
  dim: Point,
  finalMatrix: TMat2D,
  fabricObject: FabricObject,
): Point {
  const position = getDefaultControlPosition(dim, finalMatrix, {
    x: 0.5,
    y: 0.5,
    offsetX: LAYER_ORDER_ENTRY_OFFSET,
    offsetY: LAYER_ORDER_ENTRY_OFFSET,
  })
  const canvas = fabricObject.canvas
  if (!canvas) return position

  const margin = INSET_CORNER_CONTROL_OFFSET
  return new Point(
    clamp(position.x, margin, canvas.getWidth() - margin),
    clamp(position.y, margin, canvas.getHeight() - margin * 2),
  )
}

function insetActionEntryPositionHandler(
  dim: Point,
  finalMatrix: TMat2D,
  fabricObject: FabricObject,
): Point {
  return getInsetActionAnchor(dim, finalMatrix, fabricObject)
}

function createInsetActionItemPositionHandler(index: number) {
  return (
    dim: Point,
    finalMatrix: TMat2D,
    fabricObject: FabricObject,
  ): Point => {
    const anchor = getInsetActionAnchor(dim, finalMatrix, fabricObject)
    const canvas = fabricObject.canvas
    const itemStep = OBJECT_ACTION_MENU_HEIGHT + OBJECT_ACTION_MENU_GAP
    const distanceFromBottom = OBJECT_ACTIONS.length - 1 - index
    const position = new Point(
      anchor.x - OBJECT_ACTION_MENU_WIDTH / 2,
      anchor.y - itemStep * (distanceFromBottom + 1),
    )
    if (!canvas) return position

    const margin = INSET_CORNER_CONTROL_OFFSET
    return new Point(
      clamp(
        position.x,
        margin + OBJECT_ACTION_MENU_WIDTH / 2,
        canvas.getWidth() - margin - OBJECT_ACTION_MENU_WIDTH / 2,
      ),
      clamp(
        position.y,
        margin + OBJECT_ACTION_MENU_HEIGHT / 2,
        canvas.getHeight() - margin - OBJECT_ACTION_MENU_HEIGHT / 2,
      ),
    )
  }
}
```

调整创建函数：

```ts
function createLayerOrderControls(mode: ControlSetMode = 'default'): Record<string, Control> {
  const useInsetMenu = mode === 'corner4Inset'
```

入口 Control 增加：

```ts
positionHandler: useInsetMenu
  ? insetActionEntryPositionHandler
  : Control.prototype.positionHandler,
```

每个菜单项 Control 增加：

```ts
positionHandler: useInsetMenu
  ? createInsetActionItemPositionHandler(index)
  : Control.prototype.positionHandler,
```

最后让 `createControls` 传递模式：

```ts
const layerOrderControls = createLayerOrderControls(mode)
```

`applyLayerOrderControlsToObject` 继续调用无参数的 `createLayerOrderControls()`，因此普通元素保持默认行为。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `npm run test:unit -- src/utils/controlManager.test.ts`

Expected: PASS；ticks 入口为 `(570, 540)`，菜单中心 X 为 498 并向上排列，普通元素坐标不变。

- [ ] **Step 5: 提交功能**

```bash
git add src/utils/controlManager.ts src/utils/controlManager.test.ts
git commit -m "保持 ticks 操作菜单可见"
```

### Task 2: 完整验证

**Files:**
- Verify: `src/utils/controlManager.ts`
- Verify: `src/utils/controlManager.test.ts`

- [ ] **Step 1: 运行完整单元测试**

Run: `npm run test:unit`

Expected: 31 个测试文件全部通过，无失败测试。

- [ ] **Step 2: 运行生产构建**

Run: `npm run build`

Expected: exit code 0，TypeScript 检查与 Vite 构建成功。

- [ ] **Step 3: 检查差异**

Run: `git diff --check && git status --short`

Expected: `git diff --check` 无输出；只包含控制管理器和测试改动，以及主工作区实施前已有的 package 文件与 `.nvmrc` 改动。

- [ ] **Step 4: 手动验收**

在 Studio 中将 `tick12`、`tick60`、`romans` 放大到超出画布，确认：

```text
1. 右下角 ••• 入口显示在 br 缩放点上方。
2. 点击入口后六个操作按钮向左、向上完整展开。
3. Clone、Delete、Bring to Front、Bring Forward、Send Backward、Send to Back 均可点击。
4. 缩小 ticks 后，入口重新跟随对象右下角。
5. 普通元素的对象操作菜单位置没有变化。
```
