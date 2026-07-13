<template>
  <section class="rgb565-spectrum">
    <div class="rgb565-spectrum-heading">{{ t('colorPicker.rgb565Color') }}</div>
    <div
      ref="spectrumRef"
      class="rgb565-spectrum-field"
      role="slider"
      tabindex="0"
      :aria-label="t('colorPicker.saturationBrightness')"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="Math.round(saturation * 100)"
      :style="spectrumStyle"
      @pointerdown="startSpectrumDrag"
      @pointermove="moveSpectrumDrag"
      @pointerup="stopSpectrumDrag"
      @pointercancel="stopSpectrumDrag"
      @keydown="handleSpectrumKeydown">
      <span class="rgb565-spectrum-cursor" :style="spectrumCursorStyle"></span>
    </div>
    <div
      ref="hueRef"
      class="rgb565-spectrum-hue"
      role="slider"
      tabindex="0"
      :aria-label="t('colorPicker.hue')"
      aria-valuemin="0"
      aria-valuemax="360"
      :aria-valuenow="Math.round(hue)"
      @pointerdown="startHueDrag"
      @pointermove="moveHueDrag"
      @pointerup="stopHueDrag"
      @pointercancel="stopHueDrag"
      @keydown="handleHueKeydown">
      <span class="rgb565-hue-cursor" :style="hueCursorStyle"></span>
    </div>
    <div class="rgb565-spectrum-result">
      <span class="rgb565-result-swatch" :style="{ backgroundColor: quantizedColor }"></span>
      <code>{{ quantizedColor }}</code>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import { clampUnit, hsvToRgb, normalizeRgb565Hex, parseHexColor, rgbToHex, rgbToHsv } from '@/utils/rgb565Color'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ change: [value: string] }>()
const { t } = useI18n()

const spectrumRef = ref<HTMLElement | null>(null)
const hueRef = ref<HTMLElement | null>(null)
const hue = ref(0)
const saturation = ref(0)
const brightness = ref(1)
const spectrumDragging = ref(false)
const hueDragging = ref(false)

const rawColor = computed(() => rgbToHex(hsvToRgb({ h: hue.value, s: saturation.value, v: brightness.value })))
const quantizedColor = computed(() => normalizeRgb565Hex(rawColor.value))
const hueColor = computed(() => rgbToHex(hsvToRgb({ h: hue.value, s: 1, v: 1 })))
const spectrumStyle = computed(() => ({
  backgroundColor: hueColor.value,
  backgroundImage: 'linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, transparent)'
}))
const spectrumCursorStyle = computed(() => ({
  left: `${saturation.value * 100}%`,
  top: `${(1 - brightness.value) * 100}%`,
  backgroundColor: quantizedColor.value
}))
const hueCursorStyle = computed(() => ({ left: `${(hue.value / 360) * 100}%` }))

const syncFromValue = (value: unknown) => {
  const hsv = rgbToHsv(parseHexColor(value) ?? { r: 255, g: 255, b: 255 })
  hue.value = hsv.h
  saturation.value = hsv.s
  brightness.value = hsv.v
}

const emitCurrentColor = () => emit('change', quantizedColor.value)

const updateSpectrumFromPointer = (event: PointerEvent) => {
  if (!spectrumRef.value) return
  const rect = spectrumRef.value.getBoundingClientRect()
  saturation.value = clampUnit((event.clientX - rect.left) / rect.width)
  brightness.value = 1 - clampUnit((event.clientY - rect.top) / rect.height)
  emitCurrentColor()
}

const updateHueFromPointer = (event: PointerEvent) => {
  if (!hueRef.value) return
  const rect = hueRef.value.getBoundingClientRect()
  hue.value = clampUnit((event.clientX - rect.left) / rect.width) * 360
  emitCurrentColor()
}

const startSpectrumDrag = (event: PointerEvent) => {
  spectrumDragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  updateSpectrumFromPointer(event)
}
const moveSpectrumDrag = (event: PointerEvent) => {
  if (spectrumDragging.value) updateSpectrumFromPointer(event)
}
const stopSpectrumDrag = () => {
  spectrumDragging.value = false
}

const startHueDrag = (event: PointerEvent) => {
  hueDragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  updateHueFromPointer(event)
}
const moveHueDrag = (event: PointerEvent) => {
  if (hueDragging.value) updateHueFromPointer(event)
}
const stopHueDrag = () => {
  hueDragging.value = false
}

const handleSpectrumKeydown = (event: KeyboardEvent) => {
  const step = 0.01
  if (event.key === 'ArrowLeft') saturation.value = clampUnit(saturation.value - step)
  else if (event.key === 'ArrowRight') saturation.value = clampUnit(saturation.value + step)
  else if (event.key === 'ArrowUp') brightness.value = clampUnit(brightness.value + step)
  else if (event.key === 'ArrowDown') brightness.value = clampUnit(brightness.value - step)
  else return
  event.preventDefault()
  emitCurrentColor()
}

const handleHueKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowLeft') hue.value = (hue.value + 359) % 360
  else if (event.key === 'ArrowRight') hue.value = (hue.value + 1) % 360
  else return
  event.preventDefault()
  emitCurrentColor()
}

watch(() => props.modelValue, syncFromValue, { immediate: true })
</script>

<style scoped>
.rgb565-spectrum {
  display: grid;
  gap: 12px;
}

.rgb565-spectrum-heading {
  color: var(--studio-text);
  font-size: 13px;
  font-weight: 600;
}

.rgb565-spectrum-field {
  position: relative;
  width: 100%;
  height: 170px;
  overflow: hidden;
  border: 1px solid var(--studio-border);
  border-radius: 8px;
  cursor: crosshair;
  touch-action: none;
}

.rgb565-spectrum-hue {
  position: relative;
  height: 18px;
  border: 1px solid var(--studio-border);
  border-radius: 999px;
  background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
  cursor: ew-resize;
  touch-action: none;
}

.rgb565-spectrum-field:focus-visible,
.rgb565-spectrum-hue:focus-visible {
  outline: 2px solid var(--studio-primary);
  outline-offset: 2px;
}

.rgb565-spectrum-cursor,
.rgb565-hue-cursor {
  position: absolute;
  pointer-events: none;
  transform: translate(-50%, -50%);
  border: 2px solid #fff;
  box-shadow:
    0 0 0 1px #000,
    0 1px 4px rgb(0 0 0 / 35%);
}

.rgb565-spectrum-cursor {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.rgb565-hue-cursor {
  top: 50%;
  width: 6px;
  height: 24px;
  border-radius: 4px;
  background: #fff;
}

.rgb565-spectrum-result {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--studio-text-muted);
}

.rgb565-result-swatch {
  width: 28px;
  height: 28px;
  border: 1px solid var(--studio-border);
  border-radius: 6px;
}
</style>
