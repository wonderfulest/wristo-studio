<template>
  <div class="settings-section">
    <el-form :model="currentModel" label-position="left" label-width="100px">
      <el-form-item label="宽度">
        <el-input-number
          v-model.number="currentModel.width"
          :min="10"
          :max="500"
          @change="(v: number) => applyUpdate({ width: v })"
        />
      </el-form-item>

      <el-form-item label="高度">
        <el-input-number
          v-model.number="currentModel.height"
          :min="10"
          :max="500"
          @change="(v: number) => applyUpdate({ height: v })"
        />
      </el-form-item>

      <el-form-item label="圆角">
        <el-input-number
          v-model.number="borderRadiusProxy"
          :min="0"
          :max="100"
          @change="(v: number) => applyUpdate({ borderRadius: v })"
        />
      </el-form-item>

      <el-form-item label="填充颜色">
        <color-picker
          v-model="currentModel.fill"
          @change="(v: string) => applyUpdate({ fill: v })"
        />
      </el-form-item>

      <el-form-item label="边框颜色">
        <color-picker
          v-model="currentModel.stroke"
          @change="(v: string) => applyUpdate({ stroke: v })"
        />
      </el-form-item>

      <el-form-item label="边框宽度">
        <el-input-number
          v-model.number="currentModel.strokeWidth"
          :min="0"
          :max="20"
          @change="(v: number) => applyUpdate({ strokeWidth: v })"
        />
      </el-form-item>

      <el-form-item label="不透明度">
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

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const currentModel = computed<any>(() => {
  return props.config ?? props.element ?? {}
})

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
