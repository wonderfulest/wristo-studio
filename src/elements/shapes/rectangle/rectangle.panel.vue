<template>
  <div class="settings-section">
    <el-form :model="currentModel" label-position="left" label-width="100px">
      <el-form-item :label="t('elementSettings.width')">
        <el-input-number
          v-model.number="currentModel.width"
          :min="10"
          :max="500"
          @change="(v: number) => applyUpdate({ width: v })"
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.height')">
        <el-input-number
          v-model.number="currentModel.height"
          :min="10"
          :max="500"
          @change="(v: number) => applyUpdate({ height: v })"
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.borderRadius')">
        <el-input-number
          v-model.number="borderRadiusProxy"
          :min="0"
          :max="100"
          @change="(v: number) => applyUpdate({ borderRadius: v })"
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.fillColor')">
        <color-picker
          v-model="currentModel.fill"
          @change="(v: string) => applyUpdate({ fill: v })"
        />
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

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const currentModel = computed<any>(() => {
  return props.config ?? props.element ?? {}
})
const { t } = useI18n()

const borderRadiusProxy = computed<number>({
  get() {
    const model = currentModel.value as any
    return Number(model.borderRadius ?? model.rx ?? 0)
  },
  set(v: number) {
    applyUpdate({ borderRadius: v })
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
