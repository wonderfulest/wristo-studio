<template>
  <div
    class="canvas-wrapper"
    :class="{ 'is-file-drag-over': isFileDragOver, 'is-file-uploading': isUploadingDroppedImage }"
    :style="{ '--canvas-margin': `${CANVAS_MARGIN}px` }"
    @pointerdown="handleWrapperPointerDown"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <div class="watch-face-backdrop" :style="watchFaceBackdropStyle"></div>
    <canvas ref="canvasRef"></canvas>
    <DeviceFrameOverlay :canvas-offset="CANVAS_MARGIN" />
  </div>
  
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useEditorStore } from '@/stores/editorStore'
import { useHistoryStore } from '@/stores/historyStore'
import { addElement, updateElement } from '@/engine/managers/elementManager'
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
import { analogAssetApi } from '@/api/wristo/analogAsset'
import type { AnalogAssetVO } from '@/types/api/analog-asset'
import type { ImageElementConfig } from '@/types/elements/image'
import { imageSchema } from '@/elements/decoration/image/image.schema'
import { useI18n } from '@/i18n'
import { isPngFile, isSvgFile, svgFileContainsRasterImage } from '@/utils/assetUploadValidation'
import { installSubDialLayoutEditor } from '@/elements/dials/subDial/subDial.plugin'

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
const { t } = useI18n()
const isFileDragOver = ref(false)
const isUploadingDroppedImage = ref(false)
let zoomManager: ZoomManagerHandle | null = null
let guidelineManager: GuidelineManagerHandle | null = null
let disposeSubDialLayoutEditor: (() => void) | null = null

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

  const canvas = baseStore.canvas
  if (canvas) {
    const editor = installSubDialLayoutEditor({
      canvas: canvas as any,
      updateElement: (element, patch) => updateElement(element, patch),
      saveHistory: () => {
        historyStore.saveState('sub-dial:content-drag')
      },
      runWithoutRecording: (task) => historyStore.runWithoutRecording(task),
    })
    disposeSubDialLayoutEditor = () => editor.dispose()
  }

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
  disposeSubDialLayoutEditor?.()
  disposeSubDialLayoutEditor = null
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

const clearCanvasSelection = () => {
  const canvas = baseStore.canvas
  if (!canvas) return
  if (!canvas.getActiveObjects?.().length) {
    canvasStore.clearActiveIds()
    layerStore.clearSelected()
    return
  }

  canvas.discardActiveObject?.()
  canvas.requestRenderAll?.()
  canvasStore.clearActiveIds()
  layerStore.clearSelected()
}

const handleWrapperPointerDown = (event: PointerEvent) => {
  const target = event.target as HTMLElement | null
  if (!target) return
  if (target.closest('.canvas-container')) return
  clearCanvasSelection()
}

const isSvgOrPngFile = (file: File): boolean => isSvgFile(file) || isPngFile(file)

const getDroppedImageFile = async (event: DragEvent): Promise<File | null> => {
  const files = Array.from(event.dataTransfer?.files || [])
  if (!files.length) return null

  if (files.length !== 1) {
    ElMessage.warning(t('asset.dropSingleSvgPngOnly'))
    return null
  }

  const file = files[0]
  if (!isSvgOrPngFile(file)) {
    ElMessage.warning(t('asset.dropSingleSvgPngOnly'))
    return null
  }

  if (await svgFileContainsRasterImage(file)) {
    ElMessage.warning(t('asset.svgVectorOnly'))
    return null
  }

  return file
}

const getAssetImageUrl = (asset: AnalogAssetVO): string => {
  return asset.file?.previewUrl || asset.file?.url || ''
}

const loadImageSize = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      resolve({
        width: Math.max(1, Number(image.naturalWidth || image.width || 1)),
        height: Math.max(1, Number(image.naturalHeight || image.height || 1)),
      })
    }
    image.onerror = () => resolve({ width: 60, height: 60 })
    image.src = url
  })
}

const getDropPoint = (event: DragEvent): { left: number; top: number } => {
  const canvas = baseStore.canvas
  const fallback = {
    left: Number(designStore.designSpec.centerX ?? watchWidth.value / 2),
    top: Number(designStore.designSpec.centerY ?? watchHeight.value / 2),
  }
  if (!canvas?.getPointer) return fallback

  const pointer = canvas.getPointer(event as unknown as MouseEvent)
  const left = Math.min(Math.max(Number(pointer.x || 0), 0), Number(watchWidth.value || fallback.left * 2))
  const top = Math.min(Math.max(Number(pointer.y || 0), 0), Number(watchHeight.value || fallback.top * 2))
  return { left: Math.round(left), top: Math.round(top) }
}

const getInitialImageSize = async (url: string): Promise<{ width: number; height: number }> => {
  const natural = await loadImageSize(url)
  const width = Math.max(1, Number(imageSchema.defaultConfig.width || 60))
  const aspect = natural.width > 0 ? natural.height / natural.width : 1
  return {
    width,
    height: Math.max(1, Math.round(width * aspect)),
  }
}

const handleDragEnter = (event: DragEvent) => {
  if ((event.dataTransfer?.items?.length || event.dataTransfer?.files?.length || 0) > 0) {
    isFileDragOver.value = true
  }
}

const handleDragOver = (event: DragEvent) => {
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  isFileDragOver.value = true
}

const handleDragLeave = (event: DragEvent) => {
  const current = event.currentTarget as HTMLElement | null
  const related = event.relatedTarget as Node | null
  if (current && related && current.contains(related)) return
  isFileDragOver.value = false
}

const handleDrop = async (event: DragEvent) => {
  isFileDragOver.value = false
  if (isUploadingDroppedImage.value) return

  const file = await getDroppedImageFile(event)
  if (!file) return

  isUploadingDroppedImage.value = true
  try {
    const res = await analogAssetApi.upload(file, 'image')
    const asset = res.data
    const imageUrl = asset ? getAssetImageUrl(asset) : ''
    if (!asset || !imageUrl) {
      ElMessage.error(t('asset.uploadFailed'))
      return
    }

    const size = await getInitialImageSize(imageUrl)
    const point = getDropPoint(event)
    const config: ImageElementConfig = {
      id: '',
      eleType: 'image',
      imageUrl,
      assetId: asset.id,
      width: size.width,
      height: size.height,
      left: point.left,
      top: point.top,
      originX: 'center',
      originY: 'center',
      displayStates: { active: true, ambient: true },
    }

    await historyStore.runWithoutRecording(() => addElement('image', config as any))
    historyStore.saveState('add:image:drop', { coalesceIfSameFabric: true })
    ElMessage.success(t('asset.uploadSuccess'))
  } catch (error) {
    console.error('[Canvas] drop image upload failed:', error)
    ElMessage.error(t('asset.uploadFailed'))
  } finally {
    isUploadingDroppedImage.value = false
  }
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

const createFabricInteractionFinishEvent = (
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

type FinishFabricPointerInteractionOptions = {
  allowPerformedTransform: boolean
  clearGroupSelector: boolean
}

const finishFabricPointerInteraction = (
  sourceEvent: PointerEvent,
  options: FinishFabricPointerInteractionOptions,
): boolean => {
  const canvas = baseStore.canvas
  if (!canvas || !canvas.enablePointerEvents || typeof canvas._onMouseUp !== 'function') {
    return false
  }

  const transform = canvas._currentTransform
  if (transform?.actionPerformed && !options.allowPerformedTransform) return false

  if (transform) {
    canvas.endCurrentTransform(sourceEvent)
    ;(transform.target as { __corner?: string }).__corner = undefined
  }
  if (options.clearGroupSelector) {
    ;(canvas as unknown as { _groupSelector: unknown })._groupSelector = null
  }

  const previousSkipTargetFind = canvas.skipTargetFind
  canvas.skipTargetFind = true
  try {
    canvas._onMouseUp(createFabricInteractionFinishEvent(sourceEvent, canvas.upperCanvasEl))
  } finally {
    canvas.skipTargetFind = previousSkipTargetFind
  }
  canvas.requestRenderAll?.()
  return true
}

const cancelFabricInteractionForStagePan = (sourceEvent: PointerEvent): boolean =>
  finishFabricPointerInteraction(sourceEvent, {
    allowPerformedTransform: false,
    clearGroupSelector: false,
  })

const finishFabricInteractionForPointerCancel = (sourceEvent: PointerEvent): boolean =>
  finishFabricPointerInteraction(sourceEvent, {
    allowPerformedTransform: true,
    clearGroupSelector: true,
  })

const syncCanvasOffset = () => {
  baseStore.canvas?.calcOffset?.()
  baseStore.canvas?.requestRenderAll?.()
}

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
  clearSelection: clearCanvasSelection,
  cancelFabricInteractionForStagePan,
  finishFabricInteractionForPointerCancel,
  syncCanvasOffset,
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

.canvas-wrapper.is-file-drag-over::after,
.canvas-wrapper.is-file-uploading::after {
  content: '';
  position: absolute;
  left: var(--canvas-margin);
  top: var(--canvas-margin);
  width: calc(100% - var(--canvas-margin) * 2);
  height: calc(100% - var(--canvas-margin) * 2);
  border: 2px dashed var(--studio-primary);
  border-radius: 8px;
  background: rgba(15, 107, 104, 0.08);
  pointer-events: none;
  z-index: var(--studio-z-canvas-overlay);
}

.canvas-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: var(--studio-z-canvas-surface);
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
  z-index: var(--studio-z-canvas-backdrop);
}

.canvas-container {
  background: transparent;
  border-radius: 4px;
  position: relative;
  margin: 50px;
  overflow: visible;
  transform: translate(0px, 0px);
  will-change: transform;
  z-index: var(--studio-z-canvas-backdrop);
}

.canvas-wrapper :deep(.canvas-container) {
  margin: var(--canvas-margin);
  background: transparent;
  border-radius: 4px;
  position: relative;
  overflow: visible;
  z-index: var(--studio-z-canvas-surface);
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
