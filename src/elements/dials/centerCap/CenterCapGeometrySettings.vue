<template>
  <div class="cap-geometry">
    <label v-for="field in fields" :key="field.key">
      <span>{{ t(field.label) }}</span>
      <el-input-number
        :data-cap-field="field.key"
        :model-value="model?.[field.key]"
        :min="field.key === 'targetSize' ? 1 : -9999"
        :max="9999"
        :step="1"
        controls-position="right"
        @change="update(field.key, $event)"
      />
    </label>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/i18n'
defineProps<{ model?: Record<string, any> | null }>()
const emit = defineEmits<{ update: [patch: Record<string, number>] }>()
const { t } = useI18n()
const fields = [
  { key: 'left', label: 'elementSettings.centerCapX' },
  { key: 'top', label: 'elementSettings.centerCapY' },
  { key: 'targetSize', label: 'elementSettings.centerCapSize' },
]
function update(field: string, value: number | undefined): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) return
  emit('update', { [field]: field === 'targetSize' ? Math.max(1, Math.round(value)) : value })
}
</script>

<style scoped>
.cap-geometry { display: grid; gap: 10px; margin-top: 12px; }
.cap-geometry label { display: grid; gap: 6px; font-size: 12px; }
.cap-geometry :deep(.el-input-number) { width: 100%; }
</style>
