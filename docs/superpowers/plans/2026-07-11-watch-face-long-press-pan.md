# Watch Face Long-Press Canvas Pan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留表盘外部按下立即平移的同时，让用户在表盘空白、元素和 Fabric 控制点上按住 400ms 后拖动整个画布舞台，并确保快速移动仍执行原有元素编辑。

**Architecture:** Fabric Canvas 显式启用 Pointer Events，使 Studio 与 Fabric 共用同一指针事件链。`Design.vue` 在 document 捕获阶段管理长按等待状态并拦截 6px 内的抖动；长按生效时由 `Canvas.vue` 的集中适配器安全结束 Fabric 交互，再复用现有 DOM 舞台平移会话。阈值判断保持为纯函数并由 Node 原生测试覆盖。

**Tech Stack:** Vue 3 Composition API、TypeScript、Fabric.js 6.7、Pointer Events、Node.js `node:test`、Vite

---

## 文件结构

- 修改 `src/utils/canvasPan.ts`：定义 400ms/6px 规则，并提供相对按下起点的纯距离判断。
- 修改 `tests/canvasPan.test.mjs`：覆盖长按时长常量、6px 边界和对角线超限。
- 修改 `src/engine/managers/canvasManager.ts`：为 Fabric Canvas 启用官方 Pointer Events 事件链。
- 修改 `src/views/Canvas.vue`：集中封装 Fabric 长按接管收尾，阻止误触自定义控制点和 `object:modified`。
- 修改 `src/views/Design.vue`：分类立即平移/长按候选区域，管理 document 捕获监听、定时器和画布平移接管。

### Task 1: 长按阈值纯函数与边界测试

**Files:**
- Modify: `tests/canvasPan.test.mjs`
- Modify: `src/utils/canvasPan.ts`

- [ ] **Step 1: 写入 400ms 和 6px 边界的失败测试**

扩展 `tests/canvasPan.test.mjs` 的动态导入解构：

```js
const {
  CANVAS_LONG_PRESS_DELAY_MS,
  CANVAS_LONG_PRESS_TOLERANCE_PX,
  clampCanvasPanOffset,
  hasExceededCanvasLongPressTolerance,
  isPointOutsideWatchFace,
} = await import(compiledModuleUrl)
```

在现有三个测试后加入：

```js
test('canvas long press uses the agreed delay and movement tolerance', () => {
  assert.equal(CANVAS_LONG_PRESS_DELAY_MS, 400)
  assert.equal(CANVAS_LONG_PRESS_TOLERANCE_PX, 6)
})

test('long press tolerance is measured from the original pointer position', () => {
  const start = { x: 100, y: 100 }

  assert.equal(hasExceededCanvasLongPressTolerance(start, { x: 106, y: 100 }), false)
  assert.equal(hasExceededCanvasLongPressTolerance(start, { x: 100, y: 106.01 }), true)
  assert.equal(hasExceededCanvasLongPressTolerance(start, { x: 105, y: 104 }), true)
})
```

- [ ] **Step 2: 运行测试并确认新断言失败**

Run: `npm run test:canvas-pan`

Expected: FAIL；原有 3 个测试通过，新测试因常量和 `hasExceededCanvasLongPressTolerance` 尚未导出而失败。

- [ ] **Step 3: 实现最小阈值判断**

在 `src/utils/canvasPan.ts` 的接口定义后加入：

```ts
export const CANVAS_LONG_PRESS_DELAY_MS = 400
export const CANVAS_LONG_PRESS_TOLERANCE_PX = 6

export function hasExceededCanvasLongPressTolerance(
  start: CanvasPanPoint,
  current: CanvasPanPoint,
  tolerance = CANVAS_LONG_PRESS_TOLERANCE_PX,
): boolean {
  const safeTolerance = Math.max(0, tolerance)
  const deltaX = current.x - start.x
  const deltaY = current.y - start.y
  return deltaX * deltaX + deltaY * deltaY > safeTolerance * safeTolerance
}
```

- [ ] **Step 4: 运行测试并确认全部通过**

Run: `npm run test:canvas-pan`

Expected: PASS；5 个测试全部通过。

- [ ] **Step 5: 提交阈值与测试**

```bash
git add src/utils/canvasPan.ts tests/canvasPan.test.mjs
git commit -m "test: define canvas long-press thresholds"
```

### Task 2: Fabric Pointer Events 与安全交互收尾

**Files:**
- Modify: `src/engine/managers/canvasManager.ts:120-127`
- Modify: `src/views/Canvas.vue:334-351`

- [ ] **Step 1: 统一 Fabric 与 Studio 的 Pointer Events 事件链**

在 `src/engine/managers/canvasManager.ts` 创建 `Canvas` 的选项中加入 `enablePointerEvents: true`：

```ts
const canvas = new Canvas(canvasElement, {
  width: canvasWidth,
  height: canvasHeight,
  backgroundColor: 'transparent',
  centeredScaling: true,
  centeredRotation: true,
  controlsAboveOverlay: true,
  enablePointerEvents: true,
}) as FabricCanvas
```

Fabric 随后只注册 `pointerdown`、`pointermove` 和 `pointerup` 主事件链，不再额外注册兼容 Touch Events；不要增加并行 Mouse/Touch 监听。

- [ ] **Step 2: 添加不会执行控制点 mouseUpHandler 的取消事件构造器**

在 `src/views/Canvas.vue` 的 `syncCanvasOffset()` 前加入：

```ts
const createStagePanCancelEvent = (
  sourceEvent: PointerEvent,
  upperCanvas: HTMLCanvasElement,
): PointerEvent => {
  const rect = upperCanvas.getBoundingClientRect()
  return new PointerEvent('pointerup', {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: sourceEvent.pointerId,
    pointerType: sourceEvent.pointerType,
    isPrimary: sourceEvent.isPrimary,
    button: 0,
    buttons: 0,
    clientX: rect.left - Math.max(rect.width, 1) - 1,
    clientY: rect.top - Math.max(rect.height, 1) - 1,
    ctrlKey: sourceEvent.ctrlKey,
    shiftKey: sourceEvent.shiftKey,
    altKey: sourceEvent.altKey,
    metaKey: sourceEvent.metaKey,
  })
}
```

取消事件位于 Canvas 边界外，因此 Fabric 的 `findTarget()` 和 `findControl()` 不会重新命中克隆、删除或缩放控制点。

- [ ] **Step 3: 添加 Fabric 交互接管适配器**

紧接 `createStagePanCancelEvent()` 加入：

```ts
const cancelFabricInteractionForStagePan = (sourceEvent: PointerEvent): boolean => {
  const canvas = baseStore.canvas
  if (!canvas || !canvas.enablePointerEvents || typeof canvas._onMouseUp !== 'function') {
    return false
  }

  const transform = canvas._currentTransform
  if (transform?.actionPerformed) return false

  if (transform) {
    canvas.endCurrentTransform(sourceEvent)
    ;(transform.target as { __corner?: string }).__corner = undefined
  }

  canvas._onMouseUp(createStagePanCancelEvent(sourceEvent, canvas.upperCanvasEl))
  canvas.requestRenderAll?.()
  return true
}
```

`actionPerformed` 为 `true` 时返回 `false`，让 Fabric 继续完成已经开始的元素编辑；为 `false` 时 `endCurrentTransform()` 只做坐标收尾，不触发 `object:modified`。随后 `_onMouseUp()` 使用边界外事件清除框选状态和 document 级监听。

- [ ] **Step 4: 向 Design.vue 暴露接管方法**

在 `defineExpose()` 中加入：

```ts
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
  cancelFabricInteractionForStagePan,
})
```

- [ ] **Step 5: 运行类型检查和画布测试**

Run: `npm run typecheck && npm run test:canvas-pan`

Expected: PASS；TypeScript 无错误，5 个画布测试通过。

- [ ] **Step 6: 提交 Fabric 事件接管入口**

```bash
git add src/engine/managers/canvasManager.ts src/views/Canvas.vue
git commit -m "feat: add Fabric canvas pan handoff"
```

### Task 3: 表盘区域长按状态机

**Files:**
- Modify: `src/views/Design.vue:122-195,353-460,990-995`

- [ ] **Step 1: 导入长按规则**

扩展 `src/views/Design.vue` 的 `canvasPan` 导入：

```ts
import {
  CANVAS_LONG_PRESS_DELAY_MS,
  clampCanvasPanOffset,
  hasExceededCanvasLongPressTolerance,
  isPointOutsideWatchFace,
  type CanvasPanPoint,
  type CanvasPanRect,
} from '@/utils/canvasPan'
```

- [ ] **Step 2: 定义区域分类、等待会话和启动参数**

将现有 `CanvasPanSession` 类型和 `canvasPanSession` 状态扩展为：

```ts
type CanvasPanPointerRegion = 'excluded' | 'immediate' | 'long-press'

type CanvasPanSession = {
  pointerId: number
  startClientX: number
  startClientY: number
  startOffset: CanvasPanPoint
  stageBaseRect: CanvasPanRect
}

type CanvasLongPressSession = {
  pointerId: number
  startClientX: number
  startClientY: number
  lastClientX: number
  lastClientY: number
  sourceEvent: PointerEvent
  timerId: number
}

type StartCanvasPanOptions = {
  pointerId: number
  startClientX: number
  startClientY: number
  clearSelection: boolean
}

let canvasPanSession: CanvasPanSession | null = null
let canvasLongPressSession: CanvasLongPressSession | null = null
```

- [ ] **Step 3: 把布尔命中判断替换为三态区域分类**

用以下实现替换 `isPannablePointerLocation()`：

```ts
const getCanvasPanPointerRegion = (event: PointerEvent): CanvasPanPointerRegion => {
  const target = event.target as Element | null
  if (!target || target.closest(PAN_EXCLUDED_SELECTOR)) return 'excluded'

  const upperCanvas = baseStore.canvas?.upperCanvasEl as HTMLCanvasElement | undefined
  const faceRect = upperCanvas?.getBoundingClientRect()
  if (!faceRect || faceRect.width <= 0 || faceRect.height <= 0) {
    return canvasStageRef.value ? 'immediate' : 'excluded'
  }

  const point = { x: event.clientX, y: event.clientY }
  const canvasRect = toCanvasPanRect(faceRect)
  const isOutsideCanvasBounds = isPointOutsideWatchFace(point, canvasRect, false)
  if (!isOutsideCanvasBounds && baseStore.canvas?.findTarget?.(event)) {
    return 'long-press'
  }

  return isPointOutsideWatchFace(
    point,
    canvasRect,
    designStore.designSpec.width === designStore.designSpec.height,
  )
    ? 'immediate'
    : 'long-press'
}

const isImmediateCanvasPanPointerLocation = (event: PointerEvent): boolean =>
  getCanvasPanPointerRegion(event) === 'immediate'
```

该分类保持圆形表盘透明角落立即平移，同时把表盘内部以及方形 Canvas 范围内命中的元素/控制点归入长按候选。

- [ ] **Step 4: 抽取可复用的画布平移启动函数**

在 `constrainPanOffset()` 后加入：

```ts
const startCanvasPan = (options: StartCanvasPanOptions): boolean => {
  const stageBaseRect = getStageBaseRect()
  const centerArea = centerAreaRef.value
  if (!stageBaseRect || !centerArea || typeof centerArea.setPointerCapture !== 'function') {
    return false
  }

  try {
    centerArea.setPointerCapture(options.pointerId)
  } catch {
    return false
  }

  canvasPanSession = {
    pointerId: options.pointerId,
    startClientX: options.startClientX,
    startClientY: options.startClientY,
    startOffset: { ...panOffset.value },
    stageBaseRect,
  }
  isCanvasPanning.value = true
  isCanvasPanReady.value = false
  if (options.clearSelection) canvasRef.value?.clearSelection?.()
  return true
}
```

长按接管会传入最后指针位置和 `clearSelection: false`，因此舞台不跳动且保留元素选择；外部立即平移继续传入 `clearSelection: true`。

- [ ] **Step 5: 添加 document 捕获监听和长按生命周期**

紧接 `startCanvasPan()` 加入完整的等待逻辑：

```ts
function removeCanvasLongPressDocumentListeners(): void {
  document.removeEventListener('pointermove', handleCanvasLongPressDocumentMove, true)
  document.removeEventListener('pointerup', handleCanvasLongPressDocumentEnd, true)
  document.removeEventListener('pointercancel', handleCanvasLongPressDocumentCancel, true)
}

function clearCanvasLongPressSession(): CanvasLongPressSession | null {
  const session = canvasLongPressSession
  canvasLongPressSession = null
  if (session) window.clearTimeout(session.timerId)
  removeCanvasLongPressDocumentListeners()
  return session
}

function activateCanvasLongPress(expectedSession: CanvasLongPressSession): void {
  if (canvasLongPressSession !== expectedSession) return
  const session = clearCanvasLongPressSession()
  if (!session) return

  const didCancelFabric =
    canvasRef.value?.cancelFabricInteractionForStagePan?.(session.sourceEvent) === true
  if (!didCancelFabric) return

  startCanvasPan({
    pointerId: session.pointerId,
    startClientX: session.lastClientX,
    startClientY: session.lastClientY,
    clearSelection: false,
  })
}

function handleCanvasLongPressDocumentMove(event: PointerEvent): void {
  const session = canvasLongPressSession
  if (!session || event.pointerId !== session.pointerId) return

  session.lastClientX = event.clientX
  session.lastClientY = event.clientY
  const exceeded = hasExceededCanvasLongPressTolerance(
    { x: session.startClientX, y: session.startClientY },
    { x: event.clientX, y: event.clientY },
  )
  if (exceeded) {
    clearCanvasLongPressSession()
    isCanvasPanReady.value = false
    return
  }

  event.preventDefault()
  event.stopPropagation()
}

function handleCanvasLongPressDocumentEnd(event: PointerEvent): void {
  const session = canvasLongPressSession
  if (!session || event.pointerId !== session.pointerId) return
  clearCanvasLongPressSession()
}

function handleCanvasLongPressDocumentCancel(event: PointerEvent): void {
  const session = canvasLongPressSession
  if (!session || event.pointerId !== session.pointerId) return
  clearCanvasLongPressSession()
  canvasRef.value?.cancelFabricInteractionForStagePan?.(session.sourceEvent)
  event.preventDefault()
  event.stopPropagation()
}

const beginCanvasLongPress = (event: PointerEvent): void => {
  clearCanvasLongPressSession()
  const session: CanvasLongPressSession = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    lastClientX: event.clientX,
    lastClientY: event.clientY,
    sourceEvent: event,
    timerId: 0,
  }
  session.timerId = window.setTimeout(
    () => activateCanvasLongPress(session),
    CANVAS_LONG_PRESS_DELAY_MS,
  )
  canvasLongPressSession = session
  document.addEventListener('pointermove', handleCanvasLongPressDocumentMove, true)
  document.addEventListener('pointerup', handleCanvasLongPressDocumentEnd, true)
  document.addEventListener('pointercancel', handleCanvasLongPressDocumentCancel, true)
}
```

不要在等待阶段设置 Pointer Capture。这样 400ms 内松开时，真实 `pointerup` 和后续 `click`/`dblclick` 仍按原目标到达 Fabric；document 捕获监听负责处理指针移出工作区的情况。

- [ ] **Step 6: 替换按下、移动和结束处理器**

用以下处理器替换现有 `handleCanvasPanPointerDown()`、`handleCanvasPanPointerMove()` 和 `handleCanvasPanPointerEnd()`；保留现有 `finishCanvasPan()`：

```ts
const handleCanvasPanPointerDown = (event: PointerEvent): void => {
  if (!event.isPrimary || event.button !== 0 || canvasPanSession) return

  const region = getCanvasPanPointerRegion(event)
  if (region === 'long-press') {
    beginCanvasLongPress(event)
    return
  }
  if (region !== 'immediate') return

  const started = startCanvasPan({
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    clearSelection: true,
  })
  if (!started) return
  event.preventDefault()
  event.stopPropagation()
}

const handleCanvasPanPointerMove = (event: PointerEvent): void => {
  if (!canvasPanSession) {
    isCanvasPanReady.value =
      event.isPrimary && isImmediateCanvasPanPointerLocation(event)
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

const handleCanvasPanPointerEnd = (event: PointerEvent): void => {
  const session = canvasPanSession
  if (!session || event.pointerId !== session.pointerId) return
  event.preventDefault()
  event.stopPropagation()
  finishCanvasPan(event.pointerId)
}
```

超过 6px 的 document `pointermove` 会先清除等待会话但不阻止传播，所以同一个事件随后到达 Fabric 的 document 冒泡监听器，元素会从原按下点继续拖动。

- [ ] **Step 7: 在卸载时清除长按等待状态**

把 `onBeforeUnmount()` 开头改为：

```ts
onBeforeUnmount(() => {
  clearCanvasLongPressSession()
  finishCanvasPan()
  if (canvasPanFrame != null) {
    window.cancelAnimationFrame(canvasPanFrame)
    canvasPanFrame = null
  }
```

后续现有卸载清理保持不变。

- [ ] **Step 8: 运行目标测试和类型检查**

Run: `npm run test:canvas-pan && npm run typecheck`

Expected: PASS；5 个画布测试通过，Vue/TypeScript 无错误。

- [ ] **Step 9: 提交长按状态机**

```bash
git add src/views/Design.vue
git commit -m "feat: pan canvas after watch face long press"
```

### Task 4: 完整回归与交互验收

**Files:**
- Verify only: `src/utils/canvasPan.ts`
- Verify only: `src/engine/managers/canvasManager.ts`
- Verify only: `src/views/Canvas.vue`
- Verify only: `src/views/Design.vue`

- [ ] **Step 1: 运行全部可复现的自动验证**

Run: `npm run test:canvas-pan && npm run typecheck && npm run build`

Expected: PASS；5 个画布测试通过，类型检查通过，Vite 生产构建成功。

- [ ] **Step 2: 启动本地 Studio**

Run: `npm run dev -- --host 127.0.0.1 --port 4173`

Expected: Vite 输出 `Local: http://127.0.0.1:4173/`。在浏览器打开该地址，使用已有本地登录状态从 Designs 列表进入任一可编辑表盘。

- [ ] **Step 3: 验证立即平移与长按平移**

按顺序执行并记录结果：

1. 在表盘轮廓外按下并移动：画布立即跟随，无 400ms 等待。
2. 在表盘空白处静止按住约 400ms 后移动：整个舞台移动。
3. 在元素本体上静止按住约 400ms 后移动：整个舞台移动，元素仍被选中且坐标不变。
4. 在缩放/旋转控制点上静止按住约 400ms 后移动：整个舞台移动，元素尺寸和角度不变。
5. 在克隆和删除控制点上静止按住约 400ms：画布可平移，且不会克隆或删除元素。

Expected: 五项全部符合；长按接管瞬间舞台不跳动。

- [ ] **Step 4: 验证快速编辑、点击和双击回归**

按顺序执行并记录结果：

1. 在 400ms 内移动元素超过 6px：元素立即继续原生拖动。
2. 快速点击不同元素：选择切换正常。
3. 快速点击表盘空白：清空选择正常。
4. 双击支持编辑的文本元素：编辑行为正常。
5. 快速拖动缩放、旋转、克隆和删除控制点：原有行为正常。

Expected: 五项与修改前一致，不需要第二次按下。

- [ ] **Step 5: 验证历史、触控和清理**

1. 记录撤销按钮状态，执行一次元素上长按平移：撤销历史不增加。
2. 使用主触点重复空白处和元素上的长按平移：行为与鼠标一致。
3. 长按生效后把指针移出工作区再松开：平移正常结束。
4. 在 400ms 内把指针移出工作区并快速拖动：长按取消，Fabric 编辑继续。
5. 连续执行长按、取消、再次长按：没有残留定时器或卡住的抓手光标。

Expected: 五项全部符合，控制台无未捕获异常。

- [ ] **Step 6: 检查提交范围和工作树**

Run: `git diff --check && git status --short && git log -4 --oneline`

Expected: `git diff --check` 无输出；功能提交只包含计划列出的源码和测试文件。用户原有未提交文件如果仍存在，保持原状态且不纳入功能提交。
