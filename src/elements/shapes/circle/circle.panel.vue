<template>
  <div class="settings-section">
    <el-form :model="currentModel" label-position="left" label-width="100px">
      <el-form-item :label="t('elementSettings.radius')">
        <el-input-number 
          v-model.number="radiusProxy" 
          :min="MIN_CIRCLE_RADIUS"
          :max="227" 
          :step="1"
          :precision="0"
          @change="(v: number) => applyUpdate({ radius: v })" 
        />
      </el-form-item>
      <el-form-item :label="t('elementSettings.fillColor')">
        <color-picker
          v-model="currentModel.fill"
          enable-gradient
          :gradient-enabled="Boolean(currentModel.gradientEnabled)"
          :gradient-start-color="currentModel.gradientStartColor ?? currentModel.fill"
          :gradient-end-color="currentModel.gradientEndColor ?? currentModel.fill"
          @change="(v: string) => applyUpdate({ fill: v })"
          @gradient-change="handleGradientChange"
        />
      </el-form-item>
      <el-form-item v-if="currentModel.gradientEnabled" :label="t('elementSettings.gradientDirection')">
        <el-select
          v-model="currentModel.gradientDirection"
          @change="(v: string) => applyUpdate({ gradientDirection: v })"
        >
          <el-option :label="t('elementSettings.leftToRight')" value="leftToRight" />
          <el-option :label="t('elementSettings.rightToLeft')" value="rightToLeft" />
          <el-option :label="t('elementSettings.topToBottom')" value="topToBottom" />
          <el-option :label="t('elementSettings.bottomToTop')" value="bottomToTop" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('elementSettings.borderColor')">
        <color-picker 
          v-model="currentModel.stroke" 
          @change="(v: string) => applyUpdate({ stroke: v })" 
        />
      </el-form-item>
      <el-form-item :label="t('elementSettings.borderWidth')">
        <el-input-number 
          v-model.number="currentModel.strokeWidth" 
          :min="0" 
          :max="20" 
          @change="(v: number) => applyUpdate({ strokeWidth: v })" 
        />
      </el-form-item>
      <el-form-item :label="t('elementSettings.opacity')">
        <el-slider 
          v-model.number="currentModel.opacity" 
          :min="0" 
          :max="1" 
          :step="0.1" 
          @change="(v: number) => applyUpdate({ opacity: v })" 
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
import { MIN_CIRCLE_RADIUS, normalizeCircleRadius } from '@/elements/shapes/circle/circle.renderer'

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const currentModel = computed<any>(() => {
  return props.config ?? props.element ?? {}
})
const { t } = useI18n()

const radiusProxy = computed<number>({
  get() {
    return normalizeCircleRadius((currentModel.value as any).radius)
  },
  set(v: number) {
    applyUpdate({ radius: v })
  },
})

const applyUpdate = (patch: Record<string, any>) => {
  const nextPatch = patch.radius !== undefined
    ? { ...patch, radius: normalizeCircleRadius(patch.radius) }
    : patch

  if (props.applyPatch && props.config) {
    props.applyPatch(nextPatch)
    return
  }

  if (props.element) {
    elementManager.updateElement(props.element as any, nextPatch)
  }
}

const handleGradientChange = (value: { enabled: boolean; startColor: string; endColor: string }) => {
  Object.assign(currentModel.value, {
    gradientEnabled: value.enabled,
    gradientStartColor: value.startColor,
    gradientEndColor: value.endColor,
    gradientDirection: currentModel.value.gradientDirection ?? 'leftToRight',
  })
  applyUpdate({
    gradientEnabled: value.enabled,
    gradientStartColor: value.startColor,
    gradientEndColor: value.endColor,
    gradientDirection: currentModel.value.gradientDirection,
  })
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
