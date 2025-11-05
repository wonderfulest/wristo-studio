<template>
  <div class="settings-section">
    <h3>Goal Arc Settings</h3>

    <el-form ref="formRef" :model="element" label-position="left" label-width="100px" :rules="rules">
      <GoalPropertyField v-model="element.goalProperty" @change="updateElement" />
      <!-- 位置设置 -->
      <div class="setting-item">
        <label>Position</label>
        <PositionInputs 
          :left="element.left"
          :top="element.top"
          @update:left="(v)=> element.left = v"
          @update:top="(v)=> element.top = v"
          @change="(p)=> updateElement({ left: Math.round(p.left), top: Math.round(p.top) })"
        />
      </div>
      <!-- 尺寸属性 -->
      <div class="setting-item">
        <label>Size</label>
        <div class="size-inputs">
          <div class="input-group">
            <label>Foreground Radius</label>
            <input type="number" :value="mainRing?.radius" @input="(e) => (mainRing.radius = Number(e.target.value))" @change="updateElement" />
          </div>
          <div class="input-group">
            <label>Background Radius</label>
            <input type="number" :value="bgRing?.radius" @input="(e) => (bgRing.radius = Number(e.target.value))" @change="updateElement" />
          </div>
          <div class="input-group">
            <label>Foreground Stroke Width</label>
            <input type="number" :value="mainRing?.strokeWidth" @input="(e) => (mainRing.strokeWidth = Number(e.target.value))" @change="updateElement" />
          </div>
          <div class="input-group">
            <label>Background Stroke Width</label>
            <input type="number" :value="bgRing?.strokeWidth" @input="(e) => (bgRing.strokeWidth = Number(e.target.value))" @change="updateElement" />
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
            <input type="number" :value="element.startAngle" @input="(e) => (element.startAngle = Number(e.target.value))" @change="updateElement" />
          </div>
          <div class="input-group">
            <label>End Angle</label>
            <input type="number" :value="element.endAngle" @input="(e) => (element.endAngle = Number(e.target.value))" @change="updateElement" />
          </div>
        </div>
        <!-- 添加方向选择 -->
        <div class="direction-group">
          <label>Direction</label>
          <el-radio-group v-model="element.counterClockwise" @change="updateElement">
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
              @change="
                (val) => {
                  goalArcStore.updateElement(element, {
                    color: val
                  })
                }
              " />
          </div>
          <div class="input-group">
            <label>Background Color</label>
            <ColorPicker
              v-model="bgColor"
              @change="
                (val) => {
                  goalArcStore.updateElement(element, {
                    bgColor: val
                  })
                }
              " />
          </div>
        </div>
      </div>

      <!-- 进度值（用于测试） -->
      <div class="setting-item">
        <label>Progress</label>
        <input
          type="range"
          :value="goalArcStore.progressMap.get(element.id) * 100"
          min="0"
          max="100"
          @input="
            (e) => {
              goalArcStore.progressMap.set(element.id, Number(e.target.value) / 100)
              updateProgress()
            }
          " />
        <span>{{ Math.round(goalArcStore.progressMap.get(element.id) * 100) }}%</span>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, watch, computed, defineEmits, defineExpose, watchEffect } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { useGoalArcStore } from '@/stores/elements/goal/goalArcElement'
import ColorPicker from '@/components/color-picker/index.vue'
import { DataTypeOptions } from '@/config/settings'
import { ElTooltip } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import PositionInputs from '@/components/settings/common/PositionInputs.vue'
import GoalPropertyField from '@/components/settings/common/GoalPropertyField.vue'

const emit = defineEmits(['close'])

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const baseStore = useBaseStore()
const goalArcStore = useGoalArcStore()

const formRef = ref(null)

// 获取主圆环和背景圆环
const mainRing = computed(() =>
  props.element.getObjects().find((obj) => {
    return obj.id.endsWith('_main')
  })
)
const bgRing = computed(() => props.element.getObjects().find((obj) => obj.id.endsWith('_bg')))

// 颜色本地状态，避免直接修改 fabric 对象属性导致不渲染
const fgColor = ref('#FFFFFF')
const bgColor = ref('#555555')

// 初始化并在 element 变动时同步颜色
watchEffect(() => {
  if (mainRing.value && typeof mainRing.value.stroke === 'string') {
    fgColor.value = mainRing.value.stroke
  }
  if (bgRing.value && typeof bgRing.value.stroke === 'string') {
    bgColor.value = bgRing.value.stroke
  }
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

// 更新元素
const updateElement = async () => {
  try {
    await formRef.value.validate()
    if (!mainRing.value || !bgRing.value) return

    // 使用store中的方法更新元素
    goalArcStore.updateElement(props.element, {
      left: props.element.left,
      top: props.element.top,
      radius: mainRing.value.radius,
      bgRadius: bgRing.value.radius,
      strokeWidth: mainRing.value.strokeWidth,
      bgStrokeWidth: bgRing.value.strokeWidth,
      color: fgColor.value,
      bgColor: bgColor.value,
      startAngle: props.element.startAngle,
      endAngle: props.element.endAngle,
      counterClockwise: props.element.counterClockwise,
      goalProperty: props.element.goalProperty,
      progress: goalArcStore.progressMap.get(props.element.id)
    })

  } catch (error) {
    console.error('Form validation failed:', error)
  }
}

const updateMetricType = () => {
  if (!props.element || !baseStore.canvas) return
  props.element.set('metricSymbol', metricSymbol.value)
  baseStore.canvas.renderAll()
}

// 更新位置
const updatePosition = () => {
  if (!props.element) return

  goalArcStore.updateElement(props.element, {
    left: props.element.left,
    top: props.element.top
  })
}

// 更新进度
const updateProgress = () => {
  goalArcStore.updateProgress(props.element, goalArcStore.progressMap.get(props.element.id))
}

// 添加关闭时的验证方法
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
