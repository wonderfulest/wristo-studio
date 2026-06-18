<template>
  <div class="text-template-editor">
    <el-input
      ref="textareaRef"
      v-model="localValue"
      type="textarea"
      class="template-input"
      :rows="3"
      @input="onInput"
    />
    <div class="variables">
      <span class="variables-label">{{ t('templateEditor.variables') }}:</span>
      <el-button
        v-for="variable in variables"
        :key="variable.name"
        class="variable-chip"
        size="small"
        text
        @click="insertVariable(variable.name)"
      >
        {{ variable.name }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const textareaRef = ref<any>(null)
const localValue = ref(props.modelValue || '')

const variables = [
  'heart',
  'hr',
  'alarms',
  'notifications',
  'steps',
  'calories',
  'floors',
  'distance',
  'altitude',
  'restingHeart',
  'battery',
  'respiration',
  'location',
  'aqi',
  'pm25',
  'bodyBattery',
  'stress',
  'sunrise',
  'sunset',
  'quote',
  'push',
  'sleep',
  'year',
  'month',
  'day',
  'weekday',
  'week',
].map((name) => ({ name }))

watch(
  () => props.modelValue,
  (val) => {
    if (val !== localValue.value) {
      localValue.value = val || ''
    }
  }
)

const onInput = () => {
  emit('update:modelValue', localValue.value)
  emit('change', localValue.value)
}

const insertVariable = (name: string) => {
  const root = textareaRef.value as any
  // Element Plus 的 ElInput 组件实例上通常有 textarea 属性指向真实的 HTMLTextAreaElement
  const textarea: HTMLTextAreaElement | null = (root && root.textarea) || root || null
  const token = `{{${name}}}`

  if (!textarea || typeof (textarea as any).setSelectionRange !== 'function') {
    localValue.value += token
    onInput()
    return
  }

  const start = textarea.selectionStart ?? localValue.value.length
  const end = textarea.selectionEnd ?? start

  const before = localValue.value.slice(0, start)
  const after = localValue.value.slice(end)

  localValue.value = `${before}${token}${after}`

  emit('update:modelValue', localValue.value)
  emit('change', localValue.value)

  requestAnimationFrame(() => {
    const pos = start + token.length
    textarea.setSelectionRange(pos, pos)
    textarea.focus()
  })
}
</script>

<style scoped>
.text-template-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.template-input {
  width: 100%;
  min-height: 60px;
  resize: vertical;
}

.template-input :deep(.el-textarea__inner) {
  min-height: 96px !important;
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
}

.variables {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.variables-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-right: 4px;
}

.variable-chip {
  border: 1px solid var(--el-border-color);
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 12px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease, background-color 0.18s ease;
}

.variable-chip:hover {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
</style>
