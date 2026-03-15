<template>
  <div class="settings-section">
    <el-form 
      ref="formRef"
      :model="currentModel" 
      label-position="left" 
      label-width="100px"
      :rules="rules"
      status-icon
      validate-on-rule-change
    >
      <GoalPropertyField
        v-model="currentModel.goalProperty"
        @change="updateElement"
      />
      <el-form-item label="Width">
        <el-input-number 
          v-model="currentModel.width" 
          :min="50" 
          :max="500" 
          @change="updateElement" 
        />
      </el-form-item>
      
      <el-form-item label="Height">
        <el-input-number 
          v-model="currentModel.height" 
          :min="4" 
          :max="50" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Border Radius">
        <el-input-number 
          v-model="currentModel.borderRadius" 
          :min="0" 
          :max="25" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Padding">
        <el-input-number 
          v-model="currentModel.padding" 
          :min="0" 
          :max="10" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Alignment">
        <AlignXButtons 
          :options="originXOptions"
          v-model="currentModel.originX"
          @update:modelValue="() => updateElement()"
        />
      </el-form-item>

      <el-form-item label="Progress">
        <el-slider 
          v-model="currentModel.progress" 
          :min="0" 
          :max="1" 
          :step="0.01" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Active Color">
        <color-picker 
          v-model="currentModel.color" 
          @change="handleMainColorChange" 
        />
      </el-form-item>

      <el-form-item label="Background Color">
        <color-picker 
          v-model="currentModel.bgColor" 
          @change="handleBgColorChange" 
        />
      </el-form-item>

      <el-form-item label="Progress Align">
        <el-select 
          v-model="currentModel.progressAlign" 
          @change="updateElement"
        >
          <el-option label="Left" value="left" />
          <el-option label="Right" value="right" />
        </el-select>
      </el-form-item>

      <el-form-item label="Border Width">
        <el-input-number 
          v-model="currentModel.borderWidth" 
          :min="0" 
          :max="10" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Border Color">
        <color-picker 
          v-model="currentModel.borderColor" 
          @change="updateElement" 
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import ColorPicker from '@/components/color-picker/index.vue'
import { originXOptions } from '@/config/settings'
import { ElMessage } from 'element-plus'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'
import GoalPropertyField from '@/elements/common/settings/GoalPropertyField.vue'

const emit = defineEmits(['close'])

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const formRef = ref<any>(null)

const rules = {
  goalProperty: [
    { required: true, message: 'Please select a goal property, if none, please add it in Actions -> Add Property -> Goal.', trigger: 'change' }
  ]
}

const currentModel = computed<any>(() => {
  return props.config ?? props.element ?? {}
})

const applyUpdate = async (patch: Record<string, any>) => {
  try {
    await formRef.value?.validate?.()
  } catch (error) {
    console.error('Form validation failed:', error)
    return
  }

  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }

  if (props.element) {
    elementManager.updateElement(props.element as any, patch)
  }
}

const handleMainColorChange = async (val: string) => {
  currentModel.value.color = val
  await updateElement()
}

const handleBgColorChange = async (val: string) => {
  currentModel.value.bgColor = val
  await updateElement()
}
const updateElement = async () => {
  try {
    await formRef.value.validate()
    const model = currentModel.value as any
    await applyUpdate({
      width: model.width,
      height: model.height,
      borderRadius: model.borderRadius,
      padding: model.padding,
      progressAlign: model.progressAlign,
      progress: model.progress,
      color: model.color,
      bgColor: model.bgColor,
      goalProperty: model.goalProperty,
      borderWidth: model.borderWidth,
      borderColor: model.borderColor,
    })
  } catch (error) {
    console.error('Form validation failed:', error)
  }
}

const handleClose = async () => {
  try {
    await formRef.value.validate()
    emit('close')
  } catch (error) {
    ElMessage.warning('Please complete the required fields first')
  }
}

// 初次挂载时如果未选择 goalProperty，则触发校验以显示提示
onMounted(() => {
  if (!currentModel.value.goalProperty) {
    nextTick(() => {
      formRef.value?.validateField?.('goalProperty')
    })
  }
})

// 当 goalProperty 变化时，重新校验以实时显示/隐藏提示
watch(
  () => currentModel.value.goalProperty,
  () => {
    formRef.value?.validateField?.('goalProperty')
  }
)

// 暴露方法给父组件
defineExpose({
  formRef,
  handleClose
})
</script>

<style scoped>
.settings-section {
  padding: 16px;
}

.el-form-item {
  margin-bottom: 16px;
}

/* Make ALL validation errors occupy normal flow so they push items below */
:deep(.el-form-item__error) {
  position: static;
  margin-top: 4px;
}

/* Ensure content area doesn't collapse when error appears */
:deep(.el-form-item__content) {
  padding-bottom: 0 !important;
}

/* Reduce line spacing for multi-line labels to the minimum reasonable */
:deep(.el-form-item__label) {
  line-height: 1.1; /* tighter line height for wrapped labels */
  padding-top: 0;   /* remove extra vertical padding */
  padding-bottom: 0;
}

/* When label is wrapped by helper container, ensure same effect */
:deep(.el-form-item__label-wrap .el-form-item__label) {
  line-height: 1.1;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
