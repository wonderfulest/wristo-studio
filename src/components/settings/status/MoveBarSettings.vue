<template>
  <div class="settings-section">
    <el-form 
      ref="formRef"
      :model="element" 
      label-position="left" 
      label-width="100px"
    >
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
          :min="4" 
          :max="50" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="箭头间距">
        <el-input-number 
          v-model="element.separator" 
          :min="0" 
          :max="20" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="活动级别">
        <el-slider 
          v-model="element.level" 
          :min="0" 
          :max="5" 
          :step="1" 
          @change="updateElement" 
          show-stops
        />
      </el-form-item>

      <el-form-item label="活动颜色">
        <color-picker 
          v-model="element.activeColor" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="非活动颜色">
        <color-picker 
          v-model="element.inactiveColor" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="对齐方式">
        <AlignXButtons 
          :options="originXOptions"
          v-model="element.originX"
          @update:modelValue="updateElement"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, defineProps, computed } from 'vue'
import { useMoveBarStore } from '@/stores/elements/status/moveBarElement'
import { useBaseStore } from '@/stores/baseStore'
import { originXOptions } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import AlignXButtons from '@/components/settings/common/AlignXButtons.vue'
import PositionInputs from '@/components/settings/common/PositionInputs.vue'

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const formRef = ref(null)
const moveBarStore = useMoveBarStore()
const baseStore = useBaseStore()

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
    separator: props.element.separator,
    level: props.element.level,
    activeColor: props.element.activeColor,
    inactiveColor: props.element.inactiveColor,
    originX: props.element.originX
  }

  moveBarStore.updateElement(props.element, updateConfig)
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

:deep(.el-slider) {
  width: 100%;
}
</style> 