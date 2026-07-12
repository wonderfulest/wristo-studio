<template>
  <section class="tick-color-settings">
    <el-form-item :label="t('elementSettings.tickColor')">
      <ColorPicker
        :model-value="currentModel.fill || '#ffffff'"
        @property-change="handleColorSelection"
      />
    </el-form-item>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ColorPicker from '@/components/color-picker/index.vue'
import * as elementManager from '@/engine/managers/elementManager'
import { useI18n } from '@/i18n'
import type { ColorSelectionPayload } from '@/components/color-picker/colorSelection'

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const { t } = useI18n()
const currentModel = computed<any>(() => props.config ?? props.element ?? {})

const applyUpdate = (patch: Record<string, any>) => {
  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }
  if (props.element) {
    elementManager.updateElement(props.element, patch)
  }
}

const handleColorSelection = (payload: ColorSelectionPayload) => {
  applyUpdate({
    fill: payload.color,
    fillProperty: payload.propertyKey,
  })
}
</script>

<style scoped>
.tick-color-settings {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>
