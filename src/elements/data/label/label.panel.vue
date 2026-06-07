<template>
  <div class="settings-section">
    <el-form 
      ref="formRef"
      :model="currentModel" 
      label-position="left" 
      label-width="100px"
    >
      <DataPropertyField
        v-if="!currentModel.goalProperty"
        v-model="currentModel.dataProperty"
        @change="updateElement"
      />
      <GoalPropertyField
        v-if="currentModel.goalProperty"
        v-model="currentModel.goalProperty"
        @change="updateElement"
      />
      <el-form-item :label="t('elementSettings.alignment')">
        <AlignXButtons 
          :options="originXOptions" 
          v-model="currentModel.originX"
          @update:modelValue="updateElement"
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.fontSize')">
        <el-select 
          v-model="currentModel.fontSize" 
          @change="updateElement"
        >
          <el-option 
            v-for="size in fontSizes" 
            :key="size" 
            :label="`${size}px`" 
            :value="size" 
          />
        </el-select>
      </el-form-item>

      <el-form-item :label="t('elementSettings.textColor')">
        <color-picker 
          v-model="currentModel.fill" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.font')">
        <font-picker 
          v-model="currentModel.fontFamily" 
          @change="updateElement" 
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import { fontSizes, originXOptions } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'
import { ElMessage } from 'element-plus'
import DataPropertyField from '@/elements/common/settings/DataPropertyField.vue'
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

const updateElement = async () => {
  const model = currentModel.value as any
  await applyUpdate({
    dataProperty: model.dataProperty,
    goalProperty: model.goalProperty,
    fontSize: model.fontSize,
    fill: model.fill,
    fontFamily: model.fontFamily,
    originX: model.originX,
    left: model.left,
    top: model.top,
  })
}

const handleClose = async () => {
  try {
    await formRef.value.validate()
    emit('close')
  } catch (error) {
    ElMessage.warning('Please complete the required fields first')
  }
}

defineExpose({
  formRef,
  handleClose,
})
</script>

<style scoped>
@import '@/assets/styles/settings.css';
.settings-section {
  padding: 16px;
}

.position-inputs {
  display: flex;
  gap: 8px;
}

.el-form-item {
  margin-bottom: 16px;
}
</style>
