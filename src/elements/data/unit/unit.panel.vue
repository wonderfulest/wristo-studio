<template>
  <DataPanel
    :element="element"
    :config="config"
    :apply-patch="applyPatch"
    @close="$emit('close')"
  />
</template>

<script setup lang="ts">
import DataPanel from '@/elements/data/data/data.panel.vue'

defineEmits(['close'])
defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()
</script>
