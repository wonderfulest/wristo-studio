<template>
  <div class="settings-section text-settings-panel battery-settings-panel">
    <section class="text-settings-card">
      <div class="battery-settings-group-label">{{ t('elementSettings.basicSize') }}</div>
      <div class="text-settings-grid">
        <div class="text-setting-field">
          <label>{{ t('elementSettings.width') }}</label>
          <el-input-number v-model="currentModel.width" :min="20" :max="500" @change="updateElement" />
        </div>
        <div class="text-setting-field">
          <label>{{ t('elementSettings.height') }}</label>
          <el-input-number v-model="currentModel.height" :min="10" :max="300" @change="updateElement" />
        </div>
        <div class="text-setting-field">
          <label>{{ t('elementSettings.padding') }}</label>
          <el-input-number v-model="currentModel.padding" :min="0" :max="20" @change="updateElement" />
        </div>
        <div class="text-setting-field">
          <label>{{ t('elementSettings.headGap') }}</label>
          <el-input-number v-model="currentModel.headGap" :min="0" :max="20" @change="updateElement" />
        </div>
      </div>
    </section>

    <section class="text-settings-card">
      <div class="battery-settings-group-label">{{ t('elementSettings.bodyStyle') }}</div>
      <div class="text-settings-grid">
        <div class="text-setting-field">
          <label>{{ t('elementSettings.borderColor') }}</label>
          <color-picker v-model="currentModel.bodyStroke" @change="updateElement" />
        </div>
        <div class="text-setting-field">
          <label>{{ t('elementSettings.fillColor') }}</label>
          <color-picker v-model="currentModel.bodyFill" @change="updateElement" />
        </div>
        <div class="text-setting-field">
          <label>{{ t('elementSettings.borderWidth') }}</label>
          <el-input-number v-model="currentModel.bodyStrokeWidth" :min="0" :max="10" @change="updateElement" />
        </div>
        <div class="text-settings-pair">
          <div class="text-setting-field">
            <label>{{ t('elementSettings.borderRadiusX') }}</label>
            <el-input-number v-model="currentModel.bodyRx" :min="0" :max="50" @change="updateElement" />
          </div>
          <div class="text-setting-field">
            <label>{{ t('elementSettings.borderRadiusY') }}</label>
            <el-input-number v-model="currentModel.bodyRy" :min="0" :max="50" @change="updateElement" />
          </div>
        </div>
      </div>
    </section>

    <section class="text-settings-card">
      <div class="battery-settings-group-label">{{ t('elementSettings.headStyle') }}</div>
      <div class="text-settings-grid">
        <div class="text-setting-field">
          <label>{{ t('elementSettings.width') }}</label>
          <el-input-number v-model="currentModel.headWidth" :min="2" :max="50" @change="updateElement" />
        </div>
        <div class="text-setting-field">
          <label>{{ t('elementSettings.height') }}</label>
          <el-input-number v-model="currentModel.headHeight" :min="2" :max="100" @change="updateElement" />
        </div>
        <div class="text-setting-field">
          <label>{{ t('elementSettings.fillColor') }}</label>
          <color-picker v-model="currentModel.headFill" @change="updateElement" />
        </div>
        <div class="text-settings-pair">
          <div class="text-setting-field">
            <label>{{ t('elementSettings.borderRadiusX') }}</label>
            <el-input-number v-model="currentModel.headRx" :min="0" :max="20" @change="updateElement" />
          </div>
          <div class="text-setting-field">
            <label>{{ t('elementSettings.borderRadiusY') }}</label>
            <el-input-number v-model="currentModel.headRy" :min="0" :max="20" @change="updateElement" />
          </div>
        </div>
      </div>
    </section>

    <section class="text-settings-card">
      <div class="battery-settings-group-label">{{ t('elementSettings.levelStyle') }}</div>
      <div class="text-settings-grid">
        <div class="text-setting-field full battery-level-control">
          <label>
            {{ t('elementSettings.level') }}
            <span class="battery-level-value">{{ Math.round((currentModel.level || 0) * 100) }}%</span>
          </label>
          <el-slider
            v-model="currentModel.level"
            :class="{ 'battery-level-slider--light': isCurrentLevelColorLight }"
            :style="batteryLevelSliderStyle"
            :min="0"
            :max="1"
            :step="0.01"
            :format-tooltip="(val: number) => `${Math.round(val * 100)}%`"
            @change="updateElement"
          />
          <div class="battery-color-ranges">
            <div
              v-for="range in batteryColorRanges"
              :key="range.field"
              class="battery-color-range"
            >
              <span class="battery-color-range-label">{{ t(range.labelKey) }}</span>
              <color-picker
                v-model="currentModel[range.field]"
                class="battery-color-range-picker"
                @change="updateElement"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import ColorPicker from '@/components/color-picker/index.vue'
import { DEFAULT_LEVEL_COLOR_HIGH, DEFAULT_LEVEL_COLOR_LOW, DEFAULT_LEVEL_COLOR_MEDIUM, resolveBatteryParts } from '@/elements/status/battery/battery.encoder'
import { useI18n } from '@/i18n'

const props = defineProps({
  element: {
    type: Object,
    required: false,
  },
  config: {
    type: Object,
    required: false,
  },
  applyPatch: {
    type: Function,
    required: false,
  },
})

const { t } = useI18n()

const batteryColorRanges = [
  { field: 'levelColorLow', labelKey: 'elementSettings.batteryRangeLow' },
  { field: 'levelColorMedium', labelKey: 'elementSettings.batteryRangeMedium' },
  { field: 'levelColorHigh', labelKey: 'elementSettings.batteryRangeHigh' },
] as const

const currentModel = computed<any>(() => {
  return (props.config as any) ?? props.element ?? {}
})

const currentLevelColor = computed(() => {
  const level = Number(currentModel.value.level ?? 0)
  if (level < 0.2) {
    return currentModel.value.levelColorLow || DEFAULT_LEVEL_COLOR_LOW
  }
  if (level <= 0.5) {
    return currentModel.value.levelColorMedium || DEFAULT_LEVEL_COLOR_MEDIUM
  }
  return currentModel.value.levelColorHigh || DEFAULT_LEVEL_COLOR_HIGH
})

const normalizeHexColor = (color: unknown): string | null => {
  if (typeof color !== 'string') return null
  const trimmed = color.trim()
  if (trimmed === 'transparent') return null
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed
  if (/^0x[0-9a-f]{6}$/i.test(trimmed)) return `#${trimmed.slice(2)}`
  return null
}

const isLightColor = (color: unknown): boolean => {
  const hex = normalizeHexColor(color)
  if (!hex) return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance > 0.78
}

const isCurrentLevelColorLight = computed(() => isLightColor(currentLevelColor.value))

const batteryLevelSliderStyle = computed<Record<string, string>>(() => ({
  '--battery-level-color': currentLevelColor.value,
}))

if (!props.applyPatch && props.element) {
  const group = elementManager.getElementById((props.element as any).id) as any

  if ((props.element as any).levelColorLow == null) {
    ;(props.element as any).levelColorLow = (group as any)?.levelColorLow || DEFAULT_LEVEL_COLOR_LOW
  }
  if ((props.element as any).levelColorMedium == null) {
    ;(props.element as any).levelColorMedium = (group as any)?.levelColorMedium || DEFAULT_LEVEL_COLOR_MEDIUM
  }
  if ((props.element as any).levelColorHigh == null) {
    ;(props.element as any).levelColorHigh = (group as any)?.levelColorHigh || DEFAULT_LEVEL_COLOR_HIGH
  }
}

const initElementProperties = () => {
  if (!props.element) return

  const group = elementManager.getElementById((props.element as any).id) as any
  if (!group) return

  const parts = resolveBatteryParts(group)
  if (!parts) return
  const batteryBody = parts.body
  const batteryHead = parts.head
  const batteryLevel = parts.level

  ;(props.element as any).width = Math.round((batteryBody as any).width)
  ;(props.element as any).height = Math.round((batteryBody as any).height)
  ;(props.element as any).bodyFill = (batteryBody as any).fill
  ;(props.element as any).bodyStroke = (batteryBody as any).stroke
  ;(props.element as any).bodyStrokeWidth = Math.round((batteryBody as any).strokeWidth)
  ;(props.element as any).bodyRx = Math.round((batteryBody as any).rx)
  ;(props.element as any).bodyRy = Math.round((batteryBody as any).ry)

  ;(props.element as any).headWidth = Math.round((batteryHead as any).width)
  ;(props.element as any).headHeight = Math.round((batteryHead as any).height)
  ;(props.element as any).headFill = (batteryHead as any).fill
  ;(props.element as any).headRx = Math.round((batteryHead as any).rx)
  ;(props.element as any).headRy = Math.round((batteryHead as any).ry)

  const padding = Math.round((batteryLevel as any).left - (batteryBody as any).left)
  ;(props.element as any).padding = padding

  ;(props.element as any).level = (batteryLevel as any).width / ((batteryBody as any).width - padding * 2)

  const headGap = Math.round((batteryHead as any).left - ((batteryBody as any).left + (batteryBody as any).width))
  ;(props.element as any).headGap = headGap

  if (group) {
    if ((props.element as any).levelColorLow == null) (props.element as any).levelColorLow = (group as any).levelColorLow || DEFAULT_LEVEL_COLOR_LOW
    if ((props.element as any).levelColorMedium == null) (props.element as any).levelColorMedium = (group as any).levelColorMedium || DEFAULT_LEVEL_COLOR_MEDIUM
    if ((props.element as any).levelColorHigh == null) (props.element as any).levelColorHigh = (group as any).levelColorHigh || DEFAULT_LEVEL_COLOR_HIGH
  }
}

onMounted(() => {
  if (!props.applyPatch) {
    initElementProperties()
  }
})

const updateElement = () => {
  if (props.applyPatch && props.config) {
    props.applyPatch({
      width: currentModel.value.width,
      height: currentModel.value.height,
      padding: currentModel.value.padding,
      headGap: currentModel.value.headGap,
      bodyStroke: currentModel.value.bodyStroke,
      bodyFill: currentModel.value.bodyFill,
      bodyStrokeWidth: currentModel.value.bodyStrokeWidth,
      bodyRx: currentModel.value.bodyRx,
      bodyRy: currentModel.value.bodyRy,
      headWidth: currentModel.value.headWidth,
      headHeight: currentModel.value.headHeight,
      headFill: currentModel.value.headFill,
      headRx: currentModel.value.headRx,
      headRy: currentModel.value.headRy,
      level: currentModel.value.level,
      levelColorLow: currentModel.value.levelColorLow,
      levelColorMedium: currentModel.value.levelColorMedium,
      levelColorHigh: currentModel.value.levelColorHigh,
    })
    return
  }

  if (!props.element) return

  elementManager.updateElement(props.element as any, {
    width: (props.element as any).width,
    height: (props.element as any).height,
    bodyFill: (props.element as any).bodyFill,
    bodyStroke: (props.element as any).bodyStroke,
    bodyStrokeWidth: (props.element as any).bodyStrokeWidth,
    bodyRx: (props.element as any).bodyRx,
    bodyRy: (props.element as any).bodyRy,
    headWidth: (props.element as any).headWidth,
    headHeight: (props.element as any).headHeight,
    headFill: (props.element as any).headFill,
    headRx: (props.element as any).headRx,
    headRy: (props.element as any).headRy,
    padding: (props.element as any).padding,
    level: (props.element as any).level,
    levelColorLow: (props.element as any).levelColorLow,
    levelColorMedium: (props.element as any).levelColorMedium,
    levelColorHigh: (props.element as any).levelColorHigh,
    left: (props.element as any).left,
    top: (props.element as any).top,
    headGap: (props.element as any).headGap,
  })
}
</script>

<style scoped>
@import '@/assets/styles/settings.css';
@import '@/assets/styles/textSettings.css';

.battery-settings-panel :deep(.el-input-number) {
  width: 100%;
}

.battery-settings-panel :deep(.el-input-number .el-input__wrapper) {
  width: 100%;
}

.battery-settings-panel :deep(.el-slider) {
  --el-slider-main-bg-color: var(--battery-level-color, var(--studio-primary));
  --el-slider-runway-bg-color: var(--studio-border);
  margin: -2px 6px 0;
}

.battery-settings-panel :deep(.battery-level-slider--light .el-slider__bar) {
  box-shadow:
    inset 0 0 0 1px var(--studio-border-strong),
    0 1px 2px rgba(15, 23, 42, 0.12);
}

.battery-settings-panel :deep(.battery-level-slider--light .el-slider__button) {
  border-color: var(--studio-border-strong);
  box-shadow:
    0 0 0 2px var(--studio-surface),
    0 1px 4px rgba(15, 23, 42, 0.22);
}

.battery-settings-group-label {
  color: var(--studio-text);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.25;
}

.battery-level-value {
  color: var(--studio-text);
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}

.battery-level-control {
  gap: 5px;
}

.battery-color-ranges {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) minmax(0, 5fr);
  gap: 6px;
  margin-top: -2px;
}

.battery-color-range {
  min-width: 0;
}

.battery-color-range-label {
  display: block;
  margin-bottom: 3px;
  color: var(--studio-text-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1.1;
  text-align: center;
  white-space: nowrap;
}

.battery-color-range-picker {
  width: 100%;
}

.battery-color-range-picker :deep(.color-input),
.battery-color-range-picker :deep(input) {
  width: 100%;
}

.battery-color-range-picker :deep(input) {
  height: 22px;
  padding: 2px 4px;
  border-radius: 5px;
  font-size: 10px;
  line-height: 18px;
}

@media (max-width: 360px) {
  .battery-settings-panel :deep(.el-input-number) {
    min-width: 0;
  }
}
</style>
