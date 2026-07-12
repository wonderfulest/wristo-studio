# Ticks Dynamic Inset Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让任意缩放比例的 `tick12`、`tick60` 和 `romans` 控制点始终位于画布内侧 30px，并保证拖动钳制后的控制点不会引起尺寸跳变。

**Architecture:** 保留现有 `corner4Inset` 模式和 dial renderer 接入，仅在共享控制管理器中把固定偏移升级为 viewport 坐标钳制。该模式使用基于 pointer-down 位移增量的中心等比缩放处理器，并通过 Fabric 的 `wrapWithFireEvent` 保持既有 `scaling` 事件及 `scaleFactor` 同步链路。

**Tech Stack:** TypeScript、Fabric.js、Vitest、Vue 3、Vite

---

## 文件结构

- 修改 `src/utils/controlManager.ts`：新增动态位置处理器和无跳变中心缩放处理器。
- 修改 `src/utils/controlManager.test.ts`：覆盖 30px 动态钳制、普通控制模式隔离和增量缩放行为。
- 不修改 `src/elements/dials/common/dial.renderer.ts`：三类 ticks 已统一使用 `corner4Inset`。

### Task 1: 动态钳制控制点到画布安全区

**Files:**
- Modify: `src/utils/controlManager.ts`
- Test: `src/utils/controlManager.test.ts`

- [ ] **Step 1: 写出失败的位置测试**

把旧的固定 offset 断言替换为以下行为测试：

```ts
function getControlPosition(target: any, key: 'tl' | 'tr' | 'bl' | 'br', dim: Point) {
  const control = target.controls[key]
  return control.positionHandler(dim, [1, 0, 0, 1, 300, 300], target, control)
}

it('clamps oversized element controls to the 30px canvas safe area', () => {
  const target = createTarget('corner4Inset') as any
  target.canvas = { getWidth: () => 600, getHeight: () => 600 }
  applyControlsToObject(target)

  expect(INSET_CORNER_CONTROL_OFFSET).toBe(30)
  expect(getControlPosition(target, 'tl', new Point(800, 800))).toMatchObject({ x: 30, y: 30 })
  expect(getControlPosition(target, 'tr', new Point(800, 800))).toMatchObject({ x: 570, y: 30 })
  expect(getControlPosition(target, 'bl', new Point(800, 800))).toMatchObject({ x: 30, y: 570 })
  expect(getControlPosition(target, 'br', new Point(800, 800))).toMatchObject({ x: 570, y: 570 })
})

it('keeps inset controls on their real corners while they are inside the safe area', () => {
  const target = createTarget('corner4Inset') as any
  target.canvas = { getWidth: () => 600, getHeight: () => 600 }
  applyControlsToObject(target)

  expect(getControlPosition(target, 'tl', new Point(200, 200))).toMatchObject({ x: 200, y: 200 })
  expect(getControlPosition(target, 'br', new Point(200, 200))).toMatchObject({ x: 400, y: 400 })
})

it('does not clamp regular corner4 controls', () => {
  const target = createTarget('corner4') as any
  target.canvas = { getWidth: () => 600, getHeight: () => 600 }
  applyControlsToObject(target)

  expect(getControlPosition(target, 'tl', new Point(800, 800))).toMatchObject({ x: -100, y: -100 })
  expect(getControlPosition(target, 'br', new Point(800, 800))).toMatchObject({ x: 700, y: 700 })
})
```

测试文件顶部从 Fabric 导入 `Point`：

```ts
import { Point } from 'fabric'
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm run test:unit -- src/utils/controlManager.test.ts`

Expected: FAIL，因为常量仍为 12，且 `corner4Inset` 仍只应用固定 offset。

- [ ] **Step 3: 实现动态位置处理器**

在 `src/utils/controlManager.ts` 中把安全边距改为：

```ts
export const INSET_CORNER_CONTROL_OFFSET = 30
```

从 Fabric 增加 `Point` 导入，并加入：

```ts
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function insetCornerPositionHandler(
  dim: Point,
  finalMatrix: [number, number, number, number, number, number],
  fabricObject: FabricObject,
  control: Control,
): Point {
  const position = new Point(control.x * dim.x, control.y * dim.y).transform(finalMatrix)
  const canvas = fabricObject.canvas
  if (!canvas) return position

  const margin = INSET_CORNER_CONTROL_OFFSET
  return new Point(
    clamp(position.x, margin, canvas.getWidth() - margin),
    clamp(position.y, margin, canvas.getHeight() - margin),
  )
}
```

给 `cornerControls` 的四个 `Control` 仅在 `corner4Inset` 模式设置该 handler：

```ts
const positionHandler = mode === 'corner4Inset' ? insetCornerPositionHandler : undefined

// 每个 tl/tr/bl/br Control 配置中
positionHandler,
```

删除 `inset`、`negativeInset` 和四个控制点的固定 `offsetX/offsetY` 配置。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `npm run test:unit -- src/utils/controlManager.test.ts`

Expected: PASS，超大对象被钳制、小对象保持真实位置、普通 `corner4` 不受影响。

- [ ] **Step 5: 提交动态位置逻辑**

```bash
git add src/utils/controlManager.ts src/utils/controlManager.test.ts
git commit -m "动态限制 ticks 控制点位置"
```

### Task 2: 消除钳制控制点的缩放跳变

**Files:**
- Modify: `src/utils/controlManager.ts`
- Test: `src/utils/controlManager.test.ts`

- [ ] **Step 1: 写出失败的缩放测试**

新增 helper 和行为测试：

```ts
function createScaleTransform(target: any, corner: string) {
  return {
    target,
    corner,
    ex: 570,
    ey: 570,
    original: { scaleX: 2, scaleY: 2 },
    width: 600,
    height: 600,
  } as any
}

it('starts a clamped corner drag without changing the current scale', () => {
  const target = createTarget('corner4Inset') as any
  target.scaleX = 2
  target.scaleY = 2
  target.width = 600
  target.height = 600
  target.fire = vi.fn()
  target.canvas = { fire: vi.fn(), getWidth: () => 600, getHeight: () => 600 }
  applyControlsToObject(target)

  const changed = target.controls.br.actionHandler(
    {} as PointerEvent,
    createScaleTransform(target, 'br'),
    570,
    570,
  )

  expect(changed).toBe(false)
  expect(target.scaleX).toBe(2)
  expect(target.scaleY).toBe(2)
})

it('scales smoothly from the original size using diagonal drag distance', () => {
  const target = createTarget('corner4Inset') as any
  target.scaleX = 2
  target.scaleY = 2
  target.width = 600
  target.height = 600
  target.fire = vi.fn()
  target.canvas = { fire: vi.fn(), getWidth: () => 600, getHeight: () => 600 }
  applyControlsToObject(target)

  const changed = target.controls.br.actionHandler(
    {} as PointerEvent,
    createScaleTransform(target, 'br'),
    580,
    580,
  )

  expect(changed).toBe(true)
  expect(target.scaleX).toBeCloseTo(2.033333, 5)
  expect(target.scaleY).toBeCloseTo(2.033333, 5)
  expect(target.canvas.fire).toHaveBeenCalledWith('object:scaling', expect.any(Object))
  expect(target.fire).toHaveBeenCalledWith('scaling', expect.any(Object))
})
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm run test:unit -- src/utils/controlManager.test.ts`

Expected: FAIL，因为 `corner4Inset` 当前仍使用 Fabric 的绝对位置 `scalingEqually`。

- [ ] **Step 3: 实现增量中心缩放处理器**

在 `src/utils/controlManager.ts` 中加入：

```ts
const CORNER_DIRECTIONS: Record<string, Point> = {
  tl: new Point(-1, -1),
  tr: new Point(1, -1),
  bl: new Point(-1, 1),
  br: new Point(1, 1),
}

const scaleInsetCorner = controlsUtils.wrapWithFireEvent(
  'scaling',
  (_eventData, transform, x, y) => {
    const target = transform.target
    const direction = CORNER_DIRECTIONS[transform.corner]
    if (!direction) return false

    const originalScaleX = Number(transform.original.scaleX)
    const originalScaleY = Number(transform.original.scaleY)
    const halfDiagonal = Math.hypot(
      Number(transform.width) * originalScaleX,
      Number(transform.height) * originalScaleY,
    ) / 2
    if (!Number.isFinite(halfDiagonal) || halfDiagonal <= 0) return false

    const projectedDelta = (
      (x - transform.ex) * direction.x +
      (y - transform.ey) * direction.y
    ) / Math.SQRT2
    const minScale = Number(target.minScaleLimit || 0.01)
    const minRatio = Math.max(
      minScale / originalScaleX,
      minScale / originalScaleY,
    )
    const ratio = Math.max(minRatio, 1 + projectedDelta / halfDiagonal)
    const nextScaleX = originalScaleX * ratio
    const nextScaleY = originalScaleY * ratio
    const changed = target.scaleX !== nextScaleX || target.scaleY !== nextScaleY

    if (changed) {
      target.set({ scaleX: nextScaleX, scaleY: nextScaleY })
    }
    return changed
  },
)
```

在 `createControls` 中按模式选择 action handler：

```ts
const cornerScaleHandler =
  mode === 'corner4Inset' ? scaleInsetCorner : controlsUtils.scalingEqually

// 四个角的配置统一使用
actionHandler: cornerScaleHandler,
```

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `npm run test:unit -- src/utils/controlManager.test.ts`

Expected: PASS，起始点不改变比例，向右下拖动 10px 后比例从 2 平滑变为约 2.033333，并触发 Fabric scaling 事件。

- [ ] **Step 5: 提交无跳变缩放逻辑**

```bash
git add src/utils/controlManager.ts src/utils/controlManager.test.ts
git commit -m "避免 ticks 控制点缩放跳变"
```

### Task 3: 完整验证

**Files:**
- Verify: `src/utils/controlManager.ts`
- Verify: `src/utils/controlManager.test.ts`
- Verify: `src/elements/dials/common/dial.renderer.ts`

- [ ] **Step 1: 运行完整单元测试**

Run: `npm run test:unit`

Expected: 31 个测试文件全部通过，无失败测试。

- [ ] **Step 2: 运行生产构建**

Run: `npm run build`

Expected: exit code 0，TypeScript 检查与 Vite 生产构建成功。

- [ ] **Step 3: 检查差异质量和范围**

Run: `git diff --check && git status --short`

Expected: `git diff --check` 无输出；仅包含计划内的控制管理器和测试改动，以及实施前已有的 `package.json`、`package-lock.json`、`.nvmrc` 用户改动。

- [ ] **Step 4: 手动验收**

在 Studio 中把 `tick12`、`tick60`、`romans` 分别缩放到小于、等于和大于画布，确认：

```text
1. 控制点在对象未越界时跟随真实四角。
2. 控制点越界时停在画布内侧 30px。
3. 开始拖动时尺寸不跳变。
4. 向内、向外拖动均保持中心等比缩放。
5. 保存并重新加载后 scaleFactor 保持一致。
```
