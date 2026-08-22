<template>
  <div class="settings-section">
    <el-form :model="currentModel" label-position="left" label-width="100px">
      <el-form-item :label="t('elementSettings.width')">
        <el-input-number
          :model-value="currentModel.width"
          :min="1"
          :max="500"
          @change="(value: number) => applyUpdate({ width: Number(value) })"
        />
      </el-form-item>
      <el-form-item :label="t('elementSettings.height')">
        <el-input-number
          :model-value="currentModel.height"
          :min="1"
          :max="500"
          @change="(value: number) => applyUpdate({ height: Number(value) })"
        />
      </el-form-item>
      <el-form-item :label="t('gridLines.spacing')">
        <el-input-number
          :model-value="currentModel.spacing"
          :min="1"
          :max="500"
          @change="(value: number) => applyUpdate({ spacing: Number(value) })"
        />
      </el-form-item>
      <el-form-item :label="t('elementSettings.lineWidth')">
        <el-input-number
          :model-value="currentModel.lineWidth"
          :min="1"
          :max="20"
          @change="(value: number) => applyUpdate({ lineWidth: Number(value) })"
        />
      </el-form-item>
      <el-form-item :label="t('elementSettings.lineColor')">
        <color-picker
          v-model="currentModel.color"
          :property-key="currentModel.colorProperty"
          @change="(color: string) => applyUpdate({ color })"
          @property-change="applyUpdate({ color: $event.color, colorProperty: $event.propertyKey })"
        />
      </el-form-item>
      <el-form-item :label="t('gridLines.rotation')">
        <el-input-number
          :model-value="currentModel.rotation ?? currentModel.angle ?? 0"
          :min="-360"
          :max="360"
          @change="(value: number) => applyUpdate({ rotation: Number(value) })"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ColorPicker from '@/components/color-picker/index.vue'
import * as elementManager from '@/engine/managers/elementManager'
import { useI18n } from '@/i18n'

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const { t } = useI18n()
const currentModel = computed<any>(() => props.config ?? props.element ?? {})

function applyUpdate(patch: Record<string, any>) {
  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }
  if (props.element) elementManager.updateElement(props.element, patch)
}
</script>

<style scoped>
.settings-section { padding: 16px; }
.el-form-item { margin-bottom: 16px; }
</style>
