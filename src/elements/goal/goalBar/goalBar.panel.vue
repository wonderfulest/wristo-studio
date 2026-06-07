<template>
  <div class="settings-section">
    <el-form 
      ref="formRef"
      :model="currentModel" 
      label-position="left" 
      label-width="100px"
      status-icon
    >
      <GoalPropertyField
        v-model="currentModel.goalProperty"
        @change="updateElement"
      />
      <el-form-item :label="t('elementSettings.width')">
        <el-input-number 
          v-model="currentModel.width" 
          disabled
        />
      </el-form-item>
      
      <el-form-item :label="t('elementSettings.height')">
        <el-input-number 
          v-model="currentModel.height" 
          disabled
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.borderRadius')">
        <el-input-number 
          v-model="currentModel.borderRadius" 
          :min="0" 
          :max="25" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.padding')">
        <el-input-number 
          v-model="currentModel.padding" 
          :min="0" 
          :max="10" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.alignment')">
        <AlignXButtons 
          :options="originXOptions"
          v-model="currentModel.originX"
          @update:modelValue="() => updateElement()"
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.progress')">
        <el-slider 
          v-model="currentModel.progress" 
          :min="0" 
          :max="1" 
          :step="0.01" 
          @change="handleProgressChange" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.activeColor')">
        <color-picker 
          v-model="currentModel.color" 
          @change="handleMainColorChange" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.backgroundColor')">
        <color-picker 
          v-model="currentModel.bgColor" 
          @change="handleBgColorChange" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.progressAlign')">
        <el-select 
          v-model="currentModel.progressAlign" 
          @change="updateElement"
        >
          <el-option :label="t('elementSettings.left')" value="left" />
          <el-option :label="t('elementSettings.right')" value="right" />
        </el-select>
      </el-form-item>

      <el-form-item :label="t('elementSettings.borderWidth')">
        <el-input-number 
          v-model="currentModel.borderWidth" 
          :min="0" 
          :max="10" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.borderColor')">
        <color-picker 
          v-model="currentModel.borderColor" 
          @change="updateElement" 
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import ColorPicker from '@/components/color-picker/index.vue'
import { originXOptions } from '@/config/settings'
import { ElMessage } from 'element-plus'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'
import GoalPropertyField from '@/elements/common/settings/GoalPropertyField.vue'
import { useI18n } from '@/i18n'

const emit = defineEmits(['close'])
const { t } = useI18n()

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const formRef = ref<any>(null)

const currentModel = computed<any>(() => {
  console.log('[GoalBarPanel] currentModel', props.config, props.element)
  return props.config ?? props.element ?? {}
})

const applyUpdate = async (patch: Record<string, any>) => {
  console.log('[GoalBarPanel] applyUpdate patch', patch, {
    hasConfig: !!props.config,
    hasApplyPatch: !!props.applyPatch,
    hasElement: !!props.element,
  })
  if (props.applyPatch) {
    props.applyPatch(patch)
    return
  }

  if (props.element) {
    elementManager.updateElement(props.element as any, patch)
  }
}

const handleMainColorChange = async (val: string) => {
  await applyUpdate({ color: val })
}

const handleBgColorChange = async (val: string) => {
  await applyUpdate({ bgColor: val })
}

const handleProgressChange = async (val: number) => {
  await applyUpdate({ progress: val })
}
const updateElement = async () => {
  try {
    console.log('[GoalBarPanel] applying update without form validate')
    const model = currentModel.value as any
    console.log('[GoalBarPanel] model before patch', {
      progress: model.progress,
      borderRadius: model.borderRadius,
      padding: model.padding,
      progressAlign: model.progressAlign,
      color: model.color,
      bgColor: model.bgColor,
      borderWidth: model.borderWidth,
      borderColor: model.borderColor,
      goalProperty: model.goalProperty,
    })
    await applyUpdate({
      borderRadius: model.borderRadius,
      padding: model.padding,
      progressAlign: model.progressAlign,
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
