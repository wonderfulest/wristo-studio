<template>
  <div class="expression-editor">
    <TokenPicker @insert="appendToken" />
    <el-input
      :model-value="modelValue"
      type="textarea"
      :rows="3"
      spellcheck="false"
      :placeholder="t('expression.visibilityPlaceholder')"
      @update:model-value="emit('update:modelValue', String($event))"
    />
    <p v-if="error" class="expression-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import TokenPicker from './TokenPicker.vue'
import { useI18n } from '@/i18n'

const props = defineProps<{ modelValue: string; error?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { t } = useI18n()
const appendToken = (token: string) => {
  const separator = props.modelValue.trim() ? ' ' : ''
  emit('update:modelValue', `${props.modelValue}${separator}${token}`)
}
</script>

<style scoped>
.expression-editor { display: grid; gap: 8px; width: 100%; }
.expression-error { margin: 0; color: var(--el-color-danger); font-size: 12px; }
</style>
