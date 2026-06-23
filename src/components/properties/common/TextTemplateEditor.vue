<template>
  <div class="text-template-editor">
    <el-input
      ref="textareaRef"
      v-model="localValue"
      type="textarea"
      class="template-input"
      :rows="rows"
      @input="onInput"
    />
    <div v-if="showVariableHelper" class="variable-helper">
      <span>{{ helperText || t('templateEditor.variableHelper') }}</span>
      <el-button size="small" text type="primary" @click="variablesOpen = !variablesOpen">
        {{ variablesOpen ? t('templateEditor.hideVariables') : t('templateEditor.showVariables') }}
      </el-button>
    </div>
    <div v-if="showVariables && variablesOpen" class="variables">
      <div class="variables-head">
        <span class="variables-label">{{ t('templateEditor.variables') }}</span>
      </div>
      <section v-for="group in variableGroups" :key="group.title" class="variable-group">
        <div class="variable-group-title">{{ group.title }}</div>
        <div class="variable-chips">
          <button
            v-for="name in group.items"
            :key="name"
            class="variable-chip"
            type="button"
            @click="insertVariable(name)"
          >
            <span>{{ variableLabel(name) }}</span>
            <code>{{ tokenLabel(name) }}</code>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  modelValue: string
  rows?: number
  showVariables?: boolean
  variablesInitiallyOpen?: boolean
  helperText?: string
}>(), {
  rows: 3,
  showVariables: true,
  variablesInitiallyOpen: true,
  helperText: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const textareaRef = ref<any>(null)
const localValue = ref(props.modelValue || '')
const variablesOpen = ref(props.variablesInitiallyOpen)
const showVariableHelper = ref(props.showVariables)

const variableGroups = [
  {
    title: 'Activity',
    items: ['steps', 'calories', 'distance', 'floors', 'altitude'],
  },
  {
    title: 'Health',
    items: ['hr', 'heart', 'restingHeart', 'bodyBattery', 'stress', 'sleep', 'respiration'],
  },
  {
    title: 'Device',
    items: ['battery', 'notifications', 'alarms'],
  },
  {
    title: 'Environment',
    items: ['location', 'aqi', 'pm25', 'sunrise', 'sunset'],
  },
  {
    title: 'Calendar',
    items: ['year', 'month', 'day', 'weekday', 'week'],
  },
  {
    title: 'Text',
    items: ['quote', 'push'],
  },
]

const variableLabels: Record<string, string> = {
  hr: 'HR',
  heart: 'Heart',
  restingHeart: 'Rest HR',
  bodyBattery: 'Body Battery',
  pm25: 'PM2.5',
}

const variableLabel = (name: string) => variableLabels[name] || name
const tokenLabel = (name: string) => `{{${name}}}`

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
  gap: 8px;
}

.template-input {
  width: 100%;
  min-height: 60px;
  resize: vertical;
}

.template-input :deep(.el-textarea__inner) {
  min-height: 72px !important;
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
}

.variable-helper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.variable-helper span {
  min-width: 0;
}

.variables {
  display: flex;
  flex-direction: column;
  gap: 9px;
  max-height: 240px;
  overflow: auto;
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-extra-light);
}

.variables-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.variables-label {
  color: var(--el-text-color-primary);
  font-size: 12px;
  font-weight: 700;
}

.variable-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.variable-group-title {
  color: var(--el-text-color-secondary);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1.2;
  text-transform: uppercase;
}

.variable-chips {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  gap: 5px;
}

.variable-chip {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 6px 7px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.variable-chip:hover {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.variable-chip span,
.variable-chip code {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.variable-chip span {
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 700;
}

.variable-chip code {
  color: var(--el-text-color-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  line-height: 1.2;
}
</style>
