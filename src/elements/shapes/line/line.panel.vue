<template>
  <div class="settings-section">
    <el-form :model="currentModel" label-position="left" label-width="100px">
      <el-form-item :label="t('elementSettings.lineColor')">
        <color-picker 
          v-model="strokeProxy"
          show-alpha
        />
      </el-form-item>
      <el-form-item :label="t('elementSettings.lineWidth')">
        <el-input-number 
          :model-value="strokeWidthProxy"
          :min="1" 
          :max="20" 
          :step="1"
          controls-position="right"
          @change="(v: number) => applyUpdate({ strokeWidth: v })"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import ColorPicker from '@/components/color-picker/index.vue'
import { useI18n } from '@/i18n'
import { resolveLinePanelColor, resolveLinePanelWidth } from './line.panelModel'

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const { t } = useI18n()

const currentModel = computed<any>(() => {
  return props.config ?? props.element ?? {}
})

// 业务配置使用 stroke/strokeWidth；没有配置快照时才回退到 Fabric Rect 的 fill/height。
const strokeProxy = computed<string>({
  get() {
    return resolveLinePanelColor(currentModel.value)
  },
  set(v: string) {
    applyUpdate({ stroke: v })
  },
})

const strokeWidthProxy = computed<number>({
  get() {
    return resolveLinePanelWidth(currentModel.value)
  },
  set(v: number) {
    applyUpdate({ strokeWidth: v })
  },
})

const applyUpdate = (patch: Record<string, any>) => {
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
  padding: 16px;
}

.el-form-item {
  margin-bottom: 16px;
}
</style>
