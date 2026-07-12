<template>
  <div class="settings-section">
    <el-form
      ref="formRef"
      :model="formModel"
      label-position="left"
      label-width="100px"
    >
      <ChartPropertyField v-model="formModel.chartProperty" @change="(v: string) => applyUpdate({ chartProperty: v })" />

      <el-form-item :label="t('elementSettings.width')">
        <el-input-number 
          v-model="formModel.width" 
          :min="50" 
          :max="454" 
          disabled
        />
      </el-form-item>
      
      <el-form-item :label="t('elementSettings.height')">
        <el-input-number
          v-model="formModel.height"
          :min="20"
          :max="227"
          disabled
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.lineWidth')">
        <el-input-number
          v-model="formModel.lineWidth"
          :min="1"
          :max="10"
          @change="() => applyUpdate({ lineWidth: formModel.lineWidth })"
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.showPoints')">
        <el-switch 
          v-model="formModel.showPoints" 
          @change="(v: boolean) => applyUpdate({ showPoints: v })" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.pointColor')" v-if="formModel.showPoints">
        <color-picker 
          v-model="formModel.pointColor" 
          @change="(v: string) => applyUpdate({ pointColor: v })" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.pointRadius')" v-if="formModel.showPoints">
        <el-input-number
          v-model="formModel.pointRadius"
          :min="1"
          :max="10"
          @change="() => applyUpdate({ pointRadius: formModel.pointRadius })"
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.lineColor')">
        <color-picker 
          v-model="formModel.color" 
          @change="(v: string) => applyUpdate({ color: v })" 
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import ColorPicker from '@/components/color-picker/index.vue'
import ChartPropertyField from '@/elements/common/settings/ChartPropertyField.vue'
import { useI18n } from '@/i18n'

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const formRef = ref()
const { t } = useI18n()
const formModel = ref<any>({})

const syncFromProps = () => {
  const src = (props.config ?? props.element ?? {}) as any
  formModel.value = { ...src }
}

watch(
  () => (props.config as any)?.id ?? (props.element as any)?.id,
  () => {
    syncFromProps()
  },
  { immediate: true },
)

watch(
  () => [
    (props.config as any)?.width ?? (props.element as any)?.width,
    (props.config as any)?.height ?? (props.element as any)?.height,
  ],
  ([width, height]) => {
    formModel.value.width = width
    formModel.value.height = height
  },
)

const applyUpdate = (patch: Record<string, any>) => {
  formModel.value = {
    ...(formModel.value || {}),
    ...patch,
  }

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
  const model = formModel.value as any
  if (!model.chartProperty) {
    nextTick(() => {
      formRef.value?.validateField?.('chartProperty')
    })
  }
})

// 当 chartProperty 变化时，重新校验以实时显示/隐藏提示
watch(
  () => (formModel.value as any).chartProperty,
  () => {
    formRef.value?.validateField?.('chartProperty')
  },
)
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
