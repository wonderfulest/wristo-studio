<template>
  <div class="settings-section">
    <el-form 
      ref="formRef"
      :model="element" 
      label-position="left" 
      label-width="100px"
    >
      <el-form-item label="图表属性" prop="chartProperty" :rules="[{ required: true, message: '请选择图表属性', trigger: 'change' }]">
        <el-select v-model="element.chartProperty" @change="updateElement" placeholder="选择图表属性">
          <el-option v-for="[key, prop] in Object.entries(propertiesStore.allProperties).filter(([_, p]) => p.type === 'chart')" :key="key" :label="prop.title" :value="key" />
        </el-select>
      </el-form-item>

      <el-form-item label="位置">
        <div class="position-inputs">
          <el-input-number 
            v-model="element.left" 
            @change="(val) => handlePositionChange('left', val)"
            placeholder="X"
          />
          <el-input-number 
            v-model="element.top" 
            @change="(val) => handlePositionChange('top', val)"
            placeholder="Y"
          />
        </div>
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

      <el-form-item label="线条宽度">
        <el-input-number 
          v-model="element.lineWidth" 
          :min="1" 
          :max="10" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="平滑因子">
        <el-slider 
          v-model="element.smoothFactor" 
          :min="0" 
          :max="1" 
          :step="0.1"
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="显示数据点">
        <el-switch 
          v-model="element.showPoints" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="数据点颜色" v-if="element.showPoints">
        <color-picker 
          v-model="element.pointColor" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="数据点半径" v-if="element.showPoints">
        <el-input-number 
          v-model="element.pointRadius" 
          :min="1" 
          :max="10" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="线条颜色">
        <color-picker 
          v-model="element.color" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="背景颜色">
        <color-picker 
          v-model="element.bgColor" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="填充缺失数据">
        <el-switch 
          v-model="element.fillMissing" 
          @change="updateElement" 
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

      <el-form-item label="X轴网格数量" v-if="element.showGrid">
        <el-input-number 
          v-model="element.gridXCount" 
          :min="1" 
          :max="50" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="显示坐标轴">
        <el-switch 
          v-model="element.showAxis" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="坐标轴颜色" v-if="element.showAxis">
        <color-picker 
          v-model="element.axisColor" 
          @change="updateElement" 
        />
      </el-form-item>

      <!-- X轴设置 -->
      <div class="axis-section">
        <h4>X轴设置</h4>
      <el-form-item label="显示标签">
        <el-switch 
            v-model="element.showXLabels" 
          @change="updateElement" 
        />
      </el-form-item>

        <template v-if="element.showXLabels">
          <el-form-item label="标签颜色">
        <color-picker 
              v-model="element.xLabelColor" 
          @change="updateElement" 
        />
      </el-form-item>

          <el-form-item label="时间格式">
        <el-select v-model="element.timeFormat" @change="updateElement">
          <el-option label="HH:mm" value="HH:mm" />
          <el-option label="mm:ss" value="mm:ss" />
          <el-option label="MM/dd" value="MM/dd" />
        </el-select>
      </el-form-item>

          <el-form-item label="标签高度">
        <el-input-number 
              v-model="element.xLabelHeight" 
          :min="0" 
          :max="100" 
          @change="updateElement" 
        />
      </el-form-item>

          <el-form-item label="标签字体">
            <font-picker 
              v-model="element.xFont" 
              @change="updateElement" 
            />
          </el-form-item>

          <el-form-item label="字体大小">
            <el-select v-model="element.xFontSize" @change="updateElement">
              <el-option v-for="size in availableFontSizes" :key="size" :label="`${size}px`" :value="size" />
            </el-select>
          </el-form-item>
        </template>
      </div>

      <!-- Y轴设置 -->
      <div class="axis-section">
        <h4>Y轴设置</h4>
        <el-form-item label="显示标签">
          <el-switch 
            v-model="element.showYLabels" 
            @change="updateElement" 
          />
        </el-form-item>

        <template v-if="element.showYLabels">
          <el-form-item label="标签颜色">
            <color-picker 
              v-model="element.yLabelColor" 
              @change="updateElement" 
            />
          </el-form-item>

          <el-form-item label="标签宽度">
        <el-input-number 
              v-model="element.yLabelWidth" 
          :min="0" 
          :max="100" 
          @change="updateElement" 
        />
      </el-form-item>

          <el-form-item label="标签字体">
        <font-picker 
              v-model="element.yFont" 
          @change="updateElement" 
        />
      </el-form-item>

          <el-form-item label="字体大小">
            <el-select v-model="element.yFontSize" @change="updateElement">
          <el-option v-for="size in availableFontSizes" :key="size" :label="`${size}px`" :value="size" />
        </el-select>
      </el-form-item>
        </template>
      </div>

    </el-form>
  </div>
</template>

<script setup>
import { ref, defineProps, computed } from 'vue'
import { useLineChartStore } from '@/stores/elements/charts/lineChartElement'
import { useBaseStore } from '@/stores/baseStore'
import { fontSizes } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/index.vue'
import { usePropertiesStore } from '@/stores/properties'

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const formRef = ref(null)
const lineChartStore = useLineChartStore()
const baseStore = useBaseStore()
const propertiesStore = usePropertiesStore()

// 计算可用的字体大小（最大到96）
const availableFontSizes = computed(() => {
  return fontSizes.filter((size) => size <= 96)
})

// 获取画布上的实际元素
const getFabricElement = () => {
  if (!baseStore.canvas) return null
  return baseStore.canvas.getObjects().find(obj => obj.id === props.element.id)
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
    lineWidth: props.element.lineWidth,
    smoothFactor: props.element.smoothFactor,
    showPoints: props.element.showPoints,
    pointColor: props.element.pointColor,
    pointRadius: props.element.pointRadius,
    color: props.element.color,
    bgColor: props.element.bgColor,
    fillMissing: props.element.fillMissing,
    showGrid: props.element.showGrid,
    gridColor: props.element.gridColor,
    gridYCount: props.element.gridYCount,
    gridXCount: props.element.gridXCount,
    showAxis: props.element.showAxis,
    axisColor: props.element.axisColor,
    // X轴设置
    showXLabels: props.element.showXLabels,
    xLabelColor: props.element.xLabelColor,
    xFont: props.element.xFont,
    xFontSize: props.element.xFontSize,
    xLabelHeight: props.element.xLabelHeight,
    // Y轴设置
    showYLabels: props.element.showYLabels,
    yLabelColor: props.element.yLabelColor,
    yFont: props.element.yFont,
    yFontSize: props.element.yFontSize,
    yLabelWidth: props.element.yLabelWidth,
    // 其他设置
    timeFormat: props.element.timeFormat,
    chartProperty: props.element.chartProperty
  }

  lineChartStore.updateElement(props.element, updateConfig)
}

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

.axis-section {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.axis-section h4 {
  margin: 0 0 16px 0;
  color: #606266;
  font-size: 14px;
  font-weight: 500;
}
</style> 