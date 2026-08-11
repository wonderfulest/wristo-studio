<template>
  <div class="hand-geometry-settings">
    <div class="field-grid">
      <label v-for="control in positionControls" :key="control.field" class="geometry-field">
        <span>{{ t(control.label) }}</span>
        <el-input-number
          :field="control.field"
          :model-value="valueFor(control.field)"
          :min="control.min"
          :max="control.max"
          :step="control.step"
          controls-position="right"
          @change="update(control.field, $event)"
        />
      </label>
    </div>
    <label class="geometry-field scale-field">
      <span>{{ t('hand.scalePercent') }}</span>
      <div class="scale-control">
        <el-slider
          :model-value="scaleSliderValue"
          :min="0"
          :max="100"
          :step="0.25"
          :format-tooltip="formatScaleTooltip"
          @input="updateScaleFromSlider"
        />
        <el-input-number
          field="scalePercent"
          :model-value="valueFor('scalePercent')"
          :min="10"
          :max="500"
          :step="1"
          controls-position="right"
          @change="update('scalePercent', $event)"
        />
      </div>
      <div class="scale-axis" aria-hidden="true">
        <span>10%</span>
        <span>100%</span>
        <span>500%</span>
      </div>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import { handScalePercentToSlider, handScaleSliderToPercent } from './hand.geometry'

type HandGeometryField = 'centerX' | 'centerY' | 'pivotOffsetX' | 'pivotOffsetY' | 'scalePercent'

const props = defineProps<{
  model?: Record<string, any> | null
}>()

const emit = defineEmits<{
  update: [patch: Record<string, number>]
}>()

const { t } = useI18n()

const controls: Array<{
  field: HandGeometryField
  label: string
  min: number
  max: number
  step: number
}> = [
  { field: 'centerX', label: 'hand.geometryCenterX', min: -9999, max: 9999, step: 1 },
  { field: 'centerY', label: 'hand.geometryCenterY', min: -9999, max: 9999, step: 1 },
  { field: 'pivotOffsetX', label: 'hand.pivotOffsetX', min: -9999, max: 9999, step: 1 },
  { field: 'pivotOffsetY', label: 'hand.pivotOffsetY', min: -9999, max: 9999, step: 1 },
  { field: 'scalePercent', label: 'hand.scalePercent', min: 1, max: 1000, step: 1 },
]

const normalizedModel = computed(() => props.model ?? {})
const positionControls = controls.filter(control => control.field !== 'scalePercent')
const scaleSliderValue = computed(() => handScalePercentToSlider(valueFor('scalePercent')))

function valueFor(field: HandGeometryField): number {
  if (field === 'centerX') return Number(normalizedModel.value.centerX ?? normalizedModel.value.left ?? 0)
  if (field === 'centerY') return Number(normalizedModel.value.centerY ?? normalizedModel.value.top ?? 0)
  if (field === 'scalePercent') return Number(normalizedModel.value.scalePercent ?? 100)
  return Number(normalizedModel.value[field] ?? 0)
}

function update(field: HandGeometryField, value: number | undefined): void {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return
  const normalized = field === 'scalePercent' ? Math.min(500, Math.max(10, numeric)) : numeric
  if (field === 'centerX') {
    emit('update', { centerX: normalized, left: normalized })
    return
  }
  if (field === 'centerY') {
    emit('update', { centerY: normalized, top: normalized })
    return
  }
  emit('update', { [field]: normalized })
}

function updateScaleFromSlider(value: number | number[]): void {
  if (Array.isArray(value)) return
  update('scalePercent', handScaleSliderToPercent(value))
}

function formatScaleTooltip(value: number): string {
  return `${handScaleSliderToPercent(value)}%`
}
</script>

<style scoped>
.hand-geometry-settings {
  margin-top: 12px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.geometry-field {
  display: grid;
  gap: 6px;
  color: var(--studio-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.geometry-field :deep(.el-input-number) {
  width: 100%;
}

.scale-field {
  margin-top: 12px;
}

.scale-control {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px;
  align-items: center;
  gap: 14px;
}

.scale-control :deep(.el-slider) {
  margin: 0 6px;
}

.scale-axis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding-right: 110px;
  color: var(--studio-text-muted);
  font-size: 11px;
  font-weight: 500;
}

.scale-axis span:nth-child(2) {
  text-align: center;
}

.scale-axis span:last-child {
  text-align: right;
}
</style>
