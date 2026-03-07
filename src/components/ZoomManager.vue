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

const bindWheelListener = () => {
  if (!baseStore.canvas) return
  baseStore.canvas.wrapperEl.addEventListener('wheel', handleWheel, { passive: false })
}

const unbindWheelListener = () => {
  if (!baseStore.canvas) return
  baseStore.canvas.wrapperEl.removeEventListener('wheel', handleWheel)
}

const updateZoom = () => {
  if (!baseStore.canvas) {
    return
  }

  const currentZoom = editorStore.zoomLevel

  const canvas = baseStore.canvas as Canvas

  // 统一使用 Fabric 的 viewportTransform 做缩放，不再通过外层 DOM/CSS 调整缩放比例。
  // 这样对象几何、控件绘制和命中检测都共享同一套坐标系。
  canvas.setViewportTransform([
    currentZoom, 0,
    0, currentZoom,
    props.canvasOffset.x,
    props.canvasOffset.y,
  ])

  // 画布逻辑尺寸保持为 watchSize，避免宽高随着缩放一起变化导致 pointer 映射错位。
  canvas.setWidth(props.watchSize)
  canvas.setHeight(props.watchSize)

  // 尺寸或视口变更后，需要重新计算偏移，确保 clientX/Y 正确映射到画布坐标。
  canvas.calcOffset()
  canvas.requestRenderAll()
}

const zoomIn = () => {
  const prevZoom = editorStore.zoomLevel
  if (prevZoom < props.maxZoom) {
    const nextZoom = Math.min(prevZoom + props.zoomStep, props.maxZoom)
    editorStore.updateSetting('zoomLevel', nextZoom)
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
  bindWheelListener()
})

onUnmounted(() => {
  unbindWheelListener()
})

// 当 canvas 初始化完成后（可能发生在 ZoomManager 挂载之后），确保绑定滚轮事件并应用当前缩放
watch(
  () => baseStore.canvas,
  (c) => {
    if (!c) return
    bindWheelListener()
    updateZoom()
  },
  { immediate: true }
)

// 当手表尺寸变化时，刷新缩放后的尺寸
watch(
  () => props.watchSize,
  () => {
    // 尺寸变化会影响背景圆/背景图的几何参数，这里需要同步更新
    baseStore.updateBackgroundElements(editorStore.zoomLevel)
    updateZoom()
  }
)

// 当缩放变化时，确保 viewportTransform 实际生效（元素/图标/选框同步缩放）
watch(
  () => editorStore.zoomLevel,
  () => {
    updateZoom()
  },
  { immediate: true }
)

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
