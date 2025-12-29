<template>
  <div class="settings-section">
    <el-form 
      ref="formRef"
      :model="element" 
      label-position="left" 
      label-width="100px"
      :rules="rules"
      status-icon
      validate-on-rule-change
    >
      <GoalPropertyField
        v-model="element.goalProperty"
        @change="updateElement"
      />
      <el-form-item label="Width">
        <el-input-number 
          v-model="element.width" 
          :min="50" 
          :max="500" 
          @change="updateElement" 
        />
      </el-form-item>
      
      <el-form-item label="Height">
        <el-input-number 
          v-model="element.height" 
          :min="4" 
          :max="50" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Border Radius">
        <el-input-number 
          v-model="element.borderRadius" 
          :min="0" 
          :max="25" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Padding">
        <el-input-number 
          v-model="element.padding" 
          :min="0" 
          :max="10" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Alignment">
        <AlignXButtons 
          :options="originXOptions"
          v-model="element.originX"
          @update:modelValue="() => updateElement()"
        />
      </el-form-item>

      <el-form-item label="Progress">
        <el-slider 
          v-model="element.progress" 
          :min="0" 
          :max="1" 
          :step="0.01" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Active Color">
        <color-picker 
          v-model="element.color" 
          @change="handleMainColorChange" 
        />
      </el-form-item>

      <el-form-item label="Background Color">
        <color-picker 
          v-model="element.bgColor" 
          @change="handleBgColorChange" 
        />
      </el-form-item>

      <el-form-item label="Progress Align">
        <el-select 
          v-model="element.progressAlign" 
          @change="updateElement"
        >
          <el-option label="Left" value="left" />
          <el-option label="Right" value="right" />
        </el-select>
      </el-form-item>

      <el-form-item label="Border Width">
        <el-input-number 
          v-model="element.borderWidth" 
          :min="0" 
          :max="10" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Border Color">
        <color-picker 
          v-model="element.borderColor" 
          @change="updateElement" 
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, watch, defineEmits, defineExpose, onMounted, nextTick } from 'vue'
import { useGoalBarStore } from '@/stores/elements/goal/goalBarElement'
import ColorPicker from '@/components/color-picker/index.vue'
import { DataTypeOptions, originXOptions } from '@/config/settings'
import { usePropertiesStore } from '@/stores/properties'
import { ElMessage } from 'element-plus'
import AlignXButtons from '@/settings/common/AlignXButtons.vue'
import GoalPropertyField from '@/settings/common/GoalPropertyField.vue'

const emit = defineEmits(['close'])

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const formRef = ref(null)
const goalBarStore = useGoalBarStore()
const metricOptions = DataTypeOptions
const propertiesStore = usePropertiesStore()

const rules = {
  goalProperty: [
    { required: true, message: 'Please select a goal property, if none, please add it in Actions -> Add Property -> Goal.', trigger: 'change' }
  ]
}

const handleMainColorChange = async (val) => {
  props.element.color = val
  await updateElement()
}

const handleBgColorChange = async (val) => {
  props.element.bgColor = val
  await updateElement()
}
const updateElement = async () => {
  try {
    await formRef.value.validate()
    goalBarStore.updateElement(props.element, {
      width: props.element.width,
      height: props.element.height,
      borderRadius: props.element.borderRadius,
      padding: props.element.padding,
      progressAlign: props.element.progressAlign,
      progress: props.element.progress,
      color: props.element.color,
      bgColor: props.element.bgColor,
      goalProperty: props.element.goalProperty,
      borderWidth: props.element.borderWidth,
      borderColor: props.element.borderColor
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
  if (!props.element.goalProperty) {
    nextTick(() => {
      formRef.value?.validateField?.('goalProperty')
    })
  }
})

// 当 goalProperty 变化时，重新校验以实时显示/隐藏提示
watch(
  () => props.element.goalProperty,
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
