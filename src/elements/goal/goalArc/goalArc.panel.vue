<template>
  <div class="settings-section">
    <h3>Goal Arc Settings</h3>

    <el-form ref="formRef" :model="currentModel" label-position="left" label-width="100px" :rules="rules">
      <GoalPropertyField v-model="currentModel.goalProperty" @change="updateElement" />
      <!-- 尺寸属性 -->
      <div class="setting-item">
        <div class="size-inputs">
          <div class="input-group">
            <label>Foreground Radius</label>
            <el-input type="number" v-model="mainRadius" disabled @change="onMainRadiusChange" />
          </div>
          <div class="input-group">
            <label>Background Radius</label>
            <el-input type="number" v-model="bgRadius" disabled @change="onBgRadiusChange" />
          </div>
          <div class="input-group">
            <label>Foreground Stroke Width</label>
            <el-input type="number" v-model="mainStrokeWidth" @change="onMainStrokeWidthChange" />
          </div>
          <div class="input-group">
            <label>Background Stroke Width</label>
            <el-input type="number" v-model="bgStrokeWidth" @change="onBgStrokeWidthChange" />
          </div>
        </div>
      </div>

      <!-- 角度设置 -->
      <div class="setting-item">
        <div class="setting-header">
          <label>Angle Settings</label>
          <el-tooltip :content="tooltipContent" placement="top" effect="light" :show-after="0" raw-content>
            <el-icon class="help-icon"><Warning /></el-icon>
          </el-tooltip>
        </div>
        <div class="angle-inputs">
          <div class="input-group">
            <label>Start Angle</label>
            <el-input type="number" v-model="startAngleLocal" @change="onStartAngleChange" />
          </div>
          <div class="input-group">
            <label>End Angle</label>
            <el-input type="number" v-model="endAngleLocal" @change="onEndAngleChange" />
          </div>
        </div>
        <!-- 添加方向选择 -->
        <div class="direction-group">
          <label>Direction</label>
          <el-radio-group v-model="currentModel.counterClockwise" @change="updateElement">
            <el-radio :label="false">Clockwise</el-radio>
            <el-radio :label="true">Counterclockwise</el-radio>
          </el-radio-group>
        </div>
      </div>

      <!-- 颜色属性 -->
      <div class="setting-item">
        <label>Colors</label>
        <div class="color-inputs">
          <div class="input-group">
            <label>Foreground Color</label>
            <ColorPicker
              v-model="fgColor"
              @change="onFgColorChange" />
          </div>
          <div class="input-group">
            <label>Background Color</label>
            <ColorPicker
              v-model="bgColor"
              @change="onBgColorChange" />
          </div>
        </div>
      </div>

      <!-- 进度值（用于测试） -->
      <div class="setting-item">
        <label>Progress</label>
        <input
          type="range"
          :value="Number((currentModel as any).progress || 0) * 100"
          min="0"
          max="100"
          @input="onProgressInput" />
        <span>{{ Math.round(Number((currentModel as any).progress || 0) * 100) }}%</span>
      </div>
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

const emit = defineEmits(['close'])

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
const tooltipContent = `
  <div class="tooltip-content">
    <p>1. 3 o'clock is 0°, 6 o'clock is 90°, 9 o'clock is 180°, 12 o'clock is 270°</p>
    <p>2. Angles increase clockwise</p>
    <p>3. Angle range is 0 to 359</p>
    <p>4. Start and end angles should not be equal</p>
  </div>
`

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

.setting-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.setting-header label {
  display: flex;
  align-items: center;
  line-height: 1;
}

.help-icon {
  color: #909399;
  font-size: 16px;
  cursor: pointer;
  transition: color 0.3s;
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.help-icon:hover {
  color: #409eff;
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
