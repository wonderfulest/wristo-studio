<template>
  <div class="font-size-select">
    <button
      class="font-size-step"
      type="button"
      :disabled="!canDecrease"
      :aria-label="t('shortcuts.decreaseFontSize')"
      @click="step(-1)"
    >
      -
    </button>
    <el-select
      class="font-size-value"
      :model-value="normalizedValue"
      popper-class="font-size-select-popper"
      filterable
      @change="selectSize"
    >
      <el-option
        v-for="size in sortedOptions"
        :key="size"
        :label="`${size}px`"
        :value="size"
      >
        <div class="font-size-option">
          <span class="font-size-option-value">{{ size }}</span>
          <span class="font-size-option-unit">px</span>
        </div>
      </el-option>
    </el-select>
    <button
      class="font-size-step"
      type="button"
      :disabled="!canIncrease"
      :aria-label="t('shortcuts.increaseFontSize')"
      @click="step(1)"
    >
      +
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { fontSizes as defaultFontSizes } from '@/config/settings'
import { useI18n } from '@/i18n'

const props = withDefaults(defineProps<{
  modelValue?: number | string | null
  options?: number[]
}>(), {
  options: () => defaultFontSizes,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'change', value: number): void
}>()

const { t } = useI18n()

const sortedOptions = computed(() => {
  return [...new Set(props.options.map(Number).filter(Number.isFinite))].sort((a, b) => a - b)
})

const nearestOption = (value: unknown): number => {
  const options = sortedOptions.value
  const fallback = options[0] ?? 12
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return options.reduce((best, size) => {
    return Math.abs(size - numeric) < Math.abs(best - numeric) ? size : best
  }, fallback)
}

const normalizedValue = computed(() => nearestOption(props.modelValue))

const currentIndex = computed(() => sortedOptions.value.indexOf(normalizedValue.value))
const canDecrease = computed(() => currentIndex.value > 0)
const canIncrease = computed(() => currentIndex.value >= 0 && currentIndex.value < sortedOptions.value.length - 1)

const commit = (value: number) => {
  emit('update:modelValue', value)
  emit('change', value)
}

const selectSize = (value: number) => {
  commit(Number(value))
}

const step = (direction: -1 | 1) => {
  const nextIndex = currentIndex.value + direction
  const next = sortedOptions.value[nextIndex]
  if (next == null) return
  commit(next)
}
</script>

<style scoped>
.font-size-select {
  display: grid;
  width: 100%;
  grid-template-columns: 32px minmax(0, 1fr) 32px;
  overflow: hidden;
  border: 1px solid var(--studio-border);
  border-radius: 7px;
  background: var(--studio-surface);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.font-size-step {
  display: flex;
  width: 32px;
  min-width: 0;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 0;
  background: var(--studio-surface-soft);
  color: var(--studio-text);
  cursor: pointer;
  font-size: 16px;
  font-weight: 800;
  line-height: 1;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    opacity 0.15s ease;
}

.font-size-step:first-child {
  border-right: 1px solid var(--studio-border);
}

.font-size-step:last-child {
  border-left: 1px solid var(--studio-border);
}

.font-size-step:hover:not(:disabled) {
  background: color-mix(in srgb, var(--studio-primary) 9%, var(--studio-surface));
  color: var(--studio-primary);
}

.font-size-step:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.font-size-value {
  width: 100%;
}

.font-size-value :deep(.el-select__wrapper) {
  min-height: 34px;
  border-radius: 0;
  box-shadow: none;
}

.font-size-value :deep(.el-select__selected-item) {
  justify-content: center;
  color: var(--studio-text);
  font-variant-numeric: tabular-nums;
  font-weight: 750;
}

.font-size-option {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  font-variant-numeric: tabular-nums;
}

.font-size-option-value {
  color: var(--studio-text);
  font-weight: 750;
}

.font-size-option-unit {
  color: var(--studio-text-muted);
  font-size: 11px;
  font-weight: 700;
}
</style>
