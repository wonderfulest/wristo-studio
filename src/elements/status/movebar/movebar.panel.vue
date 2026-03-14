<template>
  <div class="settings-section">
    <el-form 
      ref="formRef"
      :model="currentModel" 
      label-position="left" 
      label-width="100px"
    >
      <el-form-item label="宽度">
        <el-input-number 
          v-model="currentModel.width" 
          :min="50" 
          :max="300" 
          @change="updateElement" 
        />
      </el-form-item>
      
      <el-form-item label="高度">
        <el-input-number 
          v-model="currentModel.height" 
          :min="4" 
          :max="50" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="箭头间距">
        <el-input-number 
          v-model="currentModel.separator" 
          :min="0" 
          :max="20" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="活动级别">
        <el-slider 
          v-model="currentModel.level" 
          :min="0" 
          :max="5" 
          :step="1" 
          @change="updateElement" 
          show-stops
        />
      </el-form-item>

      <el-form-item label="活动颜色">
        <color-picker 
          v-model="currentModel.activeColor" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="非活动颜色">
        <color-picker 
          v-model="currentModel.inactiveColor" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="对齐方式">
        <AlignXButtons 
          :options="originXOptions"
          v-model="currentModel.originX"
          @update:modelValue="updateElement"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FabricElement } from '@/types/element'
import { originXOptions } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'
import * as elementManager from '@/engine/managers/elementManager'

const props = defineProps<{ 
  element?: FabricElement
  config?: any
  applyPatch?: (patch: Record<string, any>) => void
}>()

const formRef = ref(null)

const currentModel = computed<any>(() => {
  return (props.config as any) ?? props.element ?? {}
})

const updateElement = () => {
  const patch = {
    left: currentModel.value.left,
    top: currentModel.value.top,
    width: currentModel.value.width,
    height: currentModel.value.height,
    separator: currentModel.value.separator,
    level: currentModel.value.level,
    activeColor: currentModel.value.activeColor,
    inactiveColor: currentModel.value.inactiveColor,
    originX: currentModel.value.originX,
  }

  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }

  if (props.element) {
    elementManager.updateElement(props.element as any, patch)
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

:deep(.el-slider) {
  width: 100%;
}
</style> 
