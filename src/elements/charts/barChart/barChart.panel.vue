<template>
  <div class="settings-section">
    <el-form 
      ref="formRef"
      :model="currentModel" 
      label-position="left" 
      label-width="100px"
      status-icon
      validate-on-rule-change
    >
      <ChartPropertyField v-model="currentModel.chartProperty" @change="(v: any) => applyUpdate({ chartProperty: v })" />
      <el-form-item label="位置">
        <PositionInputs 
          :left="currentModel.left"
          :top="currentModel.top"
          @update:left="(v: any)=> applyUpdate({ left: v })"
          @update:top="(v: any)=> applyUpdate({ top: v })"
          @change="(p: any)=>{ handlePositionChange('left', p.left); handlePositionChange('top', p.top) }"
        />
      </el-form-item>

      <el-form-item label="宽度">
        <el-input-number 
          v-model="currentModel.width" 
          :min="50" 
          :max="300" 
          @change="() => applyUpdate({ width: currentModel.width })" 
        />
      </el-form-item>
      
      <el-form-item label="高度">
        <el-input-number 
          v-model="currentModel.height" 
          :min="20" 
          :max="100" 
          @change="() => applyUpdate({ height: currentModel.height })" 
        />
      </el-form-item>

      <el-form-item label="数据点数量">
        <el-input-number 
          v-model="currentModel.pointCount" 
          :min="5" 
          :max="500" 
          @change="() => applyUpdate({ pointCount: currentModel.pointCount })" 
        />
      </el-form-item>

      <el-form-item label="Y轴最小值">
        <el-input-number 
          v-model="currentModel.minY" 
          @change="(v: any) => applyUpdate({ minY: v })" 
        />
      </el-form-item>

      <el-form-item label="Y轴最大值">
        <el-input-number 
          v-model="currentModel.maxY" 
          @change="(v: any) => applyUpdate({ maxY: v })" 
        />
      </el-form-item>

      <el-form-item label="填充缺失数据">
        <el-switch 
          v-model="currentModel.fillMissing" 
          @change="(v: any) => applyUpdate({ fillMissing: v })" 
        />
      </el-form-item>

      <el-form-item label="线条颜色">
        <color-picker 
          v-model="currentModel.color" 
          @change="handleMainColorChange" 
        />
      </el-form-item>

      <el-form-item label="背景颜色">
        <color-picker 
          v-model="currentModel.bgColor" 
          @change="handleBgColorChange" 
        />
      </el-form-item>

      <el-form-item label="显示网格">
        <el-switch 
          v-model="currentModel.showGrid" 
          @change="(v: any) => applyUpdate({ showGrid: v })" 
        />
      </el-form-item>

      <el-form-item label="网格颜色" v-if="currentModel.showGrid">
        <color-picker 
          v-model="currentModel.gridColor" 
          @change="(v: any) => applyUpdate({ gridColor: v })" 
        />
      </el-form-item>

      <el-form-item label="Y轴网格数量" v-if="currentModel.showGrid">
        <el-input-number 
          v-model="currentModel.gridYCount" 
          :min="1" 
          :max="10" 
          @change="() => applyUpdate({ gridYCount: currentModel.gridYCount })" 
        />
      </el-form-item>

      <el-form-item label="显示X轴">
        <el-switch 
          v-model="currentModel.showXAxis" 
          @change="(v: any) => applyUpdate({ showXAxis: v })" 
        />
      </el-form-item>

      <el-form-item label="显示Y轴">
        <el-switch 
          v-model="currentModel.showYAxis" 
          @change="(v: any) => applyUpdate({ showYAxis: v })" 
        />
      </el-form-item>

      <el-form-item label="X轴颜色" v-if="currentModel.showXAxis">
        <color-picker 
          v-model="currentModel.xAxisColor" 
          @change="(v: any) => applyUpdate({ xAxisColor: v })" 
        />
      </el-form-item>

      <el-form-item label="Y轴颜色" v-if="currentModel.showYAxis">
        <color-picker 
          v-model="currentModel.yAxisColor" 
          @change="(v: any) => applyUpdate({ yAxisColor: v })" 
        />
      </el-form-item>

      <el-form-item label="显示X轴标签">
        <el-switch 
          v-model="currentModel.showXLabels" 
          @change="(v: any) => applyUpdate({ showXLabels: v })" 
        />
      </el-form-item>

      <el-form-item label="显示Y轴标签">
        <el-switch 
          v-model="currentModel.showYLabels" 
          @change="(v: any) => applyUpdate({ showYLabels: v })" 
        />
      </el-form-item>

      <el-form-item label="X轴标签颜色" v-if="currentModel.showXLabels">
        <color-picker 
          v-model="currentModel.xLabelColor" 
          @change="(v: any) => applyUpdate({ xLabelColor: v })" 
        />
      </el-form-item>

      <el-form-item label="Y轴标签颜色" v-if="currentModel.showYLabels">
        <color-picker 
          v-model="currentModel.yLabelColor" 
          @change="(v: any) => applyUpdate({ yLabelColor: v })" 
        />
      </el-form-item>

      <el-form-item label="X轴标签字体" v-if="currentModel.showXLabels">
        <font-picker 
          v-model="currentModel.xFont" 
          @change="(v: any) => applyUpdate({ xFont: v })" 
        />
      </el-form-item>

      <el-form-item label="X轴标签大小" v-if="currentModel.showXLabels">
        <el-select v-model="currentModel.xFontSize" @change="(v: any) => applyUpdate({ xFontSize: v })">
          <el-option v-for="size in fontSizes" :key="size" :label="`${size}px`" :value="size" />
        </el-select>
      </el-form-item>

      <el-form-item label="Y轴标签字体" v-if="currentModel.showYLabels">
        <font-picker 
          v-model="currentModel.yFont" 
          @change="(v: any) => applyUpdate({ yFont: v })" 
        />
      </el-form-item>

      <el-form-item label="Y轴标签大小" v-if="currentModel.showYLabels">
        <el-select v-model="currentModel.yFontSize" @change="(v: any) => applyUpdate({ yFontSize: v })">
          <el-option v-for="size in fontSizes" :key="size" :label="`${size}px`" :value="size" />
        </el-select>
      </el-form-item>

      <el-form-item label="对齐方式">
        <AlignXButtons 
          :options="originXOptions" 
          v-model="currentModel.originX"
          @update:modelValue="(v: any) => applyUpdate({ originX: v })"
        />
      </el-form-item>

      <el-form-item label="柱形宽度">
        <el-input-number 
          v-model="currentModel.barWidth" 
          :min="1" 
          :max="30" 
          :step="1"
          @change="() => applyUpdate({ barWidth: currentModel.barWidth })" 
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import { useBaseStore } from '@/stores/baseStore'
import { fontSizes } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import ChartPropertyField from '@/elements/common/settings/ChartPropertyField.vue'
import PositionInputs from '@/elements/common/settings/PositionInputs.vue'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const formRef = ref()
const baseStore = useBaseStore()

const currentModel = computed<any>(() => {
  return props.config ?? props.element ?? {}
})

const originXOptions = [
  { label: '左', value: 'left' },
  { label: '中', value: 'center' },
  { label: '右', value: 'right' },
]

// 获取画布上的实际元素
const getFabricElement = () => {
  if (!baseStore.canvas) return null
  if (!props.element) return null
  return baseStore.canvas.getObjects().find((obj) => (obj as any).id === props.element.id)
}

// 颜色互斥：主色与背景色不能同时设置
const handleMainColorChange = (val: string) => {
  applyUpdate({ color: val, bgColor: 'transparent' })
}

const handleBgColorChange = (val: string) => {
  applyUpdate({ bgColor: val, color: 'transparent' })
}

const applyUpdate = (patch: Record<string, any>) => {
  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }

  if (props.element) {
    elementManager.updateElement(props.element as any, patch)
  }
}

// 初次挂载时如果未选择 chartProperty，则触发校验以显示提示
onMounted(() => {
  const model = currentModel.value as any
  if (!model.chartProperty) {
    nextTick(() => {
      formRef.value?.validateField?.('chartProperty')
    })
  }
})

// 当 chartProperty 变化时，重新校验以实时显示/隐藏提示
watch(
  () => (currentModel.value as any).chartProperty,
  () => {
    formRef.value?.validateField?.('chartProperty')
  },
)

// 处理位置更新
const handlePositionChange = (type: 'left' | 'top', value: number) => {
  const fabricElement = getFabricElement()
  if (!fabricElement) return

  fabricElement.set(type, value)
  fabricElement.setCoords()
  baseStore.canvas?.renderAll()

  if (props.element) {
    props.element[type] = value
  }
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
