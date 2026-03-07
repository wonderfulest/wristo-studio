<template>
  <div class="canvas-wrapper">
    <canvas ref="canvasRef"></canvas>
  </div>
  
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted, computed, watch } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useEditorStore } from '@/stores/editorStore'
import { useHistoryStore } from '@/stores/historyStore'
import { initCanvasManager, disposeCanvasManager } from '@/engine/managers/canvasManager'
import { attachZoomManager, type ZoomManagerHandle } from '@/engine/managers/zoomManager'
import { attachGuidelineManager, type GuidelineManagerHandle } from '@/engine/managers/guidelineManager'
import { createHistoryManager, type HistoryManagerHandle } from '@/engine/managers/historyManager'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const baseStore = useBaseStore()
const layerStore = useLayerStore()
const canvasStore = useCanvasStore()
const WATCH_SIZE = computed(() => baseStore.WATCH_SIZE)
const RULER_OFFSET = 40
const MIN_ZOOM = 0.1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.1
const canvasOffset = ref<{ x: number; y: number }>({ x: 0, y: 0 })
const editorStore = useEditorStore()
let zoomManager: ZoomManagerHandle | null = null
let guidelineManager: GuidelineManagerHandle | null = null

// 历史记录控制器（Pinia historyStore + Manager 封装）
const historyStore = useHistoryStore()
const historyManager: HistoryManagerHandle = createHistoryManager(historyStore)

onMounted(() => {
  if (!canvasRef.value) return
  initCanvasManager(canvasRef.value, {
    baseStore,
    layerStore,
    canvasStore,
    historyStore,
    editorStore,
    watchSize: WATCH_SIZE.value,
    zoomManager: null,
  })

  // 绑定缩放管理器
  zoomManager = attachZoomManager({
    baseStore,
    editorStore,
    getWatchSize: () => WATCH_SIZE.value,
    getCanvasOffset: () => canvasOffset.value,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    zoomStep: ZOOM_STEP,
  })

  // 绑定辅助线管理器
  guidelineManager = attachGuidelineManager({
    baseStore,
    editorStore,
    getWatchSize: () => WATCH_SIZE.value,
    getRulerOffset: () => RULER_OFFSET,
  })
})

onUnmounted(() => {
  disposeCanvasManager(historyStore)
  zoomManager?.dispose()
  zoomManager = null
  guidelineManager?.dispose()
  guidelineManager = null
})

// watchSize 变化时通知辅助线管理器刷新尺寸
watch(
  () => WATCH_SIZE.value,
  () => {
    guidelineManager?.updateForWatchSizeChange()
  },
)

// 在 Canvas.vue 的 script setup 中暴露缩放与历史方法
defineExpose({
  zoomIn: () => zoomManager?.zoomIn(),
  zoomOut: () => zoomManager?.zoomOut(),
  resetZoom: () => zoomManager?.resetZoom(),
  updateZoom: () => zoomManager?.updateZoom(),
  undo: () => historyManager.undo(),
  redo: () => historyManager.redo(),
  canUndo: () => historyManager.canUndo(),
  canRedo: () => historyManager.canRedo(),
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
