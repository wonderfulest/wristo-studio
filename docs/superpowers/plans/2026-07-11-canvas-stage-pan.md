# Canvas Stage Pan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Studio 中允许用户从表盘实际轮廓外按下并立即拖动整个画布舞台，同时保持元素编辑、标尺、设备外框和素材落点正确。

**Architecture:** 使用 `Design.vue` 管理瞬时平移状态和 Pointer Events，并通过 CSS `translate3d` 移动包含 Fabric Canvas、表盘底层和设备外框的整个舞台。命中检测和边界限制放入纯 TypeScript 工具并使用 Node 原生测试覆盖；Fabric 仅在 DOM 平移后刷新偏移，不修改对象坐标或历史。

**Tech Stack:** Vue 3 Composition API、TypeScript、Fabric.js 6.7、Node.js `node:test`、Vite

---

## 文件结构

- 新建 `src/utils/canvasPan.ts`：纯函数，负责表盘轮廓命中检测和画布平移边界限制。
- 新建 `tests/canvasPan.test.ts`：使用 Node 原生测试覆盖圆形、矩形和边界限制。
- 修改 `package.json`：增加独立的画布平移测试命令，不引入新依赖。
- 修改 `src/views/Design.vue`：持有平移状态、处理 Pointer Events、移动整个舞台并协调标尺/Fabric 刷新。
- 修改 `src/views/Canvas.vue`：暴露清除选择和同步 Fabric DOM 偏移的方法。
- 修改 `src/components/canvas/CanvasRulers.vue`：从明确的 `canvas-stage` 读取位置，并暴露刷新入口。
- 修改 `src/engine/managers/canvasManager.ts`：移除没有实际拖动行为的空格键光标状态及歧义 DOM 查询。

### Task 1: 画布平移几何函数

**Files:**
- Create: `tests/canvasPan.test.ts`
- Create: `src/utils/canvasPan.ts`
- Modify: `package.json`

- [ ] **Step 1: 写入命中检测和边界限制的失败测试**

新建 `tests/canvasPan.test.ts`：

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampCanvasPanOffset,
  isPointOutsideWatchFace,
} from '../src/utils/canvasPan.ts'

test('round watch face treats transparent square corners as pannable', () => {
  const faceRect = { left: 100, top: 100, width: 200, height: 200 }

  assert.equal(isPointOutsideWatchFace({ x: 200, y: 200 }, faceRect, true), false)
  assert.equal(isPointOutsideWatchFace({ x: 200, y: 100 }, faceRect, true), false)
  assert.equal(isPointOutsideWatchFace({ x: 100, y: 100 }, faceRect, true), true)
})

test('rectangular watch face only pans outside its bounds', () => {
  const faceRect = { left: 100, top: 80, width: 240, height: 160 }

  assert.equal(isPointOutsideWatchFace({ x: 100, y: 80 }, faceRect, false), false)
  assert.equal(isPointOutsideWatchFace({ x: 340, y: 240 }, faceRect, false), false)
  assert.equal(isPointOutsideWatchFace({ x: 99, y: 160 }, faceRect, false), true)
  assert.equal(isPointOutsideWatchFace({ x: 220, y: 241 }, faceRect, false), true)
})

test('pan offset keeps the configured amount of the stage visible', () => {
  const stageBaseRect = { left: 100, top: 80, width: 200, height: 200 }
  const workspaceRect = { left: 0, top: 0, width: 500, height: 400 }

  assert.deepEqual(
    clampCanvasPanOffset({ x: -500, y: -500 }, stageBaseRect, workspaceRect, 64),
    { x: -236, y: -216 },
  )
  assert.deepEqual(
    clampCanvasPanOffset({ x: 500, y: 500 }, stageBaseRect, workspaceRect, 64),
    { x: 336, y: 256 },
  )
  assert.deepEqual(
    clampCanvasPanOffset({ x: 20, y: -30 }, stageBaseRect, workspaceRect, 64),
    { x: 20, y: -30 },
  )
})
```

在 `package.json` 的 `scripts` 中加入：

```json
"test:canvas-pan": "node --experimental-strip-types --test tests/canvasPan.test.ts"
```

- [ ] **Step 2: 运行测试并确认因实现缺失而失败**

Run: `npm run test:canvas-pan`

Expected: FAIL，错误包含 `Cannot find module .../src/utils/canvasPan.ts`。

- [ ] **Step 3: 实现纯几何函数**

新建 `src/utils/canvasPan.ts`：

```ts
export interface CanvasPanPoint {
  x: number
  y: number
}

export interface CanvasPanRect {
  left: number
  top: number
  width: number
  height: number
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export function isPointOutsideWatchFace(
  point: CanvasPanPoint,
  faceRect: CanvasPanRect,
  isRound: boolean,
): boolean {
  const width = Math.max(0, faceRect.width)
  const height = Math.max(0, faceRect.height)
  if (width === 0 || height === 0) return true

  const right = faceRect.left + width
  const bottom = faceRect.top + height
  if (!isRound) {
    return point.x < faceRect.left || point.x > right || point.y < faceRect.top || point.y > bottom
  }

  const centerX = faceRect.left + width / 2
  const centerY = faceRect.top + height / 2
  const radius = Math.min(width, height) / 2
  const deltaX = point.x - centerX
  const deltaY = point.y - centerY
  return deltaX * deltaX + deltaY * deltaY > radius * radius
}

export function clampCanvasPanOffset(
  desiredOffset: CanvasPanPoint,
  stageBaseRect: CanvasPanRect,
  workspaceRect: CanvasPanRect,
  minimumVisible = 64,
): CanvasPanPoint {
  const stageWidth = Math.max(0, stageBaseRect.width)
  const stageHeight = Math.max(0, stageBaseRect.height)
  const workspaceWidth = Math.max(0, workspaceRect.width)
  const workspaceHeight = Math.max(0, workspaceRect.height)
  const visibleX = Math.min(Math.max(0, minimumVisible), stageWidth, workspaceWidth)
  const visibleY = Math.min(Math.max(0, minimumVisible), stageHeight, workspaceHeight)

  const minX = workspaceRect.left + visibleX - (stageBaseRect.left + stageWidth)
  const maxX = workspaceRect.left + workspaceWidth - visibleX - stageBaseRect.left
  const minY = workspaceRect.top + visibleY - (stageBaseRect.top + stageHeight)
  const maxY = workspaceRect.top + workspaceHeight - visibleY - stageBaseRect.top

  return {
    x: clamp(desiredOffset.x, Math.min(minX, maxX), Math.max(minX, maxX)),
    y: clamp(desiredOffset.y, Math.min(minY, maxY), Math.max(minY, maxY)),
  }
}
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `npm run test:canvas-pan`

Expected: PASS，3 个测试全部通过。

- [ ] **Step 5: 提交纯函数和测试**

```bash
git add package.json src/utils/canvasPan.ts tests/canvasPan.test.ts
git commit -m "test: cover canvas stage panning geometry"
```

### Task 2: 画布和标尺同步入口

**Files:**
- Modify: `src/views/Canvas.vue:151-171,334-344`
- Modify: `src/components/canvas/CanvasRulers.vue:113-135,250-258`
- Modify: `src/engine/managers/canvasManager.ts:21-24,262-310,318-331`

- [ ] **Step 1: 暴露 Canvas 选择清理与 DOM 偏移同步方法**

在 `Canvas.vue` 的 `defineExpose` 中加入现有 `clearCanvasSelection`，并新增 Fabric 偏移同步：

```ts
const syncCanvasOffset = () => {
  baseStore.canvas?.calcOffset?.()
  baseStore.canvas?.requestRenderAll?.()
}

defineExpose({
  zoomIn: () => zoomManager?.zoomIn(),
  zoomOut: () => zoomManager?.zoomOut(),
  resetZoom: () => zoomManager?.resetZoom(),
  updateZoom: () => zoomManager?.updateZoom(),
  undo: () => historyManager.undo(),
  redo: () => historyManager.redo(),
  canUndo: () => historyManager.canUndo(),
  canRedo: () => historyManager.canRedo(),
  clearSelection: clearCanvasSelection,
  syncCanvasOffset,
})
```

- [ ] **Step 2: 让标尺读取明确的舞台容器并暴露刷新方法**

在 `CanvasRulers.vue` 的 `update()` 中，把：

```ts
const canvasContainer = document.querySelector('.canvas-container') as HTMLElement | null
```

替换为：

```ts
const canvasStage = document.querySelector('.canvas-stage') as HTMLElement | null
```

同一函数后续统一使用 `canvasStage.getBoundingClientRect()`；`onDblclick()` 的两处容器查询也做相同替换。脚本末尾加入：

```ts
defineExpose({
  refresh: update,
})
```

- [ ] **Step 3: 删除误导性的空格键状态和歧义容器初始化**

从 `canvasManager.ts` 删除以下模块状态：

```ts
let keydownHandler: ((e: KeyboardEvent) => void) | null = null
let keyupHandler: ((e: KeyboardEvent) => void) | null = null
let isSpacePressed = false
```

删除 `initCanvasManager()` 中“键盘空格拖动画布”到两个键盘监听注册的整段代码，并删除通过 `document.querySelector('.canvas-container')` 设置 transform 的初始化段。`disposeCanvasManager()` 只保留 emitter 清理和 `fabricCanvas = null`，不再移除不存在的键盘监听。

- [ ] **Step 4: 运行类型检查**

Run: `npm run typecheck`

Expected: PASS，无 TypeScript 错误。

- [ ] **Step 5: 提交同步入口与旧逻辑清理**

```bash
git add src/views/Canvas.vue src/components/canvas/CanvasRulers.vue src/engine/managers/canvasManager.ts
git commit -m "refactor: prepare canvas stage panning"
```

### Task 3: 工作区 Pointer Events 与整体舞台平移

**Files:**
- Modify: `src/views/Design.vue:20-28,61-139,241-314,754-790,799-869,916-965`

- [ ] **Step 1: 修改模板，使工作区管理 Pointer Events**

将中间画布区域改为：

```vue
<div
  ref="centerAreaRef"
  class="center-area"
  :class="{
    'is-canvas-pan-ready': isCanvasPanReady,
    'is-canvas-panning': isCanvasPanning,
  }"
  @pointerdown.capture="handleCanvasPanPointerDown"
  @pointermove="handleCanvasPanPointerMove"
  @pointerup="handleCanvasPanPointerEnd"
  @pointercancel="handleCanvasPanPointerEnd"
  @lostpointercapture="handleCanvasPanPointerEnd"
  @pointerleave="handleCanvasPanPointerLeave"
>
  <div ref="canvasStageRef" class="canvas-stage" :style="canvasStageStyle">
    <CanvasView ref="canvasRef" />
  </div>
  <CanvasRulers
    ref="canvasRulersRef"
    :watch-size="designStore.designSpec.width"
    :ruler-offset="RULER_OFFSET"
  />
  <HistoryControls class="history-controls-anchor" :canvas-ref="canvasRef" />
  <TimeSimulatorPanel v-if="editorStore.showTimeSimulator" />
</div>
```

- [ ] **Step 2: 增加平移状态、命中检测和边界限制**

在 `Design.vue` 中导入纯函数和类型：

```ts
import {
  clampCanvasPanOffset,
  isPointOutsideWatchFace,
  type CanvasPanPoint,
  type CanvasPanRect,
} from '@/utils/canvasPan'
```

在现有组件引用旁加入：

```ts
const centerAreaRef = ref<HTMLElement | null>(null)
const canvasStageRef = ref<HTMLElement | null>(null)
const canvasRulersRef = ref<InstanceType<typeof CanvasRulers> | null>(null)
const panOffset = ref<CanvasPanPoint>({ x: 0, y: 0 })
const isCanvasPanning = ref(false)
const isCanvasPanReady = ref(false)

const RULER_OFFSET = 40
const MINIMUM_VISIBLE_STAGE = 64
const PAN_EXCLUDED_SELECTOR = [
  '.ruler-horizontal',
  '.ruler-vertical',
  '.ruler-corner',
  '.history-controls-anchor',
  '.time-simulator-panel',
  'button',
  'input',
  'select',
  'textarea',
  'a',
  '[role="button"]',
  '[role="slider"]',
].join(',')

type CanvasPanSession = {
  pointerId: number
  startClientX: number
  startClientY: number
  startOffset: CanvasPanPoint
  stageBaseRect: CanvasPanRect
}

let canvasPanSession: CanvasPanSession | null = null
let canvasPanFrame: number | null = null

const canvasStageStyle = computed(() => ({
  transform: `translate3d(${panOffset.value.x}px, ${panOffset.value.y}px, 0)`,
}))
```

增加以下辅助函数：

```ts
const toCanvasPanRect = (rect: DOMRect): CanvasPanRect => ({
  left: rect.left,
  top: rect.top,
  width: rect.width,
  height: rect.height,
})

const getWorkspaceRect = (): CanvasPanRect | null => {
  const rect = centerAreaRef.value?.getBoundingClientRect()
  if (!rect) return null
  return {
    left: rect.left + RULER_OFFSET,
    top: rect.top + RULER_OFFSET,
    width: Math.max(0, rect.width - RULER_OFFSET),
    height: Math.max(0, rect.height - RULER_OFFSET),
  }
}

const getStageBaseRect = (): CanvasPanRect | null => {
  const rect = canvasStageRef.value?.getBoundingClientRect()
  if (!rect) return null
  return {
    left: rect.left - panOffset.value.x,
    top: rect.top - panOffset.value.y,
    width: rect.width,
    height: rect.height,
  }
}

const isPannablePointerLocation = (event: PointerEvent): boolean => {
  const target = event.target as HTMLElement | null
  if (!target || target.closest(PAN_EXCLUDED_SELECTOR)) return false

  const upperCanvas = baseStore.canvas?.upperCanvasEl as HTMLCanvasElement | undefined
  const faceRect = upperCanvas?.getBoundingClientRect()
  if (!faceRect || faceRect.width <= 0 || faceRect.height <= 0) {
    return Boolean(canvasStageRef.value)
  }

  return isPointOutsideWatchFace(
    { x: event.clientX, y: event.clientY },
    toCanvasPanRect(faceRect),
    designStore.designSpec.width === designStore.designSpec.height,
  )
}

const scheduleCanvasViewportSync = (): void => {
  if (canvasPanFrame != null) return
  canvasPanFrame = window.requestAnimationFrame(() => {
    canvasPanFrame = null
    canvasRef.value?.syncCanvasOffset?.()
    canvasRulersRef.value?.refresh?.()
  })
}

const constrainPanOffset = (stageBaseRect = getStageBaseRect()): void => {
  const workspaceRect = getWorkspaceRect()
  if (!stageBaseRect || !workspaceRect) return
  panOffset.value = clampCanvasPanOffset(
    panOffset.value,
    stageBaseRect,
    workspaceRect,
    MINIMUM_VISIBLE_STAGE,
  )
  scheduleCanvasViewportSync()
}
```

- [ ] **Step 3: 实现完整 Pointer Events 生命周期**

在上述辅助函数后加入：

```ts
const handleCanvasPanPointerDown = (event: PointerEvent): void => {
  if (!event.isPrimary || event.button !== 0 || !isPannablePointerLocation(event)) return

  const stageBaseRect = getStageBaseRect()
  if (!stageBaseRect) return

  canvasPanSession = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startOffset: { ...panOffset.value },
    stageBaseRect,
  }
  isCanvasPanning.value = true
  isCanvasPanReady.value = false
  canvasRef.value?.clearSelection?.()
  centerAreaRef.value?.setPointerCapture?.(event.pointerId)
  event.preventDefault()
  event.stopPropagation()
}

const handleCanvasPanPointerMove = (event: PointerEvent): void => {
  if (!canvasPanSession) {
    isCanvasPanReady.value = event.isPrimary && isPannablePointerLocation(event)
    return
  }
  if (event.pointerId !== canvasPanSession.pointerId) return

  const workspaceRect = getWorkspaceRect()
  if (!workspaceRect) return
  const desiredOffset = {
    x: canvasPanSession.startOffset.x + event.clientX - canvasPanSession.startClientX,
    y: canvasPanSession.startOffset.y + event.clientY - canvasPanSession.startClientY,
  }
  panOffset.value = clampCanvasPanOffset(
    desiredOffset,
    canvasPanSession.stageBaseRect,
    workspaceRect,
    MINIMUM_VISIBLE_STAGE,
  )
  scheduleCanvasViewportSync()
  event.preventDefault()
  event.stopPropagation()
}

const finishCanvasPan = (pointerId?: number): void => {
  const session = canvasPanSession
  if (!session || (pointerId !== undefined && pointerId !== session.pointerId)) return
  canvasPanSession = null
  isCanvasPanning.value = false
  isCanvasPanReady.value = false

  const centerArea = centerAreaRef.value
  if (centerArea?.hasPointerCapture?.(session.pointerId)) {
    centerArea.releasePointerCapture(session.pointerId)
  }
  scheduleCanvasViewportSync()
}

const handleCanvasPanPointerEnd = (event: PointerEvent): void => {
  finishCanvasPan(event.pointerId)
}

const handleCanvasPanPointerLeave = (): void => {
  if (!canvasPanSession) isCanvasPanReady.value = false
}
```

增加布局变化后的重新限制：

```ts
watch(
  () => [
    editorStore.zoomLevel,
    designStore.designSpec.width,
    designStore.designSpec.height,
    leftPanelWidth.value,
    rightPanelWidth.value,
    viewportWidth.value,
  ],
  () => {
    void nextTick(() => constrainPanOffset())
  },
  { flush: 'post' },
)
```

在 `onMounted()` 末尾执行：

```ts
void nextTick(() => constrainPanOffset())
```

在 `onBeforeUnmount()` 开头加入：

```ts
finishCanvasPan()
if (canvasPanFrame != null) {
  window.cancelAnimationFrame(canvasPanFrame)
  canvasPanFrame = null
}
```

- [ ] **Step 4: 修改舞台和拖动光标样式**

把 `Design.vue` 中属于外层模板的 `.canvas-container` 选择器改为 `.canvas-stage`，并保持原有 margin。为舞台和工作区加入：

```css
.canvas-stage {
  position: relative;
  z-index: var(--studio-z-base);
  margin: 40px 0 0 40px;
  background: transparent;
  will-change: transform;
  transform-origin: center;
}

.center-area {
  touch-action: none;
}

.center-area.is-canvas-pan-ready,
.center-area.is-canvas-pan-ready * {
  cursor: grab !important;
}

.center-area.is-canvas-panning,
.center-area.is-canvas-panning * {
  cursor: grabbing !important;
}
```

把针对外层舞台中 Canvas 的父选择器同步改为 `.center-area .canvas-stage canvas`、`.center-area .canvas-stage .lower-canvas` 和 `.center-area .canvas-stage .upper-canvas`。

- [ ] **Step 5: 运行几何测试和类型检查**

Run: `npm run test:canvas-pan && npm run typecheck`

Expected: PASS；3 个几何测试通过且 TypeScript 无错误。

- [ ] **Step 6: 提交工作区拖动实现**

```bash
git add src/views/Design.vue
git commit -m "feat: drag canvas from outside watch face"
```

### Task 4: 生产构建与交互验证

**Files:**
- Verify: `src/views/Design.vue`
- Verify: `src/views/Canvas.vue`
- Verify: `src/components/canvas/CanvasRulers.vue`
- Verify: `src/utils/canvasPan.ts`

- [ ] **Step 1: 运行生产构建**

Run: `npm run build`

Expected: PASS，`vue-tsc --noEmit` 和 Vite production build 均成功。

- [ ] **Step 2: 检查补丁格式和提交范围**

Run: `git diff --check HEAD~3..HEAD`

Expected: 无输出。

Run: `git status --short`

Expected: 仅显示任务开始前已经存在的 Goal Bar、Goal Arc、color picker、i18n 和 goal 类型修改；本功能文件没有未提交变更。

- [ ] **Step 3: 在浏览器验证完整交互**

启动：`npm run dev`。

逐项验证：

1. 圆形表盘内部拖动元素，元素正常移动，舞台不移动。
2. 圆形表盘透明四角或工作区空白处按下，舞台立即移动。
3. 指针移出工作区后松开，拖动正常结束。
4. 启用设备外框后拖动，外框、黑色底层和 Fabric 内容保持对齐。
5. 先缩放再拖动、先拖动再缩放，视觉位置正确。
6. 启用标尺后拖动，标尺固定且刻度原点更新。
7. 平移后拖入一个 SVG 或 PNG，素材落点与指针一致。
8. 撤销一次，只撤销设计编辑，不撤销舞台平移。
9. 将舞台拖向四边，至少仍有 64px 可见且可再次抓取。
10. 使用触控主指针从表盘外部拖动，移动和结束行为与鼠标一致。
11. 保存或导出设计后重新进入页面，舞台恢复居中，设计元素坐标未包含视图偏移。

Expected: 十一项全部符合设计文档，控制台无新增异常。
