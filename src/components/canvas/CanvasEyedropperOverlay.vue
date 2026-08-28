<template>
  <div
    class="canvas-eyedropper-overlay"
    @pointermove="handlePointerMove"
    @pointerleave="previewVisible = false"
    @pointerdown.stop.prevent="handlePointerDown"
    @contextmenu.stop.prevent="cancel"
  >
    <div
      v-if="previewVisible"
      class="canvas-eyedropper-preview"
      :class="previewPlacementClass"
      :style="previewStyle"
    >
      <canvas ref="previewCanvasRef" width="99" height="99" />
      <strong class="canvas-eyedropper-value">{{ previewColor }}</strong>
      <span class="canvas-eyedropper-hint">{{ hint }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { sampleCanvasColor, type CanvasPixelPoint } from '@/components/color-picker/canvasEyedropper'

const props = defineProps<{
  sourceCanvas: HTMLCanvasElement
  hint: string
}>()

const emit = defineEmits<{
  pick: [color: string]
  cancel: []
}>()

const previewCanvasRef = ref<HTMLCanvasElement | null>(null)
const previewVisible = ref(false)
const previewColor = ref('#000000')
const pointerPosition = ref({ x: 0, y: 0 })
const previewPlacementClass = computed(() => ({
  'place-left': pointerPosition.value.x > 170,
  'place-above': pointerPosition.value.y > 170,
}))
const previewStyle = computed(() => ({
  left: `${pointerPosition.value.x}px`,
  top: `${pointerPosition.value.y}px`,
}))

const drawMagnifiedPixels = (point: CanvasPixelPoint) => {
  const previewCanvas = previewCanvasRef.value
  const context = previewCanvas?.getContext('2d')
  if (!previewCanvas || !context) return

  const sampleSize = 11
  const sampleHalf = Math.floor(sampleSize / 2)
  context.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
  context.imageSmoothingEnabled = false
  context.drawImage(
    props.sourceCanvas,
    point.x - sampleHalf,
    point.y - sampleHalf,
    sampleSize,
    sampleSize,
    0,
    0,
    previewCanvas.width,
    previewCanvas.height,
  )
}

const readPointerColor = (event: PointerEvent) => {
  try {
    return sampleCanvasColor(props.sourceCanvas, event.clientX, event.clientY)
  } catch {
    return null
  }
}

const handlePointerMove = async (event: PointerEvent) => {
  const overlayRect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  pointerPosition.value = {
    x: event.clientX - overlayRect.left,
    y: event.clientY - overlayRect.top,
  }
  const sampled = readPointerColor(event)
  if (!sampled) return

  previewColor.value = sampled.color
  previewVisible.value = true
  await nextTick()
  drawMagnifiedPixels(sampled.point)
}

const handlePointerDown = (event: PointerEvent) => {
  if (event.button !== 0) {
    cancel()
    return
  }
  const sampled = readPointerColor(event)
  if (sampled) emit('pick', sampled.color)
}

const cancel = () => emit('cancel')
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  event.preventDefault()
  cancel()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
.canvas-eyedropper-overlay {
  position: absolute;
  cursor: crosshair;
  touch-action: none;
  z-index: var(--studio-z-canvas-overlay);
}

.canvas-eyedropper-preview {
  position: absolute;
  display: grid;
  grid-template-columns: 99px minmax(110px, auto);
  grid-template-rows: auto auto;
  gap: 3px 9px;
  width: max-content;
  padding: 7px;
  transform: translate(18px, 18px);
  border: 1px solid var(--studio-border-strong);
  border-radius: 8px;
  color: var(--studio-text);
  background: var(--studio-surface-raised);
  box-shadow: var(--studio-shadow-md);
  pointer-events: none;
}

.canvas-eyedropper-preview.place-left {
  transform: translate(calc(-100% - 18px), 18px);
}

.canvas-eyedropper-preview.place-above {
  transform: translate(18px, calc(-100% - 18px));
}

.canvas-eyedropper-preview.place-left.place-above {
  transform: translate(calc(-100% - 18px), calc(-100% - 18px));
}

.canvas-eyedropper-preview canvas {
  grid-row: 1 / 3;
  width: 99px;
  height: 99px;
  border: 1px solid var(--studio-border-strong);
  background: #000;
  image-rendering: pixelated;
}

.canvas-eyedropper-value {
  align-self: end;
  font: 600 13px/1.2 var(--studio-font-mono, monospace);
}

.canvas-eyedropper-hint {
  max-width: 160px;
  color: var(--studio-text-muted);
  font-size: 11px;
  line-height: 1.35;
}
</style>
