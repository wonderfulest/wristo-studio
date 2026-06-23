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
            <label>{{ t('elementSettings.foregroundRadius') }}</label>
            <el-input type="number" v-model="mainRadius" disabled @change="onMainRadiusChange" />
          </div>
          <div class="text-setting-field">
            <label>{{ t('elementSettings.backgroundRadius') }}</label>
            <el-input type="number" v-model="bgRadius" disabled @change="onBgRadiusChange" />
          </div>
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
        <div class="text-settings-grid">
          <div class="text-setting-field">
            <label>{{ t('elementSettings.foregroundColor') }}</label>
            <ColorPicker
              v-model="fgColor"
              @change="onFgColorChange" />
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

// 本地响应式中间变量，避免直接在输入过程中修改 fabric 对象
const mainRadius = ref(0)
const bgRadius = ref(0)
const mainStrokeWidth = ref(0)
const bgStrokeWidth = ref(0)
const startAngleLocal = ref(0)
const endAngleLocal = ref(0)

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

  mainRadius.value = Number(model?.radius ?? mainRing.value?.radius ?? 0)
  bgRadius.value = Number(model?.bgRadius ?? bgRing.value?.radius ?? mainRadius.value)
  mainStrokeWidth.value = Number(model?.strokeWidth ?? mainRing.value?.strokeWidth ?? 0)
  bgStrokeWidth.value = Number(model?.bgStrokeWidth ?? bgRing.value?.strokeWidth ?? mainStrokeWidth.value)

  startAngleLocal.value = Number(model?.startAngle ?? 0)
  endAngleLocal.value = Number(model?.endAngle ?? 0)
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

// 变更处理：半径与描边
const onMainRadiusChange = (val: number | string) => {
  const n = Number(val)
  mainRadius.value = n
  void applyUpdate({ radius: n })
}
const onBgRadiusChange = (val: number | string) => {
  const n = Number(val)
  bgRadius.value = n
  void applyUpdate({ bgRadius: n })
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
  fgColor.value = val
  ;(currentModel.value as any).color = val
  void applyUpdate({ color: val })
}
const onBgColorChange = (val: string) => {
  bgColor.value = val
  ;(currentModel.value as any).bgColor = val
  void applyUpdate({ bgColor: val })
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
