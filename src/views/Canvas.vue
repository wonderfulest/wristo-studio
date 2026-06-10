<template>
  <div class="canvas-wrapper" :style="{ '--canvas-margin': `${CANVAS_MARGIN}px` }">
    <div class="watch-face-backdrop" :style="watchFaceBackdropStyle"></div>
    <canvas ref="canvasRef"></canvas>
    <DeviceFrameOverlay :canvas-offset="CANVAS_MARGIN" />
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
import { useDesignStore } from '@/stores/designStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { getDataSimulatorEngine } from '@/engine/simulator/dataSimulatorEngine'
import DeviceFrameOverlay from '@/components/canvas/DeviceFrameOverlay.vue'
import {
  scaleElementConfig,
  scaleFabricCanvasForDesignSize,
  type DesignSize,
} from '@/utils/designScale'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const baseStore = useBaseStore()
const designStore = useDesignStore()
const layerStore = useLayerStore()
const canvasStore = useCanvasStore()
const elementDataStore = useElementDataStore()
const RULER_OFFSET = 40
const CANVAS_MARGIN = 50
const MIN_ZOOM = 0.1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.1
const canvasOffset = ref<{ x: number; y: number }>({ x: 0, y: 0 })
const editorStore = useEditorStore()
let zoomManager: ZoomManagerHandle | null = null
let guidelineManager: GuidelineManagerHandle | null = null

const watchSize = computed(() => designStore.designSpec.width)
const watchWidth = computed(() => designStore.designSpec.width)
const watchHeight = computed(() => designStore.designSpec.height)
const watchFaceBackdropStyle = computed(() => {
  const zoom = Number(editorStore.zoomLevel || 1)
  return {
    left: `${CANVAS_MARGIN}px`,
    top: `${CANVAS_MARGIN}px`,
    width: `${Number(watchWidth.value || 0) * zoom}px`,
    height: `${Number(watchHeight.value || 0) * zoom}px`,
    borderRadius: watchWidth.value === watchHeight.value ? '50%' : '0',
  }
})
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
    watchSize: watchSize.value,
    watchWidth: watchWidth.value,
    watchHeight: watchHeight.value,
    zoomManager: null,
  })

  // 绑定缩放管理器
  zoomManager = attachZoomManager({
    baseStore,
    editorStore,
    getWatchSize: () => watchSize.value,
    getWatchWidth: () => watchWidth.value,
    getWatchHeight: () => watchHeight.value,
    getCanvasOffset: () => canvasOffset.value,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    zoomStep: ZOOM_STEP,
  })

  // 绑定辅助线管理器
  guidelineManager = attachGuidelineManager({
    baseStore,
    editorStore,
    getWatchSize: () => watchSize.value,
    getRulerOffset: () => RULER_OFFSET,
  })

  const engine = getDataSimulatorEngine()
  engine.start({ intervalMs: 1000 })
  ;(window as any).__dataSimulatorEngine = engine
})

onUnmounted(() => {
  getDataSimulatorEngine().stop()
  historyManager.dispose()
  disposeCanvasManager()
  zoomManager?.dispose()
  zoomManager = null
  guidelineManager?.dispose()
  guidelineManager = null
})

const updateFixedLayersForCanvasSize = () => {
  const width = watchWidth.value
  const height = watchHeight.value
  const circle = canvasStore.watchFaceCircle as any

  if (circle?.set) {
    circle.set({
      left: width / 2,
      top: height / 2,
      radius: Math.min(width, height) / 2,
    })
    circle.setCoords?.()
    canvasStore.applyGlobalClipPath()
  }

  baseStore.canvas?.requestRenderAll?.()
}

const syncElementDataForCanvasSize = (from: DesignSize, to: DesignSize) => {
  for (const snapshot of elementDataStore.elements) {
    const eleType = String(snapshot.eleType ?? '')
    if (eleType === 'global') continue
    elementDataStore.patchElement(
      snapshot.id,
      scaleElementConfig(snapshot.config, from, to) as any,
    )
  }
}

// watchSize 变化时通知辅助线和 Fabric 画布刷新尺寸
watch(
  () => [watchWidth.value, watchHeight.value],
  ([nextWidth, nextHeight], [prevWidth, prevHeight]) => {
    const from = {
      width: Number(prevWidth || nextWidth),
      height: Number(prevHeight || nextHeight),
    }
    const to = {
      width: Number(nextWidth),
      height: Number(nextHeight),
    }

    scaleFabricCanvasForDesignSize(baseStore.canvas as any, from, to)
    syncElementDataForCanvasSize(from, to)
    updateFixedLayersForCanvasSize()
    zoomManager?.updateZoom()
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
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: var(--studio-text);
}

.guideline-btn:hover {
  background: var(--studio-surface-soft);
}

.watch-face-backdrop {
  position: absolute;
  background: #000000;
  pointer-events: none;
  z-index: 1;
}

.canvas-container {
  background: transparent;
  border-radius: 4px;
  position: relative;
  margin: 50px;
  overflow: visible;
  transform: translate(0px, 0px);
  will-change: transform;
  z-index: 1;
}

.canvas-wrapper :deep(.canvas-container) {
  margin: var(--canvas-margin);
  background: transparent;
  border-radius: 4px;
  position: relative;
  overflow: visible;
  z-index: 2;
}

.canvas-wrapper :deep(.lower-canvas) {
  background-color: transparent;
}

.zoom-level {
  min-width: 50px;
  text-align: center;
  font-size: 14px;
  color: var(--studio-text-muted);
}

</style>
