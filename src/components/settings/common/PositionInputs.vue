<template>
  <div class="position-inputs">
    <el-input-number
      :model-value="left"
      :min="min"
      :max="max"
      :step="step"
      placeholder="X"
      @change="onLeftChange"
    />
    <el-input-number
      :model-value="top"
      :min="min"
      :max="max"
      :step="step"
      placeholder="Y"
      @change="onTopChange"
    />
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

const props = defineProps<{
  left: number
  top: number
  min?: number
  max?: number
  step?: number
}>()

const emit = defineEmits<{
  (e: 'update:left', value: number): void
  (e: 'update:top', value: number): void
  (e: 'change', payload: { left: number; top: number }): void
}>()

const onLeftChange = (val: number) => {
  emit('update:left', val)
  emit('change', { left: val, top: props.top })
}

const onTopChange = (val: number) => {
  emit('update:top', val)
  emit('change', { left: props.left, top: val })
}
</script>

<style scoped>
/* layout/styles come from global settings.css (.position-inputs) */
</style>
