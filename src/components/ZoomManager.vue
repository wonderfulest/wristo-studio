<template>
  <div class="zoom-manager" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { Canvas } from 'fabric'
import { useBaseStore } from '@/stores/baseStore'
import { useEditorStore } from '@/stores/editorStore'

const props = defineProps<{ 
  minZoom: number
  maxZoom: number
  zoomStep: number
  watchSize: number
  canvasOffset: { x: number; y: number }
}>()

const baseStore = useBaseStore()
const editorStore = useEditorStore()

const updateZoom = () => {
  if (!baseStore.canvas) return

  const container = document.querySelector('.canvas-container') as HTMLElement | null
  if (container) {
    const size = props.watchSize * editorStore.zoomLevel
    container.style.width = `${size}px`
    container.style.height = `${size}px`
  }

  ;(baseStore.canvas as Canvas).setViewportTransform([
    editorStore.zoomLevel, 0,
    0, editorStore.zoomLevel,
    props.canvasOffset.x, props.canvasOffset.y
  ])

  const canvasSize = props.watchSize * editorStore.zoomLevel
  ;(baseStore.canvas as Canvas).setWidth(canvasSize)
  ;(baseStore.canvas as Canvas).setHeight(canvasSize)
  ;(baseStore.canvas as Canvas).calcOffset()

  // 更新背景元素
  baseStore.updateBackgroundElements(editorStore.zoomLevel)

  baseStore.canvas.requestRenderAll()
}

const zoomIn = () => {
  if (editorStore.zoomLevel < props.maxZoom) {
    editorStore.updateSetting('zoomLevel', Math.min(editorStore.zoomLevel + props.zoomStep, props.maxZoom))
    updateZoom()
  }
}

const zoomOut = () => {
  if (editorStore.zoomLevel > props.minZoom) {
    editorStore.updateSetting('zoomLevel', Math.max(editorStore.zoomLevel - props.zoomStep, props.minZoom))
    updateZoom()
  }
}

const resetZoom = () => {
  editorStore.updateSetting('zoomLevel', 1)
  updateZoom()
}

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

onMounted(() => {
  if (baseStore.canvas) {
    baseStore.canvas.wrapperEl.addEventListener('wheel', handleWheel, { passive: false })
  }
})

onUnmounted(() => {
  if (baseStore.canvas) {
    baseStore.canvas.wrapperEl.removeEventListener('wheel', handleWheel)
  }
})

// 当手表尺寸变化时，刷新缩放后的尺寸
watch(() => props.watchSize, () => {
  updateZoom()
})

// 暴露方法给父组件
defineExpose({
  zoomIn,
  zoomOut,
  resetZoom,
  updateZoom
})
</script>

<style scoped>
.zoom-manager { display: none; }
</style>
