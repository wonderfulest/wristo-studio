<template>
  <div class="settings-section">
    <el-form
      ref="formRef"
      :model="currentModel"
      label-position="left"
      label-width="100px"
    >
      <ChartPropertyField v-model="currentModel.chartProperty" @change="(v: string) => applyUpdate({ chartProperty: v })" />

      <el-form-item label="位置">
        <PositionInputs
          :left="currentModel.left"
          :top="currentModel.top"
          @update:left="(v: number) => applyUpdate({ left: v })"
          @update:top="(v: number) => applyUpdate({ top: v })"
          @change="(p: { left: number; top: number }) => {
            handlePositionChange('left', p.left)
            handlePositionChange('top', p.top)
          }"
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

      <el-form-item label="线条宽度">
        <el-input-number
          v-model="currentModel.lineWidth"
          :min="1"
          :max="10"
          @change="() => applyUpdate({ lineWidth: currentModel.lineWidth })"
        />
      </el-form-item>

      <el-form-item label="平滑因子">
        <el-slider 
          v-model="currentModel.smoothFactor" 
          :min="0" 
          :max="1" 
          :step="0.1"
          @change="(v: number) => applyUpdate({ smoothFactor: v })" 
        />
      </el-form-item>

      <el-form-item label="显示数据点">
        <el-switch 
          v-model="currentModel.showPoints" 
          @change="(v: boolean) => applyUpdate({ showPoints: v })" 
        />
      </el-form-item>

      <el-form-item label="数据点颜色" v-if="currentModel.showPoints">
        <color-picker 
          v-model="currentModel.pointColor" 
          @change="(v: string) => applyUpdate({ pointColor: v })" 
        />
      </el-form-item>

      <el-form-item label="数据点半径" v-if="currentModel.showPoints">
        <el-input-number
          v-model="currentModel.pointRadius"
          :min="1"
          :max="10"
          @change="() => applyUpdate({ pointRadius: currentModel.pointRadius })"
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

      <el-form-item label="填充缺失数据">
        <el-switch 
          v-model="currentModel.fillMissing" 
          @change="(v: boolean) => applyUpdate({ fillMissing: v })" 
        />
      </el-form-item>

      <el-form-item label="显示网格">
        <el-switch 
          v-model="currentModel.showGrid" 
          @change="(v: boolean) => applyUpdate({ showGrid: v })" 
        />
      </el-form-item>

      <el-form-item label="网格颜色" v-if="currentModel.showGrid">
        <color-picker 
          v-model="currentModel.gridColor" 
          @change="(v: string) => applyUpdate({ gridColor: v })" 
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

      <el-form-item label="X轴网格数量" v-if="currentModel.showGrid">
        <el-input-number 
          v-model="currentModel.gridXCount" 
          :min="1" 
          :max="50" 
          @change="() => applyUpdate({ gridXCount: currentModel.gridXCount })" 
        />
      </el-form-item>

      <el-form-item label="显示坐标轴">
        <el-switch 
          v-model="currentModel.showAxis" 
          @change="(v: boolean) => applyUpdate({ showAxis: v })" 
        />
      </el-form-item>

      <el-form-item label="坐标轴颜色" v-if="currentModel.showAxis">
        <color-picker 
          v-model="currentModel.axisColor" 
          @change="(v: string) => applyUpdate({ axisColor: v })" 
        />
      </el-form-item>

      <!-- X轴设置 -->
      <div class="axis-section">
        <h4>X轴设置</h4>
      <el-form-item label="显示标签">
        <el-switch 
            v-model="currentModel.showXLabels" 
          @change="(v: boolean) => applyUpdate({ showXLabels: v })" 
        />
      </el-form-item>

        <template v-if="currentModel.showXLabels">
          <el-form-item label="标签颜色">
        <color-picker 
              v-model="currentModel.xLabelColor" 
          @change="(v: string) => applyUpdate({ xLabelColor: v })" 
        />
      </el-form-item>

      <el-form-item label="时间格式">
        <el-select v-model="currentModel.timeFormat" @change="(v: string) => applyUpdate({ timeFormat: v })">
          <el-option label="HH:mm" value="HH:mm" />
          <el-option label="mm:ss" value="mm:ss" />
          <el-option label="MM/dd" value="MM/dd" />
        </el-select>
      </el-form-item>

          <el-form-item label="标签高度">
        <el-input-number 
              v-model="currentModel.xLabelHeight" 
          :min="0" 
          :max="100" 
          @change="() => applyUpdate({ xLabelHeight: currentModel.xLabelHeight })" 
        />
      </el-form-item>

          <el-form-item label="标签字体">
            <font-picker 
              v-model="currentModel.xFont" 
              @change="(v: string) => applyUpdate({ xFont: v })" 
            />
          </el-form-item>

          <el-form-item label="字体大小">
            <el-select v-model="currentModel.xFontSize" @change="(v: number) => applyUpdate({ xFontSize: v })">
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
            v-model="currentModel.showYLabels" 
            @change="(v: boolean) => applyUpdate({ showYLabels: v })" 
          />
        </el-form-item>

        <template v-if="currentModel.showYLabels">
          <el-form-item label="标签颜色">
            <color-picker 
              v-model="currentModel.yLabelColor" 
              @change="(v: string) => applyUpdate({ yLabelColor: v })" 
            />
          </el-form-item>

          <el-form-item label="标签宽度">
        <el-input-number 
              v-model="currentModel.yLabelWidth" 
          :min="0" 
          :max="100" 
          @change="() => applyUpdate({ yLabelWidth: currentModel.yLabelWidth })" 
        />
      </el-form-item>

          <el-form-item label="标签字体">
        <font-picker 
              v-model="currentModel.yFont" 
          @change="(v: string) => applyUpdate({ yFont: v })" 
        />
      </el-form-item>

          <el-form-item label="字体大小">
            <el-select v-model="currentModel.yFontSize" @change="(v: number) => applyUpdate({ yFontSize: v })">
          <el-option v-for="size in availableFontSizes" :key="size" :label="`${size}px`" :value="size" />
        </el-select>
      </el-form-item>
        </template>
      </div>

    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import { useBaseStore } from '@/stores/baseStore'
import { fontSizes } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import ChartPropertyField from '@/elements/common/settings/ChartPropertyField.vue'
import PositionInputs from '@/elements/common/settings/PositionInputs.vue'

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const formRef = ref()
const baseStore = useBaseStore()

const availableFontSizes = computed(() => {
  return fontSizes.filter((size) => size <= 96)
})

const currentModel = computed<any>(() => {
  return props.config ?? props.element ?? {}
})

const getFabricElement = () => {
  if (!baseStore.canvas) return null
  if (!props.element) return null
  return baseStore.canvas.getObjects().find(obj => (obj as any).id === props.element.id)
}

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

.axis-section {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.axis-section h4 {
  margin: 0 0 12px;
}
</style>
