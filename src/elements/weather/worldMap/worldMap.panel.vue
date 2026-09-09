<template>
  <div class="world-map-settings">
    <el-form label-position="top">
      <el-form-item :label="t('worldMap.showLocation')">
        <el-switch :model-value="model.showLocation" :aria-label="t('worldMap.showLocation')" @change="(value: boolean | string | number) => apply({ showLocation: value })" />
      </el-form-item>
      <div class="grid">
        <el-form-item :label="t('worldMap.markerColor')">
          <el-color-picker :model-value="model.markerColor" :disabled="!model.showLocation" @change="(value: string | null) => value && apply({ markerColor: value })" />
        </el-form-item>
        <el-form-item :label="t('worldMap.markerSize')">
          <el-input-number :model-value="model.markerSize" :min="4" :max="30" :disabled="!model.showLocation" @change="(value: number | undefined) => apply({ markerSize: value })" />
        </el-form-item>
        <el-form-item :label="t('elementSettings.centerX')"><el-input-number :model-value="model.left" @change="(value: number | undefined) => apply({ left: value })" /></el-form-item>
        <el-form-item :label="t('elementSettings.centerY')"><el-input-number :model-value="model.top" @change="(value: number | undefined) => apply({ top: value })" /></el-form-item>
        <el-form-item :label="t('worldMap.width')"><el-input-number :model-value="model.width" :min="24" :max="2000" @change="(value: number | undefined) => apply({ width: value })" /></el-form-item>
        <el-form-item :label="t('worldMap.height')">
          <el-input-number :model-value="model.height" :min="12" :max="2000" @change="(value: number | undefined) => apply({ height: value })" />
        </el-form-item>
      </div>
      <el-divider>{{ t('worldMap.preview') }}</el-divider>
      <p class="hint">{{ t('worldMap.previewHint') }}</p>
      <div class="grid">
        <el-form-item :label="t('worldMap.latitude')">
          <el-input-number
            :model-value="model.previewLatitude ?? undefined"
            :min="-90"
            :max="90"
            :precision="2"
            :disabled="!model.showLocation"
            @change="(value: number | undefined) => apply({ previewLatitude: value ?? null })" />
        </el-form-item>
        <el-form-item :label="t('worldMap.longitude')">
          <el-input-number
            :model-value="model.previewLongitude ?? undefined"
            :min="-180"
            :max="180"
            :precision="2"
            :disabled="!model.showLocation"
            @change="(value: number | undefined) => apply({ previewLongitude: value ?? null })" />
        </el-form-item>
      </div>
      <p class="hint">{{ t('worldMap.noLocationHint') }}</p>
    </el-form>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import { useI18n } from '@/i18n'
import type { FabricElement } from '@/types/element'
import { normalizeWorldMap } from './worldMap.model'
const props = defineProps<{ element?: FabricElement; config?: Record<string, any>; applyPatch?: (patch: Record<string, unknown>) => void }>()
const { t } = useI18n()
const model = computed(() => normalizeWorldMap(props.config ?? props.element?.__element?.config ?? {}))
function apply(patch: Record<string, unknown>) {
  if (props.applyPatch && props.config) props.applyPatch(patch)
  else if (props.element) void elementManager.updateElement(props.element, patch)
}
</script>
<style scoped>
.world-map-settings {
  padding: 16px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.grid :deep(.el-input-number) {
  width: 100%;
}
.hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
  margin: 8px 0 16px;
}
</style>
