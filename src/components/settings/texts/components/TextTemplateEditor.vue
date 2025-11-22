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
      <span class="variables-label">变量：</span>
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

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
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
  'pm10',
  'o3',
  'no2',
  'so2',
  'co',
  'nh3',
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
  const textarea = textareaRef.value
  const token = `{{${name}}}`

  if (!textarea) {
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
  gap: 8px;
}

.template-input {
  width: 100%;
  min-height: 60px;
  resize: vertical;
}

.variables {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.variables-label {
  font-size: 12px;
  color: #888;
  margin-right: 4px;
}

.variable-chip {
  border: 1px solid #ccc;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
  background: #f7f7f7;
  cursor: pointer;
}
</style>
