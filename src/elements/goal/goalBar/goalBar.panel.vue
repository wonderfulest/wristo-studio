<template>
  <div class="settings-section">
    <el-form 
      ref="formRef"
      :model="currentModel" 
      label-position="left" 
      label-width="100px"
      status-icon
    >
      <GoalPropertyField
        v-model="currentModel.goalProperty"
        @change="updateElement"
      />

      <el-form-item v-if="!isSegmentMode" :label="t('elementSettings.padding')">
        <el-input-number 
          v-model="currentModel.padding" 
          :min="0" 
          :max="10" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.progressAlign')">
        <div class="progress-align-control" role="group" :aria-label="t('elementSettings.progressAlign')">
          <button
            type="button"
            class="progress-align-option"
            :class="{ 'is-active': currentModel.progressAlign !== 'right' }"
            @click="setProgressAlign('left')"
          >
            <span class="progress-align-preview is-left" aria-hidden="true"><i /></span>
            <span>{{ t('elementSettings.left') }}</span>
          </button>
          <button
            type="button"
            class="progress-align-option"
            :class="{ 'is-active': currentModel.progressAlign === 'right' }"
            @click="setProgressAlign('right')"
          >
            <span class="progress-align-preview is-right" aria-hidden="true"><i /></span>
            <span>{{ t('elementSettings.right') }}</span>
          </button>
        </div>
      </el-form-item>

      <el-form-item>
        <div class="progress-bar-segment-panel" :class="{ 'is-active': isSegmentMode }">
          <div class="progress-bar-segment-header">
            <div class="progress-bar-segment-title">
              <label>{{ t('elementSettings.segmentMode') }}</label>
              <span>{{ isSegmentMode ? t('common.on') : t('common.off') }}</span>
            </div>
            <el-switch :model-value="isSegmentMode" @change="onSegmentModeChange" />
          </div>

          <div v-if="isSegmentMode" class="progress-bar-segment-body">
            <div class="progress-bar-segment-preview" aria-hidden="true">
              <span
                v-for="index in segmentPreviewCount"
                :key="index"
                :class="{ active: index <= segmentPreviewActiveCount }"
              />
            </div>

            <div class="progress-bar-segment-grid">
              <div class="progress-bar-setting-field">
                <label>
                  {{ t('elementSettings.segments') }}
                  <strong>{{ segmentsLocal }}</strong>
                </label>
                <el-input-number
                  v-model="segmentsLocal"
                  :min="1"
                  :max="120"
                  :step="1"
                  controls-position="right"
                  @change="onSegmentsChange"
                />
              </div>
              <div class="progress-bar-setting-field">
                <label>
                  {{ t('elementSettings.gap') }}
                  <strong>{{ gapLocal }} px</strong>
                </label>
                <el-input-number
                  v-model="gapLocal"
                  :min="0"
                  :max="40"
                  :step="1"
                  controls-position="right"
                  @change="onGapChange"
                />
              </div>
            </div>
          </div>
        </div>
      </el-form-item>

      <el-form-item :label="t('elementSettings.activeColor')">
        <color-picker 
          v-model="currentModel.color" 
          @change="handleMainColorChange" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.backgroundColor')">
        <color-picker 
          v-model="currentModel.bgColor" 
          @change="handleBgColorChange" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.borderWidth')">
        <el-input-number 
          v-model="currentModel.borderWidth" 
          :min="0" 
          :max="10" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.borderColor')">
        <color-picker 
          v-model="currentModel.borderColor" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.borderRadius')">
        <el-input-number 
          v-model="currentModel.borderRadius" 
          :min="0" 
          :max="25" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.progress')">
        <el-slider 
          v-model="currentModel.progress" 
          :min="0" 
          :max="1" 
          :step="0.01" 
          @change="handleProgressChange" 
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import ColorPicker from '@/components/color-picker/index.vue'
import { ElMessage } from 'element-plus'
import GoalPropertyField from '@/elements/common/settings/GoalPropertyField.vue'
import { useI18n } from '@/i18n'

const emit = defineEmits(['close'])
const { t } = useI18n()

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const formRef = ref<any>(null)
const segmentsLocal = ref(10)
const gapLocal = ref(2)

const currentModel = computed<any>(() => {
  console.log('[GoalBarPanel] currentModel', props.config, props.element)
  return props.config ?? props.element ?? {}
})

const isSegmentMode = computed(() => (currentModel.value as any)?.variant === 'segmented')
const segmentPreviewCount = computed(() => Math.min(16, Math.max(1, segmentsLocal.value)))
const segmentPreviewActiveCount = computed(() => {
  const progress = Math.max(0, Math.min(1, Number((currentModel.value as any)?.progress ?? 0)))
  return Math.max(1, Math.round(segmentPreviewCount.value * progress))
})

watchEffect(() => {
  const model = currentModel.value as any
  segmentsLocal.value = Math.max(1, Math.floor(Number(model?.segments ?? 10)))
  gapLocal.value = Math.max(0, Number(model?.gap ?? 2))
  if (model) {
    model.originX = 'center'
    model.originY = 'center'
  }
})

const applyUpdate = async (patch: Record<string, any>) => {
  console.log('[GoalBarPanel] applyUpdate patch', patch, {
    hasConfig: !!props.config,
    hasApplyPatch: !!props.applyPatch,
    hasElement: !!props.element,
  })
  if (props.applyPatch) {
    props.applyPatch(patch)
    return
  }

  if (props.element) {
    elementManager.updateElement(props.element as any, patch)
  }
}

const handleMainColorChange = async (val: string) => {
  await applyUpdate({ color: val })
}

const handleBgColorChange = async (val: string) => {
  await applyUpdate({ bgColor: val })
}

const handleProgressChange = async (val: number) => {
  await applyUpdate({ progress: val })
}

const setProgressAlign = async (value: 'left' | 'right') => {
  ;(currentModel.value as any).progressAlign = value
  await applyUpdate({ progressAlign: value })
}

const onSegmentModeChange = async (val: string | number | boolean) => {
  const enabled = Boolean(val)
  const model = currentModel.value as any
  model.variant = enabled ? 'segmented' : 'continuous'
  if (enabled) {
    model.segments = segmentsLocal.value
    model.gap = gapLocal.value
  }
  await applyUpdate({
    variant: model.variant,
    segments: segmentsLocal.value,
    gap: gapLocal.value,
    padding: enabled ? 0 : model.padding,
  })
}

const onSegmentsChange = async (val: number | undefined) => {
  const n = Math.max(1, Math.floor(Number(val ?? 10)))
  segmentsLocal.value = n
  ;(currentModel.value as any).segments = n
  await applyUpdate({ variant: 'segmented', segments: n })
}

const onGapChange = async (val: number | undefined) => {
  const n = Math.max(0, Number(val ?? 0))
  gapLocal.value = n
  ;(currentModel.value as any).gap = n
  await applyUpdate({ variant: 'segmented', gap: n })
}

const updateElement = async () => {
  try {
    console.log('[GoalBarPanel] applying update without form validate')
    const model = currentModel.value as any
    console.log('[GoalBarPanel] model before patch', {
      progress: model.progress,
      borderRadius: model.borderRadius,
      variant: isSegmentMode.value ? 'segmented' : 'continuous',
      segments: Math.max(1, Math.floor(Number(model.segments ?? segmentsLocal.value))),
      gap: Math.max(0, Number(model.gap ?? gapLocal.value)),
      padding: model.padding,
      progressAlign: model.progressAlign,
      color: model.color,
      bgColor: model.bgColor,
      borderWidth: model.borderWidth,
      borderColor: model.borderColor,
      goalProperty: model.goalProperty,
    })
    await applyUpdate({
      variant: model.variant ?? 'continuous',
      segments: model.segments,
      gap: model.gap,
      borderRadius: model.borderRadius,
      padding: model.padding,
      originX: 'center',
      originY: 'center',
      progressAlign: model.progressAlign,
      color: model.color,
      bgColor: model.bgColor,
      goalProperty: model.goalProperty,
      borderWidth: model.borderWidth,
      borderColor: model.borderColor,
    })
  } catch (error) {
    console.error('Form validation failed:', error)
  }
}

const handleClose = async () => {
  try {
    await formRef.value.validate()
    emit('close')
  } catch (error) {
    ElMessage.warning('Please complete the required fields first')
  }
}

// 暴露方法给父组件
defineExpose({
  formRef,
  handleClose
})
</script>

<style scoped>
.settings-section {
  padding: 16px;
}

.el-form-item {
  margin-bottom: 16px;
}

.progress-align-control {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 3px;
  border: 1px solid var(--studio-border);
  border-radius: 8px;
  background: var(--studio-surface-soft);
}

.progress-align-option {
  display: flex;
  min-width: 0;
  height: 34px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--studio-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.progress-align-option:hover {
  color: var(--studio-text);
  background: color-mix(in srgb, var(--studio-surface) 82%, transparent);
}

.progress-align-option.is-active {
  border-color: var(--studio-primary-border);
  background: var(--studio-surface);
  color: var(--studio-primary);
  box-shadow: 0 1px 2px color-mix(in srgb, #000 10%, transparent);
}

.progress-align-preview {
  position: relative;
  display: block;
  flex: 0 0 auto;
  width: 26px;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--studio-text-muted) 18%, transparent);
}

.progress-align-preview i {
  position: absolute;
  top: 0;
  display: block;
  width: 58%;
  height: 100%;
  border-radius: inherit;
  background: currentColor;
}

.progress-align-preview.is-left i {
  left: 0;
}

.progress-align-preview.is-right i {
  right: 0;
}

.progress-bar-segment-panel {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
  padding: 10px;
  border: 1px solid var(--studio-border);
  border-radius: 8px;
  background: var(--studio-surface-soft);
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.progress-bar-segment-panel.is-active {
  border-color: var(--studio-primary-border);
  background: color-mix(in srgb, var(--studio-primary) 6%, var(--studio-surface));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--studio-primary) 10%, transparent);
}

.progress-bar-segment-header {
  display: flex;
  min-height: 34px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.progress-bar-segment-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.progress-bar-segment-title label {
  margin: 0;
  color: var(--studio-text);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
}

.progress-bar-segment-title span {
  flex: 0 0 auto;
  min-width: 30px;
  padding: 3px 7px;
  border: 1px solid var(--studio-border);
  border-radius: 999px;
  background: var(--studio-surface);
  color: var(--studio-text-muted);
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  text-align: center;
  text-transform: uppercase;
}

.progress-bar-segment-panel.is-active .progress-bar-segment-title span {
  border-color: var(--studio-primary-border);
  background: color-mix(in srgb, var(--studio-primary) 12%, transparent);
  color: var(--studio-primary);
}

.progress-bar-segment-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
}

.progress-bar-segment-preview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(5px, 1fr));
  gap: 4px;
  align-items: center;
  height: 14px;
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--studio-border) 82%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--studio-surface) 78%, transparent);
}

.progress-bar-segment-preview span {
  height: 6px;
  min-width: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--studio-text-muted) 22%, transparent);
}

.progress-bar-segment-preview span.active {
  background: var(--studio-primary);
}

.progress-bar-segment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.progress-bar-setting-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.progress-bar-setting-field > label {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  color: var(--studio-text-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
}

.progress-bar-setting-field > label strong {
  flex: 0 0 auto;
  padding: 2px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--studio-text-muted) 10%, transparent);
  color: var(--studio-text-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: 1.2;
}

.progress-bar-segment-grid :deep(.el-input-number) {
  width: 100%;
}

/* Make ALL validation errors occupy normal flow so they push items below */
:deep(.el-form-item__error) {
  position: static;
  margin-top: 4px;
}

/* Ensure content area doesn't collapse when error appears */
:deep(.el-form-item__content) {
  padding-bottom: 0 !important;
}

/* Reduce line spacing for multi-line labels to the minimum reasonable */
:deep(.el-form-item__label) {
  line-height: 1.1; /* tighter line height for wrapped labels */
  padding-top: 0;   /* remove extra vertical padding */
  padding-bottom: 0;
}

/* When label is wrapped by helper container, ensure same effect */
:deep(.el-form-item__label-wrap .el-form-item__label) {
  line-height: 1.1;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
