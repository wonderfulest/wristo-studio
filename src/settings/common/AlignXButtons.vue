<template>
  <div class="align-buttons">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      :class="{ active: modelValue === opt.value }"
      :title="opt.label"
      @click="$emit('update:modelValue', opt.value)"
    >
      <Icon v-if="opt.icon" :icon="opt.icon" />
      <span v-else>{{ opt.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

type AlignOption = {
  label: string
  value: string
  icon?: string
}

defineProps<{
  modelValue: string
  options: AlignOption[]
}>()

defineEmits<{(e: 'update:modelValue', value: string): void}>()
</script>

<style>
</style>
