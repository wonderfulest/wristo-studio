<template>
  <div class="text-template-editor">
    <el-input
      v-model="localValue"
      type="textarea"
      class="template-input"
      :rows="rows"
      :maxlength="128"
      show-word-limit
      @input="onInput"
    />
    <div v-if="resolvedTemplateError" class="template-error">{{ resolvedTemplateError }}</div>
    <div v-if="showVariableHelper" class="variable-helper">
      <span>{{ helperText || t('templateEditor.variableHelper') }}</span>
      <el-button class="open-token-editor" size="small" text type="primary" @click="openTokenEditor">
        {{ t('templateEditor.editTokens') }}
      </el-button>
    </div>

    <el-dialog
      v-model="tokenDialogOpen"
      class="token-dialog"
      :title="t('templateEditor.tokenDialogTitle')"
      width="min(720px, calc(100vw - 32px))"
      append-to-body
      destroy-on-close
      @closed="discardTokenDraft"
    >
      <div class="token-dialog-content">
        <el-input
          ref="tokenTextareaRef"
          v-model="tokenDraft"
          type="textarea"
          class="token-dialog-input"
          :rows="4"
          :maxlength="128"
          show-word-limit
        />
        <div v-if="tokenDraftError" class="template-error">{{ tokenDraftError }}</div>
        <div class="variables">
          <div class="variables-head">
            <span class="variables-label">{{ t('templateEditor.variables') }}</span>
            <span class="variables-hint">{{ t('templateEditor.tokenDialogHint') }}</span>
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
                <code>{{ formatToken(name) }}</code>
              </button>
            </div>
          </section>
        </div>
      </div>
      <template #footer>
        <el-button class="cancel-token-edit" @click="closeTokenEditor">
          {{ t('common.cancel') }}
        </el-button>
        <el-button
          class="confirm-token-edit"
          type="primary"
          :disabled="Boolean(tokenDraftError)"
          @click="confirmTokenEdit"
        >
          {{ t('common.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import { useDesignStore } from '@/stores/designStore'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import { validateTokenTemplate } from '@/engine/expression/textTemplateTokens'

const { t } = useI18n()
const designStore = useDesignStore()

const props = withDefaults(defineProps<{
  modelValue: string
  rows?: number
  showVariables?: boolean
  variablesInitiallyOpen?: boolean
  helperText?: string
  templateError?: string
  allowedVariables?: string[]
}>(), {
  rows: 3,
  showVariables: true,
  variablesInitiallyOpen: true,
  helperText: '',
  templateError: '',
  allowedVariables: () => [],
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const tokenTextareaRef = ref<any>(null)
const localValue = ref(props.modelValue || '')
const tokenDialogOpen = ref(false)
const tokenDraft = ref('')
const showVariableHelper = ref(props.showVariables)
const templateError = computed(() => {
  return validateTokenTemplate(localValue.value)[0] || ''
})
const tokenDraftError = computed(() => validateTokenTemplate(tokenDraft.value)[0] || '')
const resolvedTemplateError = computed(() => props.templateError || templateError.value)

const categoryTitles: Record<string, string> = {
  'date-time': 'Calendar', activity: 'Activity', sensor: 'Health', system: 'Device', weather: 'Environment', status: 'Status',
}
const variableGroups = computed(() => {
  const groups = new Map<string, string[]>()
  for (const definition of DEFAULT_EXPRESSION_TOKEN_CATALOG.definitions) {
    if (props.allowedVariables.length > 0 && !props.allowedVariables.includes(definition.code)) continue
    if (definition.appLanguages && !definition.appLanguages.includes(designStore.appLanguage)) continue
    const items = groups.get(definition.category) || []
    items.push(definition.code)
    groups.set(definition.category, items)
  }
  return [...groups.entries()].map(([category, items]) => ({ title: categoryTitles[category] || category, items }))
})

const variableLabel = (code: string) => {
  const definition = DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode(code)
  if (!definition) return code
  return designStore.appLanguage === 'zhs' ? definition.labelCn : definition.label
}
const formatToken = (name: string) => `(${name})`

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

const openTokenEditor = () => {
  tokenDraft.value = localValue.value
  tokenDialogOpen.value = true
}

const discardTokenDraft = () => {
  tokenDraft.value = localValue.value
}

const closeTokenEditor = () => {
  discardTokenDraft()
  tokenDialogOpen.value = false
}

const confirmTokenEdit = () => {
  if (tokenDraftError.value) return
  localValue.value = tokenDraft.value
  onInput()
  tokenDialogOpen.value = false
}

const insertVariable = (name: string) => {
  const root = tokenTextareaRef.value as any
  // Element Plus 的 ElInput 组件实例上通常有 textarea 属性指向真实的 HTMLTextAreaElement
  const textarea: HTMLTextAreaElement | null = (root && root.textarea) || root || null
  const token = `(${name})`

  if (!textarea || typeof (textarea as any).setSelectionRange !== 'function') {
    tokenDraft.value += token
    return
  }

  const start = textarea.selectionStart ?? tokenDraft.value.length
  const end = textarea.selectionEnd ?? start

  const before = tokenDraft.value.slice(0, start)
  const after = tokenDraft.value.slice(end)

  tokenDraft.value = `${before}${token}${after}`

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

.template-error {
  color: var(--el-color-danger);
  font-size: 12px;
  line-height: 1.4;
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
  max-height: min(420px, 48vh);
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

.variables-hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.token-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.token-dialog-input :deep(.el-textarea__inner) {
  min-height: 96px !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
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
