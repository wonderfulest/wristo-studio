<template>
  <section class="tick-color-settings">
    <ColorPropertyField
      :model-value="currentModel.fillProperty || ''"
      @change="handlePropertyChange"
    />
    <el-form-item :label="t('elementSettings.previewFallbackColor')">
      <ColorPicker
        :model-value="currentModel.fill || '#ffffff'"
        @change="handleFillChange"
      />
    </el-form-item>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ColorPicker from '@/components/color-picker/index.vue'
import ColorPropertyField from '@/elements/common/settings/ColorPropertyField.vue'
import { usePropertiesStore } from '@/stores/properties'
import * as elementManager from '@/engine/managers/elementManager'
import { useI18n } from '@/i18n'
import { resolveDialColorPatch } from './dialColor'

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const propertiesStore = usePropertiesStore()
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

const handlePropertyChange = (propertyKey: string) => {
  applyUpdate(
    resolveDialColorPatch(
      propertyKey,
      propertiesStore.allProperties,
      currentModel.value.fill || '#ffffff',
    ),
  )
}

const handleFillChange = (color: string) => {
  applyUpdate({ fill: color })
}
</script>

<style scoped>
.tick-color-settings {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>
