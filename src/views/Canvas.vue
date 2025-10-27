<template>
  <div class="canvas-wrapper">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted, computed, watch } from 'vue'
import { Canvas, FabricObject, Line, Point } from 'fabric'
import emitter from '@/utils/eventBus'
import { useBaseStore } from '@/stores/baseStore'
import { initAligningGuidelines } from '@/lib/aligning_guidelines'
import { initCenteringGuidelines } from '@/lib/centering_guidelines'
import { applyFabricCustomProperties, discoverAndRegisterCanvasProps } from '@/utils/fabricProps'
import { useHistory } from '@/composables/useHistory'
import type { MinimalBaseStore } from '@/types/history'
import { useEditorStore } from '@/stores/editorStore'
const canvasRef = ref<HTMLCanvasElement | null>(null)
const baseStore = useBaseStore()
let updateInterval: number | undefined
const WATCH_SIZE = computed(() => baseStore.WATCH_SIZE)
const RULER_OFFSET = 40
const MIN_ZOOM = 0.1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.1
const canvasOffset = ref<{ x: number; y: number }>({ x: 0, y: 0 })
const isSpacePressed = ref<boolean>(false)
const editorStore = useEditorStore()
// 应用全局 Fabric 自定义属性（默认集合）
applyFabricCustomProperties()

// 附加类型（不使用 any）
type GuidelineObject = FabricObject & {
  guideline?: boolean
  keyGuideline?: boolean
  type?: string
  left?: number
  top?: number
  x1?: number
  x2?: number
  y1?: number
  y2?: number
  set: (props: Record<string, unknown>) => FabricObject
}

// 通过事件总线接收来自标尺组件的辅助线创建事件
emitter.on('add-horizontal-guideline', (y: unknown) => {
  const yy = Number(y)
  const line = createHorizontalGuideline(yy)
  if (baseStore.canvas) {
    (baseStore.canvas as Canvas).add(line)
    ;(baseStore.canvas as Canvas).requestRenderAll()
  }
})
emitter.on('add-vertical-guideline', (x: unknown) => {
  const xx = Number(x)
  const line = createVerticalGuideline(xx)
  if (baseStore.canvas) {
    (baseStore.canvas as Canvas).add(line)
    ;(baseStore.canvas as Canvas).requestRenderAll()
  }
})

// 添加辅助线
const addGuideLine = (canvas: Canvas, orientation: 'horizontal' | 'vertical', position: number) => {
  const line = new Line(
    orientation === 'horizontal'
      ? [0, position, canvas.width, position] 
      : [position, 0, position, canvas.height],
    {
      stroke: 'rgba(0,0,255,0.5)',
      selectable: false,
      evented: false,
      strokeDashArray: [5, 5],
      name: 'guideLine'
    }
  )
  
  canvas.add(line)
  canvas.requestRenderAll()
}

// 创建水平辅助线
const createHorizontalGuideline = (y: number) => {
  // 获取中心区域的宽度
  const centerArea = document.querySelector('.center-area')
  const width = centerArea ? centerArea.clientWidth - RULER_OFFSET : WATCH_SIZE.value // 减去垂直标尺宽度

  const line = new Line([-width, y, width * 2, y], {
    stroke: '#0a90ff',
    strokeWidth: 1,
    selectable: true,
    evented: true,
    lockMovementX: true, // 只允许垂直移动
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    hasControls: false, // 禁用控制点
    hasBorders: false, // 禁用边框
    originX: 'left',
    originY: 'top',
    hoverCursor: 'ns-resize', // 垂直移动光标
    moveCursor: 'ns-resize',
    guideline: true, // 标记为辅助线
    type: 'horizontalGuideline',
    perPixelTargetFind: true,
    targetFindTolerance: 5
  })
  
  if (baseStore.canvas) {
    (baseStore.canvas as Canvas).add(line)
  }
  return line
}

// 创建垂直辅助线
const createVerticalGuideline = (x: number) => {
  // 获取中心区域的高度
  const centerArea = document.querySelector('.center-area')
  const height = centerArea ? centerArea.clientHeight - RULER_OFFSET : WATCH_SIZE.value // 减去水平标尺高度

  
  const line = new Line([x, -height, x, height * 2], {
    stroke: '#0a90ff',
    strokeWidth: 1,
    selectable: true,
    evented: true,
    lockMovementY: true, // 只允许水平移动
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    hasControls: false, // 禁用控制点
    hasBorders: false, // 禁用边框
    originX: 'left',
    originY: 'top',
    hoverCursor: 'ew-resize', // 水平移动光标
    moveCursor: 'ew-resize',
    guideline: true, // 标记为辅助线
    type: 'verticalGuideline',
    perPixelTargetFind: true,
    targetFindTolerance: 5
  })
  
  if (baseStore.canvas) {
    (baseStore.canvas as Canvas).add(line)
  }
  return line
}

// 添加关键辅助线状态与方法（提前声明，供后续尺寸更新调用）
const showKeyGuidelines = ref<boolean>(false)
const keyGuidelines = ref<Line[]>([])

// 创建关键辅助线
const createKeyGuidelines = () => {
  if (!baseStore.canvas) return
  // 清除现有的关键辅助线
  keyGuidelines.value.forEach(guideline => {
    ;(baseStore.canvas as Canvas).remove(guideline as unknown as FabricObject)
  })
  keyGuidelines.value = []

  const centerX = WATCH_SIZE.value / 2
  const centerY = WATCH_SIZE.value / 2
  const quarterX = WATCH_SIZE.value / 4
  const quarterY = WATCH_SIZE.value / 4

  // 创建中心线与四等分线
  const centerVertical = createVerticalGuideline(centerX)
  const centerHorizontal = createHorizontalGuideline(centerY)
  const leftQuarter = createVerticalGuideline(quarterX)
  const rightQuarter = createVerticalGuideline(centerX + quarterX)
  const topQuarter = createHorizontalGuideline(quarterY)
  const bottomQuarter = createHorizontalGuideline(centerY + quarterY)

  const keyLines = [centerVertical, centerHorizontal, leftQuarter, rightQuarter, topQuarter, bottomQuarter]
  keyLines.forEach(line => {
    line.set({
      stroke: '#ff0000',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      hasControls: false,
      hasBorders: false,
      keyGuideline: true
    })
    keyGuidelines.value.push(line)
  })

  ;(baseStore.canvas as Canvas).requestRenderAll()
}

// 更新辅助线尺寸
const updateGuidelineSize = () => {
  if (!baseStore.canvas) return

  const centerArea = document.querySelector('.center-area') as HTMLElement | null
  if (!centerArea) return

  const width = centerArea.clientWidth - RULER_OFFSET // 减去垂直标尺宽度
  const height = centerArea.clientHeight - RULER_OFFSET // 减去水平标尺高度

  // 使用 requestAnimationFrame 来避免重复渲染
  requestAnimationFrame(() => {
    const canvas = baseStore.canvas as Canvas
    canvas.getObjects().forEach((obj: GuidelineObject) => {
      if (obj.guideline) {
        if (obj.type === 'horizontalGuideline') {
          obj.set({
            x1: -width,
            x2: width * 2,
            y1: obj.top,
            y2: obj.top
          })
        } else if (obj.type === 'verticalGuideline') {
          obj.set({
            x1: obj.left,
            x2: obj.left,
            y1: -height,
            y2: height * 2
          })
        }
        obj.setCoords()
      }
    })

    // 如果关键辅助线显示，重新创建它们以确保位置正确
    if (showKeyGuidelines.value) {
      createKeyGuidelines()
    }
  })
}

// 缩放功能
const zoomIn = () => {
  if (editorStore.zoomLevel < MAX_ZOOM) {
    editorStore.updateSetting('zoomLevel', Math.min(editorStore.zoomLevel + ZOOM_STEP, MAX_ZOOM))
    updateZoom()
  }
}

const zoomOut = () => {
  if (editorStore.zoomLevel > MIN_ZOOM) {
    editorStore.updateSetting('zoomLevel', Math.max(editorStore.zoomLevel - ZOOM_STEP, MIN_ZOOM))
    updateZoom()
  }
}

const resetZoom = () => {
  editorStore.updateSetting('zoomLevel', 1)
  updateZoom()
}

// 更新缩放
const updateZoom = () => {
  if (!baseStore.canvas) return
  
  // 更新容器大小
  const container = document.querySelector('.canvas-container') as HTMLElement | null
  if (container) {
    const size = WATCH_SIZE.value * editorStore.zoomLevel
    container.style.width = `${size}px`
    container.style.height = `${size}px`
  }

  // 设置新的变换矩阵，保持当前偏移
  ;(baseStore.canvas as Canvas).setViewportTransform([
    editorStore.zoomLevel, 0,
    0, editorStore.zoomLevel,
    canvasOffset.value.x, canvasOffset.value.y
  ])
  
  // 更新画布尺寸
  const canvasSize = WATCH_SIZE.value * editorStore.zoomLevel
  ;(baseStore.canvas as Canvas).setWidth(canvasSize)
  ;(baseStore.canvas as Canvas).setHeight(canvasSize)
  ;(baseStore.canvas as Canvas).calcOffset()

  // 更新背景元素
  baseStore.updateBackgroundElements(editorStore.zoomLevel)

  // 强制重新渲染
  baseStore.canvas.requestRenderAll()
}

// 添加鼠标滚轮缩放
const handleWheel = (e: WheelEvent) => {
  if (!e.ctrlKey) return
  e.preventDefault()
  
  const delta = e.deltaY
  if (delta < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Space' && !isSpacePressed.value) {
    isSpacePressed.value = true
    // 更新鼠标样式为抓手
    const canvasWrapper = document.querySelector('.canvas-wrapper') as HTMLElement | null
    if (canvasWrapper) {
      canvasWrapper.style.cursor = 'grab'
    }
    e.preventDefault()
  }
}

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    isSpacePressed.value = false
    // 恢复默认鼠标样式
    const canvasWrapper = document.querySelector('.canvas-wrapper') as HTMLElement | null
    if (canvasWrapper) {
      canvasWrapper.style.cursor = 'default'
    }
  }
}

const backgroundColor = ref<string>(editorStore.backgroundColor)

// 历史记录控制器（基于 useHistory）
const history = useHistory(baseStore as unknown as MinimalBaseStore)

const refreshElementSettings = (opt?: unknown) => {
  
  emitter.emit('refresh-element-settings', opt)
}

onMounted(() => {
  // 创建画布, 尺寸比手表大一些以显示边界
  const canvas = new Canvas(canvasRef.value as HTMLCanvasElement, {
    width: WATCH_SIZE.value * editorStore.zoomLevel,
    height: WATCH_SIZE.value * editorStore.zoomLevel,
    centeredScaling: true,  // 确保缩放以中心点为基准
    centeredRotation: true  // 确保旋转以中心点为基准
  })
  // 设置画布背景色
  // const canvasElement = canvasRef.value;
  // canvasElement.style.backgroundColor = backgroundColor.value;
  // 计算画布中心点
  const centerPoint = {
    x: 0,
    y: 0
  }

  // 设置画布原点到中心
  canvas.setViewportTransform([
    1, 0, 
    0, 1, 
    centerPoint.x,
    centerPoint.y
  ])

  // 设置画布中心点
  canvas.absolutePan(new Point(-centerPoint.x, -centerPoint.y))

  // 添加 passive 事件监听器
  canvas.wrapperEl.addEventListener('wheel', () => {}, { passive: true })

  // 对象间对齐辅助线
  initAligningGuidelines(canvas)
  initCenteringGuidelines(canvas)
  // 可以多选
  canvas.selection = true

  // 添加辅助线
  canvas.on('mouse:down', function (opt) {
    if (opt.e.shiftKey) {
      const pointer = canvas.getPointer(opt.e)
      addGuideLine(canvas, 'horizontal', pointer.y)
    } else if (opt.e.ctrlKey) {
      const pointer = canvas.getPointer(opt.e)
      addGuideLine(canvas, 'vertical', pointer.x)
    }
  })

  // 选择事件
  canvas.on({
    'selection:created': refreshElementSettings,
    'selection:updated': refreshElementSettings,
    'selection:cleared': refreshElementSettings,
  })

  canvas.on('mouse:down', function (opt) {
    if (opt.target) {
      // 点击的是一个对象
      refreshElementSettings(opt);
    }
  });

  // 先设置全局 canvas 引用
  baseStore.setCanvas(canvas)

  // 绑定到历史控制器并记录初始快照、注册事件
  history.attachCanvas(canvas)
  history.saveInitial()
  history.registerCanvasEvents()

  // 首次扫描现有对象的自定义字段（如绑定字段），扩展序列化属性
  discoverAndRegisterCanvasProps((canvas.getObjects() as unknown[]))
  // 之后每次新增对象时动态发现并注册
  canvas.on('object:added', (e) => {
    const target = (e as unknown as { target?: unknown }).target
    if (target) {
      discoverAndRegisterCanvasProps([target])
    } else {
      discoverAndRegisterCanvasProps((canvas.getObjects() as unknown[]))
    }
  })

  // 标尺由子组件独立管理更新与事件

  // 监听全局撤销/重做事件（由 useKeyboardShortcuts 发出）
  emitter.on('canvas-undo', () => {
    console.log('[Canvas] eventBus undo')
    history.undo()
  })
  emitter.on('canvas-redo', () => {
    console.log('[Canvas] eventBus redo')
    history.redo()
  })

  // 监听窗口大小变化，更新辅助线尺寸
  window.addEventListener('resize', updateGuidelineSize)

  // 监听关键辅助线切换事件
  emitter.on('toggle-key-guidelines', (event: unknown) => {
    const show = Boolean(event)
    showKeyGuidelines.value = show
    if (show) {
      createKeyGuidelines()
    } else {
      keyGuidelines.value.forEach(guideline => {
        ;(baseStore.canvas as Canvas).remove(guideline as unknown as FabricObject)
      })
      keyGuidelines.value = []
      ;(baseStore.canvas as Canvas).requestRenderAll()
    }
  })

  // 添加滚轮缩放事件监听
  canvas.wrapperEl.addEventListener('wheel', handleWheel, { passive: false })

  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)

  // 初始化容器样式
  const containerInit = document.querySelector('.canvas-container') as HTMLElement | null
  if (containerInit) {
    containerInit.style.transform = 'translate(0px, 0px)'
    containerInit.style.transition = 'transform 0s' // 移除过渡动画，使拖动更流畅
    containerInit.style.backgroundColor = backgroundColor.value
  }
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }

  // 标尺事件与监听由子组件负责

  // 移除删除快捷键监听
  // 由于上面添加的键盘监听是匿名函数，这里无法精准移除；通常在组件销毁时页面会卸载或无需移除。

  // 移除窗口大小变化监听
  window.removeEventListener('resize', updateGuidelineSize)

  // 移除关键辅助线事件监听
  emitter.off('toggle-key-guidelines')

  // 移除滚轮缩放事件监听
  if (baseStore.canvas) {
    baseStore.canvas.wrapperEl.removeEventListener('wheel', handleWheel)
  }

  // 移除键盘事件监听
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)

  // 解绑全局事件
  emitter.off('canvas-undo')
  emitter.off('canvas-redo')
  emitter.off('add-horizontal-guideline')
  emitter.off('add-vertical-guideline')

  // 当前未添加拖拽事件，无需移除
})

// 监听画布大小变化
watch(WATCH_SIZE, () => {
  updateGuidelineSize()
})

// 在 Canvas.vue 的 script setup 中暴露缩放方法和值
defineExpose({
  zoomIn,
  zoomOut,
  resetZoom,
  updateZoom,
  undo: () => history.undo(),
  redo: () => history.redo()
})
</script>

<style scoped>
.canvas-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: visible; /* 修改为 visible，允许内容溢出 */
  cursor: default;
  user-select: none; /* 防止拖拽时选中文本 */
}

.canvas-wrapper.dragging {
  cursor: grabbing !important;
}

.canvas-wrapper:active {
  cursor: grabbing;
}

.canvas-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 2;
}

.guideline-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.guideline-btn:hover {
  background: #f5f5f5;
}


.canvas-container {
  background: white;
  border-radius: 4px;
  position: relative;
  margin: 50px;
  overflow: visible;
  transform: translate(0px, 0px);
  will-change: transform;
}

.zoom-level {
  min-width: 50px;
  text-align: center;
  font-size: 14px;
  color: #666;
}
</style>
