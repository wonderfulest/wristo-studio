<template>
  <div class="rulers">
    <canvas class="ruler-horizontal" ref="hRef"></canvas>
    <canvas class="ruler-vertical" ref="vRef"></canvas>
    <canvas class="ruler-extensions" ref="extRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import emitter from '@/utils/eventBus'

const props = defineProps<{
  watchSize: number
  rulerOffset: number
}>()

const hRef = ref<HTMLCanvasElement | null>(null)
const vRef = ref<HTMLCanvasElement | null>(null)
const extRef = ref<HTMLCanvasElement | null>(null)
let showGuides = true

const drawHorizontal = (ctx: CanvasRenderingContext2D, width: number, zoom: number, canvasLeft: number, offset: number) => {
  ctx.clearRect(0, 0, width, offset)
  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(0, 0, width, offset)
  ctx.strokeStyle = '#999'
  ctx.beginPath()

  const startX = -canvasLeft / zoom
  const endX = startX + props.watchSize / zoom + offset + 800

  for (let i = Math.floor(startX / 10) * 10; i <= endX; i += 10) {
    const x = i * zoom + canvasLeft
    if (i % 100 === 0) {
      ctx.moveTo(x, offset)
      ctx.lineTo(x, 20)
      ctx.fillStyle = '#333'
      ctx.font = '12px Arial'
      ctx.fillText(String(i), x + 2, 15)
    } else {
      ctx.moveTo(x, offset)
      ctx.lineTo(x, 30)
    }
  }
  ctx.stroke()
}

const drawVertical = (ctx: CanvasRenderingContext2D, height: number, zoom: number, canvasTop: number, offset: number) => {
  ctx.clearRect(0, 0, offset, height)
  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(0, 0, offset, height)
  ctx.strokeStyle = '#999'
  ctx.beginPath()

  const startY = -canvasTop / zoom
  const endY = startY + props.watchSize / zoom + offset + 800

  for (let i = Math.floor(startY / 10) * 10; i <= endY; i += 10) {
    const y = i * zoom + canvasTop
    if (i % 100 === 0) {
      ctx.moveTo(offset, y)
      ctx.lineTo(20, y)
      ctx.save()
      ctx.fillStyle = '#333'
      ctx.font = '12px Arial'
      ctx.translate(15, y + 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText(String(i), 0, 0)
      ctx.restore()
    } else {
      ctx.moveTo(offset, y)
      ctx.lineTo(30, y)
    }
  }
  ctx.stroke()
}

const update = () => {
  const horizontalRuler = hRef.value
  const verticalRuler = vRef.value
  const extCanvas = extRef.value
  const centerArea = document.querySelector('.center-area') as HTMLElement | null
  const canvasContainer = document.querySelector('.canvas-container') as HTMLElement | null
  if (!horizontalRuler || !verticalRuler || !extCanvas || !centerArea || !canvasContainer) return

  const hctx = horizontalRuler.getContext('2d')
  const vctx = verticalRuler.getContext('2d')
  const extCtx = extCanvas.getContext('2d')
  if (!hctx || !vctx || !extCtx) return

  const baseStore = useBaseStore()
  const zoom = baseStore.canvas ? baseStore.canvas.getZoom() : 1
  const vpt = baseStore.canvas ? baseStore.canvas.viewportTransform : null
  const offsetX = vpt ? vpt[4] : 0
  const offsetY = vpt ? vpt[5] : 0
  const containerRect = canvasContainer.getBoundingClientRect()
  const centerRect = centerArea.getBoundingClientRect()

  const canvasLeft = containerRect.left - centerRect.left - props.rulerOffset + offsetX
  const canvasTop = containerRect.top - centerRect.top - props.rulerOffset + offsetY

  horizontalRuler.width = centerArea.clientWidth - props.rulerOffset
  horizontalRuler.height = props.rulerOffset
  verticalRuler.width = props.rulerOffset
  verticalRuler.height = centerArea.clientHeight - props.rulerOffset
  extCanvas.width = centerArea.clientWidth
  extCanvas.height = centerArea.clientHeight

  drawHorizontal(hctx, horizontalRuler.width, zoom, canvasLeft, props.rulerOffset)
  drawVertical(vctx, verticalRuler.height, zoom, canvasTop, props.rulerOffset)

  // 扩展辅助线（画在覆盖层上）
  extCtx.clearRect(0, 0, extCanvas.width, extCanvas.height)
  if (showGuides) {
    const innerLeft = props.rulerOffset
    const innerTop = props.rulerOffset
    const innerWidth = centerArea.clientWidth - props.rulerOffset
    const innerHeight = centerArea.clientHeight - props.rulerOffset
    // 纵向延伸线（来自水平标尺的刻度）
    const startX = -canvasLeft / zoom
    const endX = startX + props.watchSize / zoom + props.rulerOffset + 800
    for (let i = Math.floor(startX / 10) * 10; i <= endX; i += 10) {
      const x = Math.round(i * zoom + canvasLeft)
      const screenX = x + innerLeft
      extCtx.beginPath()
      extCtx.strokeStyle = i % 100 === 0 ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)'
      extCtx.lineWidth = 1
      extCtx.moveTo(screenX, innerTop)
      extCtx.lineTo(screenX, innerTop + innerHeight)
      extCtx.stroke()
    }
    // 横向延伸线（来自垂直标尺的刻度）
    const startY = -canvasTop / zoom
    const endY = startY + props.watchSize / zoom + props.rulerOffset + 800
    for (let i = Math.floor(startY / 10) * 10; i <= endY; i += 10) {
      const y = Math.round(i * zoom + canvasTop)
      const screenY = y + innerTop
      extCtx.beginPath()
      extCtx.strokeStyle = i % 100 === 0 ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)'
      extCtx.lineWidth = 1
      extCtx.moveTo(innerLeft, screenY)
      extCtx.lineTo(innerLeft + innerWidth, screenY)
      extCtx.stroke()
    }
  }
}

const onDblclick = (e: MouseEvent, isHorizontal: boolean) => {
  const target = e.target as HTMLCanvasElement | null
  if (!target) return
  const rect = target.getBoundingClientRect()
  const baseStore = useBaseStore()
  const zoom = baseStore.canvas ? baseStore.canvas.getZoom() : 1
  const vpt = baseStore.canvas ? baseStore.canvas.viewportTransform : null
  const offsetX = vpt ? vpt[4] : 0
  const offsetY = vpt ? vpt[5] : 0
  if (isHorizontal) {
    const y = e.clientY - rect.top
    const centerArea = document.querySelector('.center-area') as HTMLElement | null
    const canvasContainer = document.querySelector('.canvas-container') as HTMLElement | null
    if (!centerArea || !canvasContainer) return
    const containerRect = canvasContainer.getBoundingClientRect()
    const centerRect = centerArea.getBoundingClientRect()
    const canvasTop = containerRect.top - centerRect.top - props.rulerOffset + offsetY
    const worldY = (y - props.rulerOffset - canvasTop) / zoom
    emitter.emit('add-horizontal-guideline', worldY)
  } else {
    const x = e.clientX - rect.left
    const centerArea = document.querySelector('.center-area') as HTMLElement | null
    const canvasContainer = document.querySelector('.canvas-container') as HTMLElement | null
    if (!centerArea || !canvasContainer) return
    const containerRect = canvasContainer.getBoundingClientRect()
    const centerRect = centerArea.getBoundingClientRect()
    const canvasLeft = containerRect.left - centerRect.left - props.rulerOffset + offsetX
    const worldX = (x - props.rulerOffset - canvasLeft) / zoom
    emitter.emit('add-vertical-guideline', worldX)
  }
}

onMounted(() => {
  update()
  window.addEventListener('resize', update)
  const centerArea = document.querySelector('.center-area') as HTMLElement | null
  centerArea?.addEventListener('scroll', update)
  hRef.value?.addEventListener('dblclick', (e) => onDblclick(e, true))
  vRef.value?.addEventListener('dblclick', (e) => onDblclick(e, false))
  emitter.on('toggle-ruler-guides', (v: unknown) => {
    showGuides = Boolean(v)
    update()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', update)
  const centerArea = document.querySelector('.center-area') as HTMLElement | null
  centerArea?.removeEventListener('scroll', update)
  emitter.off('toggle-ruler-guides')
})

watch(() => props.watchSize, () => update())
</script>

<style scoped>
.rulers {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
}
.ruler-horizontal {
  position: absolute;
  top: 0;
  left: 40px;
  right: 0;
  height: 40px;
  pointer-events: auto;
}
.ruler-vertical {
  position: absolute;
  top: 40px;
  left: 0;
  bottom: 0;
  width: 40px;
  pointer-events: auto;
}
.ruler-extensions {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}
</style>
