<template>
  <div class="settings-section">
    <h3>进度环设置</h3>

    <el-form ref="formRef" :model="element" label-position="left" label-width="100px" :rules="rules">
      <el-form-item label="目标属性" prop="goalProperty" :rules="[{ required: true, message: '请选择目标属性', trigger: 'change' }]">
        <el-select v-model="element.goalProperty" @change="updateElement" placeholder="选择目标属性">
          <el-option v-for="[key, prop] in Object.entries(propertiesStore.allProperties).filter(([_, p]) => p.type === 'goal')" :key="key" :label="prop.title" :value="key" />
        </el-select>
      </el-form-item>
      <!-- 位置设置 -->
      <div class="setting-item">
        <label>位置</label>
        <div class="position-inputs">
          <div class="input-group">
            <label>X</label>
            <input type="number" :value="element.left" @input="(e) => (element.left = Number(e.target.value))" @change="updatePosition" />
          </div>
          <div class="input-group">
            <label>Y</label>
            <input type="number" :value="element.top" @input="(e) => (element.top = Number(e.target.value))" @change="updatePosition" />
          </div>
        </div>
      </div>
      <!-- 尺寸属性 -->
      <div class="setting-item">
        <label>尺寸</label>
        <div class="size-inputs">
          <div class="input-group">
            <label>前景半径</label>
            <input type="number" :value="mainRing?.radius" @input="(e) => (mainRing.radius = Number(e.target.value))" @change="updateElement" />
          </div>
          <div class="input-group">
            <label>背景半径</label>
            <input type="number" :value="bgRing?.radius" @input="(e) => (bgRing.radius = Number(e.target.value))" @change="updateElement" />
          </div>
          <div class="input-group">
            <label>前景线宽</label>
            <input type="number" :value="mainRing?.strokeWidth" @input="(e) => (mainRing.strokeWidth = Number(e.target.value))" @change="updateElement" />
          </div>
          <div class="input-group">
            <label>背景线宽</label>
            <input type="number" :value="bgRing?.strokeWidth" @input="(e) => (bgRing.strokeWidth = Number(e.target.value))" @change="updateElement" />
          </div>
        </div>
      </div>

      <!-- 角度设置 -->
      <div class="setting-item">
        <div class="setting-header">
          <label>角度设置</label>
          <el-tooltip :content="tooltipContent" placement="top" effect="light" :show-after="0" raw-content>
            <el-icon class="help-icon"><Warning /></el-icon>
          </el-tooltip>
        </div>
        <div class="angle-inputs">
          <div class="input-group">
            <label>起始角度</label>
            <input type="number" :value="element.startAngle" @input="(e) => (element.startAngle = Number(e.target.value))" @change="updateElement" />
          </div>
          <div class="input-group">
            <label>结束角度</label>
            <input type="number" :value="element.endAngle" @input="(e) => (element.endAngle = Number(e.target.value))" @change="updateElement" />
          </div>
        </div>
        <!-- 添加方向选择 -->
        <div class="direction-group">
          <label>方向</label>
          <el-radio-group v-model="element.counterClockwise" @change="updateElement">
            <el-radio :label="false">顺时针</el-radio>
            <el-radio :label="true">逆时针</el-radio>
          </el-radio-group>
        </div>
      </div>

      <!-- 颜色属性 -->
      <div class="setting-item">
        <label>颜色</label>
        <div class="color-inputs">
          <div class="input-group">
            <label>前景色</label>
            <ColorPicker
              v-model="mainRing.stroke"
              @change="
                (val) => {
                  console.log('更新前景色:', val)
                  goalArcStore.updateElement(element, {
                    color: val
                  })
                }
              " />
          </div>
          <div class="input-group">
            <label>背景色</label>
            <ColorPicker
              v-model="bgRing.stroke"
              @change="
                (val) => {
                  console.log('更新背景色:', val)
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
        <label>进度值</label>
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
import { ref, watch, computed, defineEmits, defineExpose } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { useGoalArcStore } from '@/stores/elements/goal/goalArcElement'
import ColorPicker from '@/components/color-picker/index.vue'
import { DataTypeOptions } from '@/config/settings'
import { ElTooltip } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import { usePropertiesStore } from '@/stores/properties'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['close'])

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const baseStore = useBaseStore()
const goalArcStore = useGoalArcStore()
const propertiesStore = usePropertiesStore()

const formRef = ref(null)

// 获取主圆环和背景圆环
const mainRing = computed(() =>
  props.element.getObjects().find((obj) => {
    return obj.id.endsWith('_main')
  })
)
const bgRing = computed(() => props.element.getObjects().find((obj) => obj.id.endsWith('_bg')))

// 定义提示内容，使用 HTML 格式
const tooltipContent = `
  <div class="tooltip-content">
    <p>1. 3点钟为0度，6点钟为90度，9点钟为180度，12点钟为270度</p>
    <p>2. 顺时针方向增加角度</p>
    <p>3. 角度范围0到359</p>
    <p>4. 开始和结束的角度不应该相同</p>
  </div>
`

const rules = {
  goalProperty: [{ required: true, message: '请选择目标属性', trigger: 'change' }]
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
      color: mainRing.value.stroke,
      bgColor: bgRing.value.stroke,
      startAngle: props.element.startAngle,
      endAngle: props.element.endAngle,
      counterClockwise: props.element.counterClockwise,
      goalProperty: props.element.goalProperty,
      progress: goalArcStore.progressMap.get(props.element.id)
    })

  } catch (error) {
    console.error('表单验证失败:', error)
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
    ElMessage.warning('请先完成必填项设置')
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
