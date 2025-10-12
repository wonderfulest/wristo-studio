<template>
  <div class="moon-preview">
    <h3 class="title">Moon Phase Preview (phase: 0 → 1, 0/1 New Moon, 0.5 Full Moon)</h3>
    <canvas ref="canvasRef" class="canvas" width="400" height="220"></canvas>
    <div class="controls">
      <label class="label">
        Phase:
        <input
          class="range"
          type="range"
          min="0"
          max="1"
          step="0.001"
          v-model.number="phase"
        />
      </label>
      <span class="phase-val">{{ phase.toFixed(3) }}</span>
      <button class="btn" @click="setNow">Set from Today</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { MoonDrawOptions } from '@/types/moon'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const phase = ref<number>(0.25)

function getMoonPhaseFraction(date: Date = new Date()): number {
  const knownNewUtc = Date.UTC(2000, 0, 6, 18, 14, 0)
  const synodicMs = 29.530588853 * 24 * 3600 * 1000
  const diff = date.getTime() - knownNewUtc
  const age = ((diff % synodicMs) + synodicMs) % synodicMs
  return age / synodicMs
}

function drawMoon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  p: number,
  opts: MoonDrawOptions = {}
): void {
  const moonColor = opts.moonColor ?? '#F2F3F4'
  const shadowColor = opts.shadowColor ?? '#1a1f27'
  const terminatorSoftness = opts.terminatorSoftness ?? 1.0

  ctx.save()
  ctx.clearRect(x - r - 2, y - r - 2, 2 * r + 4, 2 * r + 4)

  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  ctx.fillStyle = shadowColor
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r)

  const shift = (0.5 - p) * 4 * r

  ctx.beginPath()
  ctx.arc(x + shift, y, r, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fillStyle = moonColor
  ctx.fill()

  const gx = x + shift * 0.45
  const gy = y
  const g = ctx.createRadialGradient(
    gx,
    gy,
    Math.max(1, r * 0.05),
    gx,
    gy,
    r * (1.0 + 0.4 * terminatorSoftness)
  )
  g.addColorStop(0.0, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.12)')
  g.addColorStop(1.0, 'rgba(0,0,0,0)')

  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r)

  ctx.globalCompositeOperation = 'source-over'
  ctx.beginPath()
  ctx.arc(x - r * 0.38, y - r * 0.38, r * 0.12, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.fill()

  ctx.restore()
}

function render(): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  const cx = w / 2
  const cy = h / 2
  const r = Math.min(w, h) * 0.28
  drawMoon(ctx, cx, cy, r, phase.value, {
    moonColor: '#F4F6F7',
    shadowColor: '#0b1220',
    terminatorSoftness: 1.0,
  })
}

function setNow(): void {
  phase.value = getMoonPhaseFraction(new Date())
}

onMounted(() => {
  render()
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.addEventListener('dblclick', () => {
    setNow()
    render()
  })
})

watch(phase, () => {
  render()
})
</script>

<style scoped>
.moon-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
}
.title {
  margin: 0;
}
.canvas {
  background: #0b1220;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
}
.controls {
  display: flex;
  gap: 12px;
  align-items: center;
}
.label {
  display: flex;
  gap: 8px;
  align-items: center;
}
.range {
  width: 260px;
}
.btn {
  padding: 6px 12px;
}
.phase-val {
  font-variant-numeric: tabular-nums;
}
</style>

