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
      <el-form-item label="Alignment">
        <AlignXButtons 
          :options="originXOptions" 
          v-model="currentModel.originX"
          @update:modelValue="updateElement"
        />
      </el-form-item>

      <el-form-item label="Font Size">
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

      <el-form-item label="Text Color">
        <color-picker 
          v-model="currentModel.fill" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Font">
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

const emit = defineEmits(['close'])

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const formRef = ref<any>(null)

// 当前表单绑定的数据模型：优先使用业务 config，其次回退到 FabricElement
const currentModel = computed<any>(() => {
  return props.config ?? props.element ?? {}
})

// 统一更新：先校验，再通过 applyPatch 或 elementManager 下发补丁
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

// 保持原有的 updateElement 调用点，只是改为派发补丁
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

// 添加关闭时的验证方法
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
