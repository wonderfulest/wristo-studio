<template>
  <div class="settings-section text-settings-panel progress-arc-settings-panel">
    <el-form
      ref="formRef"
      class="progress-arc-form"
      :model="currentModel"
      label-position="top"
      :rules="rules"
    >
      <section class="text-settings-card progress-arc-card">
        <GoalPropertyField v-model="currentModel.goalProperty" @change="updateElement" />
      </section>

      <section class="text-settings-card progress-arc-card">
        <div class="text-settings-grid">
          <div class="text-setting-field">
            <label>{{ t('elementSettings.foregroundStrokeWidth') }}</label>
            <el-input type="number" v-model="mainStrokeWidth" @change="onMainStrokeWidthChange" />
          </div>
          <div class="text-setting-field">
            <label>{{ t('elementSettings.backgroundStrokeWidth') }}</label>
            <el-input type="number" v-model="bgStrokeWidth" @change="onBgStrokeWidthChange" />
          </div>
        </div>
      </section>

      <section class="text-settings-card progress-arc-card">
        <div class="progress-arc-inline-label">
          <label>{{ t('elementSettings.angleSettings') }}</label>
          <el-tooltip :content="tooltipContent" placement="top" effect="light" :show-after="0" raw-content>
            <el-icon class="help-icon"><Warning /></el-icon>
          </el-tooltip>
        </div>
        <div class="text-settings-grid">
          <div class="text-setting-field">
            <label>{{ t('elementSettings.startAngle') }}</label>
            <el-input type="number" v-model="startAngleLocal" @change="onStartAngleChange" />
          </div>
          <div class="text-setting-field">
            <label>{{ t('elementSettings.endAngle') }}</label>
            <el-input type="number" v-model="endAngleLocal" @change="onEndAngleChange" />
          </div>
        </div>
        <div class="text-setting-field progress-arc-direction">
          <label>{{ t('elementSettings.direction') }}</label>
          <el-radio-group class="progress-arc-radio-group" v-model="currentModel.counterClockwise" @change="updateElement">
            <el-radio :label="false">{{ t('elementSettings.clockwise') }}</el-radio>
            <el-radio :label="true">{{ t('elementSettings.counterclockwise') }}</el-radio>
          </el-radio-group>
        </div>
      </section>

      <section class="text-settings-card progress-arc-card">
        <div class="text-setting-field progress-arc-end-cap">
          <label>{{ t('elementSettings.endCap') }}</label>
          <el-radio-group class="progress-arc-radio-group" v-model="currentModel.endCap" @change="onEndCapChange">
            <el-radio label="butt">{{ t('elementSettings.endCapButt') }}</el-radio>
            <el-radio label="round">{{ t('elementSettings.endCapRound') }}</el-radio>
          </el-radio-group>
        </div>
      </section>

      <section class="text-settings-card progress-arc-card">
        <div class="progress-arc-segment-panel" :class="{ 'is-active': currentModel.segmentMode }">
          <div class="progress-arc-segment-header">
            <div class="progress-arc-segment-title">
              <label>{{ t('elementSettings.segmentMode') }}</label>
              <span>{{ currentModel.segmentMode ? t('common.on') : t('common.off') }}</span>
            </div>
            <el-switch v-model="currentModel.segmentMode" @change="onSegmentModeChange" />
          </div>

          <div v-if="currentModel.segmentMode" class="progress-arc-segment-body">
            <div class="progress-arc-segment-preview" aria-hidden="true">
              <span
                v-for="index in segmentPreviewCount"
                :key="index"
                :class="{ active: index <= segmentPreviewActiveCount }"
              />
            </div>

            <div class="text-settings-grid progress-arc-segment-grid">
              <div class="text-setting-field">
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
                  @change="onSegmentsChange" />
              </div>
              <div class="text-setting-field">
                <label>
                  {{ t('elementSettings.gapAngle') }}
                  <strong>{{ gapAngleLocal }} deg</strong>
                </label>
                <el-input-number
                  v-model="gapAngleLocal"
                  :min="0"
                  :max="60"
                  :step="0.5"
                  controls-position="right"
                  @change="onGapAngleChange" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="text-settings-card progress-arc-card">
        <div class="text-settings-grid">
          <div class="text-setting-field">
            <label>{{ t('elementSettings.foregroundColor') }}</label>
            <ColorPicker
              v-model="fgColor"
              enable-gradient
              :gradient-enabled="gradientEnabled"
              :gradient-start-color="gradientStartColor"
              :gradient-end-color="gradientEndColor"
              @change="onFgColorChange"
              @gradient-change="onGradientChange" />
          </div>
          <div class="text-setting-field">
            <label>{{ t('elementSettings.backgroundColor') }}</label>
            <ColorPicker
              v-model="bgColor"
              @change="onBgColorChange" />
          </div>
        </div>
      </section>

      <section class="text-settings-card progress-arc-card">
        <div class="text-setting-field">
          <label>{{ t('elementSettings.progress') }}</label>
          <div class="progress-arc-range-row">
            <input
              type="range"
              :value="Number((currentModel as any).progress || 0) * 100"
              min="0"
              max="100"
              @input="onProgressInput" />
            <span>{{ Math.round(Number((currentModel as any).progress || 0) * 100) }}%</span>
          </div>
        </div>
      </section>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import ColorPicker from '@/components/color-picker/index.vue'
import { ElTooltip } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import GoalPropertyField from '@/elements/common/settings/GoalPropertyField.vue'
import { useI18n } from '@/i18n'

const emit = defineEmits(['close'])
const { t } = useI18n()

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

const formRef = ref<any>(null)

const currentModel = computed<any>(() => {
  return (props as any).config ?? props.element ?? {}
})

// 获取主圆环和背景圆环
const mainRing = computed(() =>
  (props.element as any)?.getObjects()?.find((obj: any) => {
    return obj.id.endsWith('_main')
  })
)
const bgRing = computed(() => (props.element as any)?.getObjects()?.find((obj: any) => obj.id.endsWith('_bg')))

// 颜色本地状态，避免直接修改 fabric 对象属性导致不渲染
const fgColor = ref('#FFFFFF')
const bgColor = ref('#555555')
const gradientEnabled = ref(false)
const gradientStartColor = ref('#FFFFFF')
const gradientEndColor = ref('#00FFFF')

// 本地响应式中间变量，避免直接在输入过程中修改 fabric 对象
const mainRadius = ref(0)
const bgRadius = ref(0)
const mainStrokeWidth = ref(0)
const bgStrokeWidth = ref(0)
const startAngleLocal = ref(0)
const endAngleLocal = ref(0)
const segmentsLocal = ref(12)
const gapAngleLocal = ref(2)
const normalizeEndCap = (value: unknown): 'round' | 'butt' => value === 'round' ? 'round' : 'butt'
const segmentPreviewCount = computed(() => Math.min(16, Math.max(1, segmentsLocal.value)))
const segmentPreviewActiveCount = computed(() => {
  const progress = Math.max(0, Math.min(1, Number((currentModel.value as any)?.progress ?? 0)))
  return Math.max(1, Math.round(segmentPreviewCount.value * progress))
})

// 初始化并在 element 变动时同步颜色
watchEffect(() => {
  const model = currentModel.value as any
  if (model && typeof model.color === 'string') {
    fgColor.value = model.color
  } else if (mainRing.value && typeof mainRing.value.stroke === 'string') {
    fgColor.value = mainRing.value.stroke
  }

  if (model && typeof model.bgColor === 'string') {
    bgColor.value = model.bgColor
  } else if (bgRing.value && typeof bgRing.value.stroke === 'string') {
    bgColor.value = bgRing.value.stroke
  }

  gradientEnabled.value = Boolean(model?.gradientEnabled ?? false)
  gradientStartColor.value = typeof model?.gradientStartColor === 'string'
    ? model.gradientStartColor
    : fgColor.value
  gradientEndColor.value = typeof model?.gradientEndColor === 'string'
    ? model.gradientEndColor
    : '#00FFFF'

  mainRadius.value = Number(model?.radius ?? mainRing.value?.radius ?? 0)
  bgRadius.value = Number(model?.bgRadius ?? bgRing.value?.radius ?? mainRadius.value)
  mainStrokeWidth.value = Number(model?.strokeWidth ?? mainRing.value?.strokeWidth ?? 0)
  bgStrokeWidth.value = Number(model?.bgStrokeWidth ?? bgRing.value?.strokeWidth ?? mainStrokeWidth.value)

  startAngleLocal.value = Number(model?.startAngle ?? 0)
  endAngleLocal.value = Number(model?.endAngle ?? 0)
  segmentsLocal.value = Math.max(1, Math.floor(Number(model?.segments ?? 12)))
  gapAngleLocal.value = Math.max(0, Number(model?.gapAngle ?? 2))
  if (model) {
    model.endCap = normalizeEndCap(model.endCap)
  }
})

// 定义提示内容，使用 HTML 格式
const tooltipContent = computed(() => `
  <div class="tooltip-content">
    <p>1. ${t('elementSettings.angleTip1')}</p>
    <p>2. ${t('elementSettings.angleTip2')}</p>
    <p>3. ${t('elementSettings.angleTip3')}</p>
    <p>4. ${t('elementSettings.angleTip4')}</p>
  </div>
`)

const rules = {
  goalProperty: [{ required: true, message: 'Please select a goal property', trigger: 'change' }]
}

const onMainStrokeWidthChange = (val: number | string) => {
  const n = Number(val)
  mainStrokeWidth.value = n
  void applyUpdate({ strokeWidth: n })
}
const onBgStrokeWidthChange = (val: number | string) => {
  const n = Number(val)
  bgStrokeWidth.value = n
  void applyUpdate({ bgStrokeWidth: n })
}

// 颜色变更：更新本地模型并走统一 applyUpdate
const onFgColorChange = (val: string) => {
  const previousColor = fgColor.value
  fgColor.value = val
  ;(currentModel.value as any).color = val
  const patch: Record<string, string> = { color: val }
  if (!gradientEnabled.value && gradientStartColor.value.toUpperCase() === previousColor.toUpperCase()) {
    gradientStartColor.value = val
    ;(currentModel.value as any).gradientStartColor = val
    patch.gradientStartColor = val
  }
  void applyUpdate(patch)
}
const onGradientChange = (value: { enabled: boolean; startColor: string; endColor: string }) => {
  gradientEnabled.value = value.enabled
  gradientStartColor.value = value.startColor
  gradientEndColor.value = value.endColor
  Object.assign(currentModel.value as any, {
    gradientEnabled: value.enabled,
    gradientStartColor: value.startColor,
    gradientEndColor: value.endColor,
  })
  void applyUpdate({
    gradientEnabled: value.enabled,
    gradientStartColor: value.startColor,
    gradientEndColor: value.endColor,
  })
}
const onBgColorChange = (val: string) => {
  bgColor.value = val
  ;(currentModel.value as any).bgColor = val
  void applyUpdate({ bgColor: val })
}

const onSegmentModeChange = (val: string | number | boolean) => {
  const enabled = Boolean(val)
  ;(currentModel.value as any).segmentMode = enabled
  console.groupCollapsed('[goalArc.panel] segmentMode change')
  console.log('value', val)
  console.log('currentModel', { ...(currentModel.value as any) })
  console.log('patch', {
    segmentMode: enabled,
    segments: segmentsLocal.value,
    gapAngle: gapAngleLocal.value,
  })
  console.groupEnd()
  void applyUpdate({
    segmentMode: enabled,
    segments: segmentsLocal.value,
    gapAngle: gapAngleLocal.value,
  })
}

const onSegmentsChange = (val: number | undefined) => {
  const n = Math.max(1, Math.floor(Number(val ?? 12)))
  segmentsLocal.value = n
  ;(currentModel.value as any).segments = n
  console.groupCollapsed('[goalArc.panel] segments change')
  console.log('value', val)
  console.log('normalized', n)
  console.log('currentModel', { ...(currentModel.value as any) })
  console.groupEnd()
  void applyUpdate({ segments: n })
}

const onGapAngleChange = (val: number | undefined) => {
  const n = Math.max(0, Number(val ?? 0))
  gapAngleLocal.value = n
  ;(currentModel.value as any).gapAngle = n
  console.groupCollapsed('[goalArc.panel] gapAngle change')
  console.log('value', val)
  console.log('normalized', n)
  console.log('currentModel', { ...(currentModel.value as any) })
  console.groupEnd()
  void applyUpdate({ gapAngle: n })
}

const onEndCapChange = (val: string | number | boolean) => {
  const endCap = normalizeEndCap(val)
  ;(currentModel.value as any).endCap = endCap
  void applyUpdate({ endCap })
}

// 变更处理：角度
const normalizeAngle = (v: number | string) => {
  const n = Number(v)
  if (Number.isNaN(n)) return 0
  // 保持 0-359 范围
  let a = Math.round(n) % 360
  if (a < 0) a += 360
  return a
}
const onStartAngleChange = (val: number | string) => {
  const n = normalizeAngle(val)
  startAngleLocal.value = n
  ;(currentModel.value as any).startAngle = n
  void applyUpdate({ startAngle: n })
}
const onEndAngleChange = (val: number | string) => {
  const n = normalizeAngle(val)
  endAngleLocal.value = n
  ;(currentModel.value as any).endAngle = n
  void applyUpdate({ endAngle: n })
}

const applyUpdate = async (patch: Record<string, any>) => {
  try {
    console.groupCollapsed('[goalArc.panel] applyUpdate')
    console.log('patch', patch)
    console.log('hasApplyPatch', Boolean(props.applyPatch))
    console.log('hasConfig', Boolean(props.config))
    console.log('element', {
      id: (props.element as any)?.id,
      left: (props.element as any)?.left,
      top: (props.element as any)?.top,
      width: (props.element as any)?.width,
      height: (props.element as any)?.height,
      segmentMode: (props.element as any)?.segmentMode,
      objectCount: (props.element as any)?.getObjects?.().length,
    })
    console.log('config', props.config)
    console.groupEnd()
    if (props.applyPatch && props.config) {
      props.applyPatch(patch)
      return
    }

    if (props.element) {
      elementManager.updateElement(props.element as any, patch)
    }
  } catch (error) {
    console.error('Form validation failed:', error)
  }
}

// 更新整体（不额外传 patch）
const updateElement = async () => {
  const model = currentModel.value as any
  await applyUpdate({
    counterClockwise: model.counterClockwise,
    goalProperty: model.goalProperty,
    segmentMode: Boolean(model.segmentMode),
    segments: Math.max(1, Math.floor(Number(model.segments ?? segmentsLocal.value))),
    gapAngle: Math.max(0, Number(model.gapAngle ?? gapAngleLocal.value)),
    endCap: normalizeEndCap(model.endCap),
    gradientEnabled: Boolean(model.gradientEnabled),
    gradientStartColor: String(model.gradientStartColor ?? fgColor.value),
    gradientEndColor: String(model.gradientEndColor ?? '#00FFFF'),
  })
}

// 更新进度（通过 elementManager + progress 字段）
const onProgressInput = (e: Event) => {
  const input = e.target as HTMLInputElement | null
  if (!input) return
  const raw = Number(input.value)
  const progress = Number.isFinite(raw) ? raw / 100 : 0
  ;(currentModel.value as any).progress = progress
  void applyUpdate({ progress })
}

// 添加关闭时的验证方法
const handleClose = async () => {
  try {
    await formRef.value?.validate()
    emit('close')
  } catch (error) {
    // ignore validate error on close
  }
}

// 暴露方法给父组件
defineExpose({
  formRef,
  handleClose
})
</script>

<style scoped>
@import '@/assets/styles/settings.css';
@import '@/assets/styles/textSettings.css';

.progress-arc-form,
.progress-arc-card {
  min-width: 0;
}

.progress-arc-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.progress-arc-card :deep(.el-form-item) {
  margin: 0;
}

.progress-arc-card :deep(.el-form-item__label) {
  margin: 0 0 6px;
  color: var(--studio-text-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
}

.progress-arc-card :deep(.el-form-item__content) {
  line-height: 1;
}

.progress-arc-inline-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.progress-arc-inline-label label {
  display: flex;
  align-items: center;
  margin: 0;
  color: var(--studio-text-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
}

.help-icon {
  color: var(--studio-text-subtle);
  font-size: 14px;
  cursor: pointer;
  transition: color 0.2s;
  display: flex;
  align-items: center;
}

.help-icon:hover {
  color: var(--studio-primary);
}

.progress-arc-direction {
  margin-top: 12px;
}

.progress-arc-radio-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.progress-arc-segment-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
  padding: 10px;
  border: 1px solid var(--studio-border);
  border-radius: 8px;
  background: var(--studio-surface-soft);
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.progress-arc-segment-panel.is-active {
  border-color: var(--studio-primary-border);
  background: color-mix(in srgb, var(--studio-primary) 6%, var(--studio-surface));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--studio-primary) 10%, transparent);
}

.progress-arc-segment-header {
  display: flex;
  min-height: 34px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.progress-arc-segment-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.progress-arc-segment-title label {
  margin: 0;
  color: var(--studio-text);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
}

.progress-arc-segment-title span {
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

.progress-arc-segment-panel.is-active .progress-arc-segment-title span {
  border-color: var(--studio-primary-border);
  background: color-mix(in srgb, var(--studio-primary) 12%, transparent);
  color: var(--studio-primary);
}

.progress-arc-segment-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
}

.progress-arc-segment-preview {
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

.progress-arc-segment-preview span {
  height: 6px;
  min-width: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--studio-text-muted) 22%, transparent);
}

.progress-arc-segment-preview span.active {
  background: var(--studio-primary);
}

.progress-arc-segment-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.progress-arc-segment-grid .text-setting-field {
  gap: 6px;
}

.progress-arc-segment-grid .text-setting-field > label strong {
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

.progress-arc-segment-grid :deep(.el-input-number) {
  width: 100%;
}

.progress-arc-radio-group :deep(.el-radio) {
  height: 34px;
  margin: 0;
  padding: 0 10px;
  border: 1px solid var(--studio-border);
  border-radius: 6px;
  background: var(--studio-surface);
}

.progress-arc-radio-group :deep(.el-radio.is-checked) {
  border-color: var(--studio-primary-border);
  background: color-mix(in srgb, var(--studio-primary) 8%, transparent);
}

.progress-arc-range-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px;
  align-items: center;
  gap: 10px;
}

.progress-arc-range-row input[type='range'] {
  margin: 0;
}

.progress-arc-range-row span {
  color: var(--studio-text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  text-align: right;
}

/* 调整提示框样式 */
:deep(.el-tooltip__trigger) {
  display: flex;
  align-items: center;
}

:deep(.el-tooltip__popper) {
  max-width: 300px;
}

:deep(.tooltip-content) {
  line-height: 1.5;
  font-size: 14px;
}

:deep(.tooltip-content p) {
  margin: 0;
  padding: 2px 0;
}

:deep(.tooltip-content p:not(:last-child)) {
  margin-bottom: 4px;
}
</style>
