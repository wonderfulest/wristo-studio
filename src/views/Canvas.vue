<template>
  <div class="canvas-wrapper">
    <canvas ref="canvasRef"></canvas>
    <ZoomManager
      ref="zoomManagerRef"
      :min-zoom="MIN_ZOOM"
      :max-zoom="MAX_ZOOM"
      :zoom-step="ZOOM_STEP"
      :watch-size="WATCH_SIZE"
      :canvas-offset="canvasOffset"
    />
    <GuidelineManager
      :watch-size="WATCH_SIZE"
      :ruler-offset="RULER_OFFSET"
    />
  </div>
  
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted, computed } from 'vue'
import { Canvas, Point } from 'fabric'
import emitter from '@/utils/eventBus'
import { useBaseStore } from '@/stores/baseStore'
import { initAligningGuidelines } from '@/lib/aligning_guidelines'
import { initCenteringGuidelines } from '@/lib/centering_guidelines'
import { applyFabricCustomProperties, discoverAndRegisterCanvasProps } from '@/utils/fabricProps'
import { useHistory } from '@/composables/useHistory'
import type { MinimalBaseStore } from '@/types/history'
import { useEditorStore } from '@/stores/editorStore'
import ZoomManager from '@/components/ZoomManager.vue'
import GuidelineManager from '@/components/GuidelineManager.vue'
const canvasRef = ref<HTMLCanvasElement | null>(null)
const baseStore = useBaseStore()
const WATCH_SIZE = computed(() => baseStore.WATCH_SIZE)
const RULER_OFFSET = 40
const MIN_ZOOM = 0.1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.1
const canvasOffset = ref<{ x: number; y: number }>({ x: 0, y: 0 })
const isSpacePressed = ref<boolean>(false)
const editorStore = useEditorStore()
const zoomManagerRef = ref<InstanceType<typeof ZoomManager> | null>(null)
// 应用全局 Fabric 自定义属性（默认集合）
applyFabricCustomProperties()

const handleKeyDown = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement | null
  if (target) {
    const tag = target.tagName
    const isEditable =
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      target.isContentEditable

    // 如果当前在可编辑输入区域内，允许空格等按键正常输入
    if (isEditable) {
      return
    }
  }

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

  // 监听全局撤销/重做事件（由 useKeyboardShortcuts 发出）
  emitter.on('canvas-undo', () => {
    console.log('[Canvas] eventBus undo')
    history.undo()
  })
  emitter.on('canvas-redo', () => {
    console.log('[Canvas] eventBus redo')
    history.redo()
  })

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

  // 移除键盘事件监听
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)

  // 解绑全局事件
  emitter.off('canvas-undo')
  emitter.off('canvas-redo')
})

// 在 Canvas.vue 的 script setup 中暴露缩放方法和值
defineExpose({
  zoomIn: () => zoomManagerRef.value?.zoomIn?.(),
  zoomOut: () => zoomManagerRef.value?.zoomOut?.(),
  resetZoom: () => zoomManagerRef.value?.resetZoom?.(),
  updateZoom: () => zoomManagerRef.value?.updateZoom?.(),
  undo: () => history.undo(),
  redo: () => history.redo()
  ,
  canUndo: () => history.canUndo(),
  canRedo: () => history.canRedo()
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
  z-index: 0;
}

.zoom-level {
  min-width: 50px;
  text-align: center;
  font-size: 14px;
  color: #666;
}

</style>
