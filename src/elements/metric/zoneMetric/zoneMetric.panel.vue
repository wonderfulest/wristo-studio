<template>
  <div class="settings-section">
    <el-form :model="currentModel" label-position="left" label-width="118px">
      <DataPropertyField
        v-model="currentModel.dataProperty"
        :required="false"
        @change="updateElement"
      />

      <el-form-item label="Preset">
        <el-select v-model="currentModel.zonePreset" @change="handlePresetChange">
          <el-option label="Heart Rate" value="heartRate" />
          <el-option label="Sedentary" value="sedentary" />
          <el-option label="Custom" value="custom" />
        </el-select>
      </el-form-item>

      <el-form-item label="Display">
        <el-segmented
          v-model="currentModel.displayMode"
          :options="displayOptions"
          @change="updateElement"
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.width')">
        <el-input-number v-model="currentModel.width" :min="48" :max="600" @change="updateElement" />
      </el-form-item>

      <el-form-item :label="t('elementSettings.height')">
        <el-input-number v-model="currentModel.height" :min="48" :max="600" @change="updateElement" />
      </el-form-item>

      <el-form-item v-if="currentModel.displayMode === 'ring'" label="Ring Thick">
        <el-input-number v-model="currentModel.ringThickness" :min="2" :max="80" @change="updateElement" />
      </el-form-item>

      <el-form-item :label="t('elementSettings.gap')">
        <el-input-number v-model="currentModel.gap" :min="0" :max="20" @change="updateElement" />
      </el-form-item>

      <el-form-item v-if="currentModel.displayMode === 'rectangle'" :label="t('elementSettings.borderRadius')">
        <el-input-number v-model="currentModel.borderRadius" :min="0" :max="80" @change="updateElement" />
      </el-form-item>

      <el-form-item label="Inactive">
        <color-picker v-model="currentModel.inactiveColor" @change="updateElement" />
      </el-form-item>

      <el-form-item v-if="currentModel.displayMode === 'rectangle'" :label="t('elementSettings.borderColor')">
        <color-picker v-model="currentModel.borderColor" @change="updateElement" />
      </el-form-item>

      <el-form-item v-if="currentModel.displayMode === 'rectangle'" :label="t('elementSettings.borderWidth')">
        <el-input-number v-model="currentModel.borderWidth" :min="0" :max="20" @change="updateElement" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import ColorPicker from '@/components/color-picker/index.vue'
import DataPropertyField from '@/elements/common/settings/DataPropertyField.vue'
import { resolvePresetDefaults } from './zoneMetric.common'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const displayOptions = [
  { label: 'Rectangle', value: 'rectangle' },
  { label: 'Ring', value: 'ring' },
]

const currentModel = computed<any>(() => props.config ?? props.element ?? {})

const buildPatch = () => {
  const model = currentModel.value
  return {
    left: model.left,
    top: model.top,
    width: model.width,
    height: model.height,
    originX: model.originX,
    originY: model.originY,
    dataProperty: model.dataProperty,
    displayMode: model.displayMode,
    zonePreset: model.zonePreset,
    value: model.value,
    unit: model.unit,
    label: model.label,
    showLabel: model.showLabel,
    showValue: model.showValue,
    showUnit: model.showUnit,
    showZoneLabel: model.showZoneLabel,
    fill: model.fill,
    textColor: model.textColor,
    mutedTextColor: model.mutedTextColor,
    inactiveColor: model.inactiveColor,
    borderColor: model.borderColor,
    borderWidth: model.borderWidth,
    borderRadius: model.borderRadius,
    ringThickness: model.ringThickness,
    gap: model.gap,
    zones: model.zones,
  }
}

const applyPatch = (patch: Record<string, any>) => {
  if (props.applyPatch) {
    props.applyPatch(patch)
    return
  }
  if (props.element) {
    elementManager.updateElement(props.element as any, patch)
  }
}

const updateElement = () => {
  applyPatch(buildPatch())
}

const handlePresetChange = () => {
  const model = currentModel.value
  const defaults = resolvePresetDefaults(model.zonePreset)
  model.label = defaults.label
  model.unit = defaults.unit
  if (model.zonePreset === 'sedentary' && Number(model.value) > 180) model.value = defaults.value
  applyPatch(buildPatch())
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
