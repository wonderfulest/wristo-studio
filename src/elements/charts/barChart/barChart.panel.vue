<template>
  <div class="settings-section">
    <el-form 
      ref="formRef"
      :model="formModel" 
      label-position="left" 
      label-width="100px"
      status-icon
      validate-on-rule-change
    >
      <ChartPropertyField v-model="formModel.chartProperty" @change="(v: any) => applyUpdate({ chartProperty: v })" />

        <el-form-item label="宽度">
        <el-input-number 
          v-model="formModel.width" 
          :min="60" 
          :max="454" 
          @change="() => applyUpdate({ width: formModel.width })" 
        />
      </el-form-item>
      
      <el-form-item label="高度">
        <el-input-number 
          v-model="formModel.height" 
          :min="20" 
          :max="227" 
          @change="() => applyUpdate({ height: formModel.height })" 
        />
      </el-form-item>

      <el-form-item label="对齐方式">
        <AlignXButtons 
          :options="originXOptions" 
          v-model="formModel.originX"
          @update:modelValue="(v: any) => applyUpdate({ originX: v })"
        />
      </el-form-item>

      <el-form-item label="柱形宽度">
        <el-input-number 
          v-model="formModel.barWidth" 
          :min="1" 
          :max="60" 
          :step="1"
          @change="() => applyUpdate({ barWidth: formModel.barWidth })" 
        />
      </el-form-item>

      <el-form-item label="区间颜色(5段)">
        <div style="display:flex; gap: 8px; flex-wrap: wrap;">
          <color-picker
            v-for="idx in 5"
            :key="idx"
            :model-value="(formModel.colors?.[idx - 1] ?? '')"
            @change="(v: any) => handleColorRangeChange(idx - 1, v)"
          />
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import ColorPicker from '@/components/color-picker/index.vue'
import ChartPropertyField from '@/elements/common/settings/ChartPropertyField.vue'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const formRef = ref()

const formModel = ref<any>({})

const syncFromProps = () => {
  const src = (props.config ?? props.element ?? {}) as any
  const next: any = { ...src }
  if (Array.isArray(src?.colors)) {
    next.colors = [...src.colors]
  }
  formModel.value = next
}

watch(
  () => (props.config as any)?.id ?? (props.element as any)?.id,
  () => {
    syncFromProps()
  },
  { immediate: true },
)

const originXOptions = [
  { label: '左', value: 'left' },
  { label: '中', value: 'center' },
  { label: '右', value: 'right' },
]

const handleColorRangeChange = (index: number, val: string) => {
  const model = formModel.value as any
  const existing = Array.isArray(model.colors) ? [...model.colors] : ['', '', '', '', '']
  existing[index] = val
  applyUpdate({ colors: existing })
}

const applyUpdate = (patch: Record<string, any>) => {
  formModel.value = {
    ...(formModel.value || {}),
    ...patch,
    colors: Array.isArray(patch.colors) ? [...patch.colors] : (formModel.value as any)?.colors,
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
</style>
