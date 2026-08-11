<template>
  <div class="settings-section">
    <el-form :model="currentModel" label-position="left" label-width="100px">
      <el-form-item :label="t('elementSettings.width')">
        <el-input-number v-model.number="currentModel.width" :min="10" :max="500" @change="(v: number) => applyUpdate({ width: v })" />
      </el-form-item>
      <el-form-item :label="t('elementSettings.height')">
        <el-input-number v-model.number="currentModel.height" :min="10" :max="500" @change="(v: number) => applyUpdate({ height: v })" />
      </el-form-item>
      <el-form-item :label="t('elementSettings.angle')">
        <el-input-number :model-value="currentModel.rotation ?? 0" :min="-360" :max="360" @change="(v: number) => applyUpdate({ rotation: Number(v) })" />
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
        <el-select v-model="currentModel.gradientDirection" @change="(v: string) => applyUpdate({ gradientDirection: v })">
          <el-option :label="t('elementSettings.leftToRight')" value="leftToRight" />
          <el-option :label="t('elementSettings.rightToLeft')" value="rightToLeft" />
          <el-option :label="t('elementSettings.topToBottom')" value="topToBottom" />
          <el-option :label="t('elementSettings.bottomToTop')" value="bottomToTop" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('elementSettings.borderColor')">
        <color-picker v-model="currentModel.stroke" @change="(v: string) => applyUpdate({ stroke: v })" />
      </el-form-item>
      <el-form-item :label="t('elementSettings.borderWidth')">
        <el-input-number v-model.number="currentModel.strokeWidth" :min="0" :max="20" @change="(v: number) => applyUpdate({ strokeWidth: v })" />
      </el-form-item>
      <el-form-item :label="t('elementSettings.opacity')">
        <el-slider v-model.number="currentModel.opacity" :min="0" :max="1" :step="0.1" @change="(v: number) => applyUpdate({ opacity: v })" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ColorPicker from '@/components/color-picker/index.vue'
import * as elementManager from '@/engine/managers/elementManager'
import { useI18n } from '@/i18n'

const props = defineProps<{ element?: any; config?: Record<string, any> | null; applyPatch?: (patch: Record<string, any>) => void }>()
const { t } = useI18n()
const currentModel = computed<any>(() => props.config ?? props.element ?? {})

function applyUpdate(patch: Record<string, any>) {
  if (props.applyPatch && props.config) props.applyPatch(patch)
  else if (props.element) elementManager.updateElement(props.element, patch)
}

function handleGradientChange(value: { enabled: boolean; startColor: string; endColor: string }) {
  applyUpdate({
    gradientEnabled: value.enabled,
    gradientStartColor: value.startColor,
    gradientEndColor: value.endColor,
    gradientDirection: currentModel.value.gradientDirection ?? 'leftToRight',
  })
}
</script>

<style scoped>
.settings-section { padding: 16px; }
.el-form-item { margin-bottom: 16px; }
</style>
