<template>
  <div class="settings-section">
    <el-form 
      ref="formRef"
      :model="element" 
      label-position="left" 
      label-width="100px"
      status-icon
      validate-on-rule-change
    >
      <ChartPropertyField v-model="element.chartProperty" @change="updateElement" />
      <el-form-item label="位置">
        <PositionInputs 
          :left="element.left"
          :top="element.top"
          @update:left="(v)=> element.left = v"
          @update:top="(v)=> element.top = v"
          @change="(p)=>{ handlePositionChange('left', p.left); handlePositionChange('top', p.top) }"
        />
      </el-form-item>

      <el-form-item label="宽度">
        <el-input-number 
          v-model="element.width" 
          :min="50" 
          :max="300" 
          @change="updateElement" 
        />
      </el-form-item>
      
      <el-form-item label="高度">
        <el-input-number 
          v-model="element.height" 
          :min="20" 
          :max="100" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="数据点数量">
        <el-input-number 
          v-model="element.pointCount" 
          :min="5" 
          :max="500" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Y轴最小值">
        <el-input-number 
          v-model="element.minY" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Y轴最大值">
        <el-input-number 
          v-model="element.maxY" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="填充缺失数据">
        <el-switch 
          v-model="element.fillMissing" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="线条颜色">
        <color-picker 
          v-model="element.color" 
          @change="handleMainColorChange" 
        />
      </el-form-item>

      <el-form-item label="背景颜色">
        <color-picker 
          v-model="element.bgColor" 
          @change="handleBgColorChange" 
        />
      </el-form-item>

      <el-form-item label="显示网格">
        <el-switch 
          v-model="element.showGrid" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="网格颜色" v-if="element.showGrid">
        <color-picker 
          v-model="element.gridColor" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Y轴网格数量" v-if="element.showGrid">
        <el-input-number 
          v-model="element.gridYCount" 
          :min="1" 
          :max="10" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="显示X轴">
        <el-switch 
          v-model="element.showXAxis" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="显示Y轴">
        <el-switch 
          v-model="element.showYAxis" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="X轴颜色" v-if="element.showXAxis">
        <color-picker 
          v-model="element.xAxisColor" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Y轴颜色" v-if="element.showYAxis">
        <color-picker 
          v-model="element.yAxisColor" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="显示X轴标签">
        <el-switch 
          v-model="element.showXLabels" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="显示Y轴标签">
        <el-switch 
          v-model="element.showYLabels" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="X轴标签颜色" v-if="element.showXLabels">
        <color-picker 
          v-model="element.xLabelColor" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Y轴标签颜色" v-if="element.showYLabels">
        <color-picker 
          v-model="element.yLabelColor" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="X轴标签字体" v-if="element.showXLabels">
        <font-picker 
          v-model="element.xFont" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="X轴标签大小" v-if="element.showXLabels">
        <el-select v-model="element.xFontSize" @change="updateElement">
          <el-option v-for="size in fontSizes" :key="size" :label="`${size}px`" :value="size" />
        </el-select>
      </el-form-item>

      <el-form-item label="Y轴标签字体" v-if="element.showYLabels">
        <font-picker 
          v-model="element.yFont" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Y轴标签大小" v-if="element.showYLabels">
        <el-select v-model="element.yFontSize" @change="updateElement">
          <el-option v-for="size in fontSizes" :key="size" :label="`${size}px`" :value="size" />
        </el-select>
      </el-form-item>

      <el-form-item label="对齐方式">
        <AlignXButtons 
          :options="originXOptions" 
          v-model="element.originX"
          @update:modelValue="updateElement"
        />
      </el-form-item>

      <el-form-item label="柱形宽度">
        <el-input-number 
          v-model="element.barWidth" 
          :min="1" 
          :max="30" 
          :step="1"
          @change="updateElement" 
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, defineProps, onMounted, nextTick, watch, computed } from 'vue'
import { useBarChartStore } from '@/stores/elements/charts/barChartElement'
import { useBaseStore } from '@/stores/baseStore'
import { fontSizes } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import ChartPropertyField from '@/settings/common/ChartPropertyField.vue'
import PositionInputs from '@/settings/common/PositionInputs.vue'
import AlignXButtons from '@/settings/common/AlignXButtons.vue'

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const formRef = ref(null)
const barChartStore = useBarChartStore()
const baseStore = useBaseStore()


// 获取画布上的实际元素
const getFabricElement = () => {
  if (!baseStore.canvas) return null
  return baseStore.canvas.getObjects().find(obj => obj.id === props.element.id)
}

// 颜色互斥：主色与背景色不能同时设置
const handleMainColorChange = (val) => {
  props.element.color = val
  props.element.bgColor = 'transparent'
  updateElement()
}

const handleBgColorChange = (val) => {
  props.element.bgColor = val
  props.element.color = 'transparent'
  updateElement()
}

// 更新元素
const updateElement = () => {
  const fabricElement = getFabricElement()
  if (!fabricElement) return

  // 创建更新配置对象
  const updateConfig = {
    ...props.element,
    // 确保使用画布上实际元素的位置
    left: fabricElement.left,
    top: fabricElement.top,
    // 保持其他属性不变
    width: props.element.width,
    height: props.element.height,
    pointCount: props.element.pointCount,
    minY: props.element.minY,
    maxY: props.element.maxY,
    fillMissing: props.element.fillMissing,
    color: props.element.color,
    bgColor: props.element.bgColor,
    originX: props.element.originX,
    barWidth: props.element.barWidth,
    chartProperty: props.element.chartProperty,
    // 新增的图表显示属性
    showGrid: props.element.showGrid,
    gridColor: props.element.gridColor,
    gridYCount: props.element.gridYCount,
    showXAxis: props.element.showXAxis,
    showYAxis: props.element.showYAxis,
    xAxisColor: props.element.xAxisColor,
    yAxisColor: props.element.yAxisColor,
    showXLabels: props.element.showXLabels,
    showYLabels: props.element.showYLabels,
    xLabelColor: props.element.xLabelColor,
    yLabelColor: props.element.yLabelColor,
    xFont: props.element.xFont,
    yFont: props.element.yFont,
    xFontSize: props.element.xFontSize,
    yFontSize: props.element.yFontSize
  }

  barChartStore.updateElement(props.element, updateConfig)
}

// 初次挂载时如果未选择 chartProperty，则触发校验以显示提示
onMounted(() => {
  if (!props.element.chartProperty) {
    nextTick(() => {
      formRef.value?.validateField?.('chartProperty')
    })
  }
})

// 当 chartProperty 变化时，重新校验以实时显示/隐藏提示
watch(
  () => props.element.chartProperty,
  () => {
    formRef.value?.validateField?.('chartProperty')
  }
)

// 处理位置更新
const handlePositionChange = (type, value) => {
  const fabricElement = getFabricElement()
  if (!fabricElement) return

  // 更新画布上元素的位置
  fabricElement.set(type, value)
  fabricElement.setCoords()
  baseStore.canvas.renderAll()

  // 同步更新 store 中的位置
  props.element[type] = value
}
</script>

<style scoped>
.settings-section {
  padding: 20px;
}

.position-inputs {
  display: flex;
  gap: 12px;
}

.position-inputs .el-input-number {
  width: 120px;
}
</style>