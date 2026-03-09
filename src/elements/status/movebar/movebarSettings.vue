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
import { ref, defineProps, computed } from 'vue'
import { useMoveBarStore } from '@/elements/status/movebar/movebarElement'
import { originXOptions } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'

const props = defineProps({
  // 旧通道：直接传入 FabricElement
  element: {
    type: Object,
    required: false,
  },
  // 新通道：业务配置 + 通用补丁函数
  config: {
    type: Object,
    required: false,
  },
  applyPatch: {
    type: Function,
    required: false,
  },
})

const formRef = ref(null)
const moveBarStore = useMoveBarStore()

// 当前表单绑定的数据源：优先使用业务 config，其次回退到 FabricElement
const currentModel = computed<any>(() => {
  return (props.config as any) ?? props.element ?? {}
})

// 更新元素
const updateElement = () => {
  // 新通道：优先走 applyPatch
  if (props.applyPatch && props.config) {
    props.applyPatch({
      left: currentModel.value.left,
      top: currentModel.value.top,
      width: currentModel.value.width,
      height: currentModel.value.height,
      separator: currentModel.value.separator,
      level: currentModel.value.level,
      activeColor: currentModel.value.activeColor,
      inactiveColor: currentModel.value.inactiveColor,
      originX: currentModel.value.originX,
    })
    return
  }

  // 旧通道：直接调用 store.updateElement，基于 props.element 当前字段
  if (!props.element) return

  const updateConfig = {
    ...(props.element as any),
    width: (props.element as any).width,
    height: (props.element as any).height,
    separator: (props.element as any).separator,
    level: (props.element as any).level,
    activeColor: (props.element as any).activeColor,
    inactiveColor: (props.element as any).inactiveColor,
    originX: (props.element as any).originX,
    originY: (props.element as any).originY,
    left: (props.element as any).left,
    top: (props.element as any).top,
  }

  moveBarStore.updateElement(props.element as any, updateConfig)
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