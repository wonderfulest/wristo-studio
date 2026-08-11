<template>
  <div class="settings-section">
    <el-form label-position="top">
      <div class="grid">
        <el-form-item :label="t('sunEvents.length')"><el-input-number :model-value="model.length" :min="1" @change="(length: number | undefined) => apply({ length })" /></el-form-item>
        <el-form-item :label="t('sunEvents.strokeWidth')"><el-input-number :model-value="model.strokeWidth" :min="1" @change="(strokeWidth: number | undefined) => apply({ strokeWidth })" /></el-form-item>
        <el-form-item>
          <template #label><AngleHelpLabel :label="t('sunEvents.angle')" /></template>
          <el-input-number :model-value="model.angle" @change="(angle: number | undefined) => apply({ angle })" />
        </el-form-item>
      </div>
    </el-form>
    <SunEventsStyleSettings :model="model" mode="line" @patch="apply" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import { useI18n } from '@/i18n'
import AngleHelpLabel from '@/elements/common/settings/AngleHelpLabel.vue'
import SunEventsStyleSettings from '../common/SunEventsStyleSettings.vue'
const { t } = useI18n()
const props = defineProps<{ element?: any; config?: any; applyPatch?: (patch: Record<string, unknown>) => void }>()
const model = computed(() => props.config ?? props.element?.__element?.config ?? props.element ?? {})
function apply(patch: Record<string, unknown>) {
  if (props.applyPatch && props.config) props.applyPatch(patch)
  else if (props.element) elementManager.updateElement(props.element, patch)
}
</script>
<style scoped>.settings-section { padding: 16px; }.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }</style>
