<template>
  <div class="settings-section">
    <el-form ref="formRef" :model="currentModel" label-position="left" label-width="120px">
      <GoalPropertyField
        v-model="currentModel.goalProperty"
        @change="updateElement"
      />

      <el-form-item label="Width">
        <el-input-number v-model="currentModel.designWidth" :min="50" :max="600" @change="updateElement" />
      </el-form-item>

      <el-form-item label="Height">
        <el-input-number v-model="currentModel.designHeight" :min="4" :max="60" @change="updateElement" />
      </el-form-item>

      <el-form-item label="Segments">
        <el-input-number v-model="currentModel.segments" :min="1" :max="50" :step="1" @change="updateElement" />
      </el-form-item>

      <el-form-item label="Gap">
        <el-input-number v-model="currentModel.gap" :min="0" :max="20" :step="1" @change="updateElement" />
      </el-form-item>

      <el-form-item label="Border Radius">
        <el-input-number v-model="currentModel.borderRadius" :min="0" :max="30" @change="updateElement" />
      </el-form-item>

      <el-form-item label="Progress">
        <el-slider v-model="currentModel.progress" :min="0" :max="1" :step="0.01" @change="updateElement" />
      </el-form-item>

      <el-form-item label="Active Color">
        <color-picker v-model="currentModel.color" @change="handleActiveColorChange" />
      </el-form-item>

      <el-form-item label="Background Color">
        <color-picker v-model="currentModel.bgColor" @change="handleBgColorChange" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import ColorPicker from '@/components/color-picker/index.vue'
import GoalPropertyField from '@/elements/common/settings/GoalPropertyField.vue'

const props = defineProps({
  element: {
    type: Object,
    required: false,
  },
  config: {
    type: Object,
    required: false,
  },
  applyPatch: {
    type: Function,
    required: false,
  },
})

const formRef = ref()

const currentModel = computed<any>(() => {
  return (props as any).config ?? props.element ?? {}
})

const buildPatchFromModel = (model: any) => {
  return {
    width: model.designWidth ?? model.width,
    height: model.designHeight ?? model.height,
    borderRadius: model.borderRadius,
    segments: model.segments,
    gap: model.gap,
    progress: model.progress,
    color: model.color,
    bgColor: model.bgColor,
    originX: model.originX,
    originY: model.originY,
    goalProperty: model.goalProperty,
  }
}

const updateElement = () => {
  const model = currentModel.value as any
  const patch = buildPatchFromModel(model)

  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }

  if (!props.element) return

  elementManager.updateElement(props.element as any, patch)
}

const handleActiveColorChange = (val: string) => {
  ;(currentModel.value as any).color = val
  updateElement()
}

const handleBgColorChange = (val: string) => {
  ;(currentModel.value as any).bgColor = val
  updateElement()
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
