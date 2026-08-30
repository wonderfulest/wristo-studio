<template>
  <div class="text-template-editor">
    <el-input v-model="localValue" type="textarea" class="template-input" :rows="rows" :maxlength="128" show-word-limit @input="onInput" />
    <div v-if="resolvedTemplateError" class="template-error">{{ resolvedTemplateError }}</div>
    <div v-if="showVariableHelper" class="variable-helper">
      <span>{{ helperText || t('templateEditor.variableHelper') }}</span>
      <el-button class="open-token-editor" size="small" text type="primary" @click="openTokenEditor">
        {{ t('templateEditor.editTokens') }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import { useDesignStore } from '@/stores/designStore'
import { validateTokenTemplate } from '@/engine/expression/textTemplateTokens'
import { openRouteInNewTab } from '@/utils/openRouteInNewTab'
import { createTokenEditorSession, type TokenEditorSession } from '@/views/tokens/tokenEditorTransfer'

const { t } = useI18n()
const designStore = useDesignStore()
const router = useRouter()

const props = withDefaults(
  defineProps<{
    modelValue: string
    rows?: number
    showVariables?: boolean
    variablesInitiallyOpen?: boolean
    helperText?: string
    templateError?: string
    allowedVariables?: string[]
  }>(),
  {
    rows: 3,
    showVariables: true,
    variablesInitiallyOpen: true,
    helperText: '',
    templateError: '',
    allowedVariables: () => []
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const localValue = ref(props.modelValue || '')
const activeTokenEditorSession = ref<TokenEditorSession | null>(null)
const showVariableHelper = ref(props.showVariables)
const validationError = computed(() => {
  return validateTokenTemplate(localValue.value)[0] || ''
})
const resolvedTemplateError = computed(() => props.templateError || validationError.value)

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
  activeTokenEditorSession.value?.dispose()
  activeTokenEditorSession.value = createTokenEditorSession(
    {
      value: localValue.value,
      appLanguage: designStore.appLanguage,
      allowedVariables: props.allowedVariables
    },
    (value) => {
      localValue.value = value
      onInput()
    }
  )
  openRouteInNewTab(router, {
    name: 'Tokens',
    query: { tab: 'editor', session: activeTokenEditorSession.value.id }
  })
}

onBeforeUnmount(() => activeTokenEditorSession.value?.dispose())
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
</style>
