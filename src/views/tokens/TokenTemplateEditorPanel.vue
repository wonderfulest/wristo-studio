<template>
  <section class="token-editor-card">
    <header class="token-editor-heading">
      <div>
        <p class="eyebrow">{{ t('tokens.editor.eyebrow') }}</p>
        <h2>{{ t('tokens.editor.title') }}</h2>
        <p>{{ t('tokens.editor.description') }}</p>
      </div>
    </header>

    <label class="token-editor-input-label" for="token-template-source">{{ t('tokens.editor.inputLabel') }}</label>
    <div class="token-editor-input-wrap">
      <textarea id="token-template-source" ref="textareaRef" :value="localValue" maxlength="128" rows="5" spellcheck="false" @input="handleInput" @click="syncFormatTarget" @keyup="syncFormatTarget" @select="syncFormatTarget" />
      <span>{{ localValue.length }} / 128</span>
    </div>
    <p v-if="validationError" class="token-editor-error">{{ validationError }}</p>
    <div class="token-editor-result">
      <span>{{ t('tokens.editor.result') }}</span>
      <code class="token-editor-result-value">{{ resultValue }}</code>
    </div>

    <section ref="formatHelpRef" class="token-format-help">
      <header>
        <strong>{{ t('tokens.guide.category.format.title') }}</strong>
        <span>{{ t('tokens.editor.formatHelp') }}</span>
      </header>
      <div class="token-format-list">
        <button
          v-for="item in TOKEN_FORMATTING_GUIDE"
          :key="item.pattern"
          type="button"
          class="token-format-option"
          :class="{ 'is-active': editorOpen && selectedPreset === item.defaultFormat }"
          :data-format-preset="item.defaultFormat"
          :disabled="Boolean(currentTarget && !targetIsNumeric && item.defaultFormat !== '%s')"
          @click="openFormatEditor(item.defaultFormat)">
          <code class="token-format-pattern">{{ item.pattern }}</code>
          <span>{{ t(item.descriptionKey) }}</span>
        </button>
      </div>
      <div v-if="editorOpen" class="token-format-editor" role="dialog" :aria-label="t('tokens.editor.formatEditorTitle')" @keydown.esc="closeFormatEditor">
        <p v-if="!currentTarget" class="token-format-editor-empty">{{ t('tokens.editor.formatTargetMissing') }}</p>
        <template v-else>
          <div class="token-format-editor-topline">
            <strong>{{ t('tokens.editor.formatEditorTitle') }}</strong>
            <span class="token-format-editor-target">{{ t('tokens.editor.formatTarget') }} <code>({{ currentTarget.code }})</code></span>
          </div>
          <div class="token-format-editor-fields">
            <label>
              <span>{{ t('tokens.editor.formatType') }}</span>
              <select v-model="formatDraft.mode" data-format-field="mode">
                <option value="string">{{ t('tokens.editor.formatTypeString') }}</option>
                <option value="integer" :disabled="!targetIsNumeric">{{ t('tokens.editor.formatTypeInteger') }}</option>
                <option value="float" :disabled="!targetIsNumeric">{{ t('tokens.editor.formatTypeFloat') }}</option>
              </select>
            </label>
            <label>
              <span>{{ t('tokens.editor.formatWidth') }}</span>
              <input data-format-field="width" type="number" min="1" max="12" :disabled="formatDraft.mode === 'string'" :value="formatDraft.width ?? ''" :placeholder="t('tokens.editor.formatAuto')" @input="setDraftNumber('width', $event)" />
            </label>
            <label>
              <span>{{ t('tokens.editor.formatPrecision') }}</span>
              <input data-format-field="precision" type="number" min="0" max="6" :disabled="formatDraft.mode !== 'float'" :value="formatDraft.precision ?? ''" :placeholder="t('tokens.editor.formatAuto')" @input="setDraftNumber('precision', $event)" />
            </label>
            <label class="token-format-editor-check">
              <input v-model="formatDraft.zeroPad" data-format-field="zeroPad" type="checkbox" :disabled="formatDraft.mode === 'string' || !formatDraft.width" />
              <span>{{ t('tokens.editor.formatZeroPad') }}</span>
            </label>
            <label class="token-format-editor-check">
              <input v-model="formatDraft.grouped" data-format-field="grouped" type="checkbox" :disabled="formatDraft.mode === 'string'" />
              <span>{{ t('tokens.editor.formatGrouped') }}</span>
            </label>
          </div>
          <p v-if="!targetIsNumeric" class="token-format-editor-note">{{ t('tokens.editor.formatTextOnly') }}</p>
          <div class="token-format-editor-result">
            <span>{{ t('tokens.editor.formatExpression') }}</span>
            <code class="token-format-editor-code">{{ formatExpression }}</code>
            <span>{{ t('tokens.editor.formatPreview') }}</span>
            <code class="token-format-editor-preview">{{ formatPreview }}</code>
          </div>
          <div class="token-format-editor-actions">
            <button type="button" class="token-format-editor-cancel" @click="closeFormatEditor">{{ t('common.cancel') }}</button>
            <button type="button" class="token-format-editor-apply" @click="applyTokenFormat">{{ t('tokens.editor.formatApply') }}</button>
          </div>
        </template>
      </div>
      <p class="token-format-legend">{{ t('tokens.guide.format.legend') }}</p>
    </section>

    <div class="token-editor-token-heading">
      <strong>{{ t('templateEditor.variables') }}</strong>
      <span>{{ t('templateEditor.tokenDialogHint') }}</span>
    </div>
    <input
      v-model="searchQuery"
      class="token-editor-search"
      type="search"
      :aria-label="t('tokens.searchPlaceholder')"
      :placeholder="t('tokens.searchPlaceholder')"
      autocomplete="off"
      spellcheck="false" />
    <div class="token-editor-groups">
      <section v-for="group in filteredVariableGroups" :key="group.category" class="token-editor-group">
        <h3>{{ t(`tokens.category.${group.category}`) }}</h3>
        <div class="token-editor-chips">
          <button v-for="token in group.tokens" :key="token.code" type="button" class="token-editor-chip" :data-token-code="token.code" @click="insertToken(token.code)">
            <span>{{ tokenLabel(token) }}</span>
            <code>({{ token.code }})</code>
          </button>
        </div>
      </section>
      <p v-if="!filteredVariableGroups.length" class="token-editor-empty">{{ t('tokens.editor.searchEmpty') }}</p>
    </div>

    <footer class="token-editor-footer">
      <span>{{ t('tokens.editor.applyHint') }}</span>
      <button type="button" class="token-editor-action" :disabled="Boolean(validationError)" @click="$emit('apply', localValue)">{{ actionLabel }}</button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { AppLanguage } from '@/types/localization'
import type { ExpressionTokenDefinition } from '@/engine/expression/types'
import { filterExpressionTokens } from '@/components/expression/tokenPickerModel'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import { resolveTokenTemplate, validateTokenTemplate } from '@/engine/expression/textTemplateTokens'
import { useI18n } from '@/i18n'
import { TOKEN_FORMATTING_GUIDE } from './tokenFormattingGuide'
import {
  buildTokenFormat,
  findTokenFormatTarget,
  parseTokenFormat,
  replaceTokenFormat,
  type TokenFormatDraft,
  type TokenFormatTarget,
} from './tokenFormattingEditor'

const props = withDefaults(
  defineProps<{
    modelValue: string
    appLanguage?: AppLanguage
    allowedVariables?: string[]
    actionLabel: string
  }>(),
  {
    appLanguage: 'eng',
    allowedVariables: () => []
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'apply', value: string): void
}>()

const { t } = useI18n()
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const formatHelpRef = ref<HTMLElement | null>(null)
const localValue = ref(props.modelValue)
const searchQuery = ref('')
const editorOpen = ref(false)
const selectedPreset = ref('')
const currentTarget = ref<TokenFormatTarget | null>(null)
const formatDraft = ref<TokenFormatDraft>(parseTokenFormat('%d'))
const validationError = computed(() => validateTokenTemplate(localValue.value)[0] || '')
const resultValue = computed(() => resolveTokenTemplate(
  localValue.value,
  undefined,
  (code) => DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode(code)?.exampleValue,
))
const filteredVariableGroups = computed(() => {
  const groups = new Map<string, ExpressionTokenDefinition[]>()
  for (const definition of filterExpressionTokens(searchQuery.value, props.appLanguage)) {
    if (props.allowedVariables.length && !props.allowedVariables.includes(definition.code)) continue
    const tokens = groups.get(definition.category) || []
    tokens.push(definition)
    groups.set(definition.category, tokens)
  }
  return [...groups.entries()].map(([category, tokens]) => ({ category, tokens }))
})
const targetDefinition = computed(() => currentTarget.value ? DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode(currentTarget.value.code) : undefined)
const targetIsNumeric = computed(() => targetDefinition.value?.valueType === 'number')
const generatedFormat = computed(() => buildTokenFormat(formatDraft.value))
const formatExpression = computed(() => currentTarget.value ? `(${currentTarget.value.code}).format("${generatedFormat.value}")` : '')
const formatPreview = computed(() => currentTarget.value
  ? resolveTokenTemplate(formatExpression.value, undefined, (code) => DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode(code)?.exampleValue)
  : '')

watch(
  () => props.modelValue,
  (value) => {
    if (value !== localValue.value) localValue.value = value
  }
)

const updateValue = (value: string) => {
  localValue.value = value
  emit('update:modelValue', value)
}

const handleInput = (event: Event) => {
  updateValue((event.target as HTMLTextAreaElement).value)
  syncFormatTarget()
}
const tokenLabel = (token: ExpressionTokenDefinition) => (props.appLanguage === 'zhs' ? token.labelCn : token.label)

const syncFormatTarget = () => {
  const caret = textareaRef.value?.selectionStart ?? 0
  currentTarget.value = findTokenFormatTarget(localValue.value, caret)
}

const openFormatEditor = (preset: string) => {
  syncFormatTarget()
  selectedPreset.value = preset
  editorOpen.value = true
  if (!currentTarget.value) return
  const numeric = DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode(currentTarget.value.code)?.valueType === 'number'
  formatDraft.value = parseTokenFormat(numeric ? preset : '%s')
}

const closeFormatEditor = () => {
  editorOpen.value = false
  selectedPreset.value = ''
}

const setDraftNumber = (field: 'width' | 'precision', event: Event) => {
  const rawValue = (event.target as HTMLInputElement).value
  formatDraft.value[field] = rawValue === '' ? null : Number(rawValue)
}

const applyTokenFormat = () => {
  if (!currentTarget.value) return
  const result = replaceTokenFormat(localValue.value, currentTarget.value, generatedFormat.value)
  updateValue(result.value)
  currentTarget.value = findTokenFormatTarget(result.value, result.caret)
  closeFormatEditor()
  requestAnimationFrame(() => {
    textareaRef.value?.setSelectionRange(result.caret, result.caret)
    textareaRef.value?.focus()
  })
}

const handleOutsidePointer = (event: PointerEvent) => {
  if (editorOpen.value && !formatHelpRef.value?.contains(event.target as Node)) closeFormatEditor()
}

onMounted(() => document.addEventListener('pointerdown', handleOutsidePointer))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleOutsidePointer))

const insertToken = (code: string) => {
  const textarea = textareaRef.value
  const token = `(${code})`
  const start = textarea?.selectionStart ?? localValue.value.length
  const end = textarea?.selectionEnd ?? start
  const insertion = start === end && start === localValue.value.length && localValue.value.trim()
    ? ` + " " + ${token}`
    : token
  updateValue(`${localValue.value.slice(0, start)}${insertion}${localValue.value.slice(end)}`)
  const position = start + insertion.length
  currentTarget.value = findTokenFormatTarget(localValue.value, position)
  requestAnimationFrame(() => {
    textarea?.setSelectionRange(position, position)
    textarea?.focus()
  })
}
</script>

<style scoped>
.token-editor-card {
  padding: 24px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-lg);
  background: var(--studio-surface);
  box-shadow: var(--studio-shadow-sm);
}
.token-editor-heading h2,
.token-editor-heading p,
.token-editor-group h3 {
  margin: 0;
}
.token-editor-heading h2 {
  color: var(--studio-text);
  font-size: 24px;
}
.token-editor-heading p:last-child {
  max-width: 760px;
  margin-top: 8px;
  color: var(--studio-text-muted);
  line-height: 1.6;
}
.eyebrow {
  margin: 0 0 7px !important;
  color: var(--studio-primary);
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.token-editor-input-label {
  display: block;
  margin: 22px 0 8px;
  color: var(--studio-text);
  font-size: 13px;
  font-weight: 700;
}
.token-editor-input-wrap {
  position: relative;
}
.token-editor-input-wrap textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 120px;
  resize: vertical;
  padding: 14px 14px 28px;
  border: 1px solid var(--studio-border-strong);
  border-radius: var(--studio-radius-md);
  outline: 0;
  color: var(--studio-text);
  background: var(--studio-bg);
  font-family: var(--studio-font-mono);
  font-size: 14px;
  line-height: 1.65;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}
.token-editor-input-wrap textarea:focus {
  border-color: var(--studio-primary);
  box-shadow: 0 0 0 3px var(--studio-focus-ring);
}
.token-editor-input-wrap > span {
  position: absolute;
  right: 12px;
  bottom: 8px;
  color: var(--studio-text-subtle);
  font-size: 11px;
}
.token-editor-error {
  margin: 7px 0 0;
  color: var(--el-color-danger);
  font-size: 12px;
}
.token-editor-result {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: baseline;
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-bg);
  color: var(--studio-text-muted);
  font-size: 12px;
}
.token-editor-result code {
  overflow-wrap: anywhere;
  color: var(--studio-text);
  font-family: var(--studio-font-mono);
  font-size: 14px;
}
.token-format-help {
  margin-top: 12px;
  padding: 14px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
}
.token-format-help header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: var(--studio-text-muted);
  font-size: 12px;
}
.token-format-help header strong {
  color: var(--studio-text);
  font-size: 13px;
}
.token-format-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
  margin-top: 11px;
}
.token-format-option {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 8px 9px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-sm);
  color: inherit;
  background: var(--studio-surface);
  font: inherit;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}
.token-format-option:hover:not(:disabled),
.token-format-option.is-active {
  border-color: var(--studio-primary-border);
  background: var(--studio-primary-soft);
}
.token-format-option:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--studio-focus-ring);
}
.token-format-option:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.token-format-list code {
  color: var(--studio-primary);
  font-family: var(--studio-font-mono);
  font-size: 11px;
  font-weight: 700;
  overflow-wrap: anywhere;
}
.token-format-list span,
.token-format-legend {
  color: var(--studio-text-muted);
  font-size: 11px;
  line-height: 1.45;
}
.token-format-legend {
  margin: 10px 0 0;
}
.token-format-editor {
  margin-top: 10px;
  padding: 12px;
  border: 1px solid var(--studio-primary-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface);
  box-shadow: var(--studio-shadow-sm);
}
.token-format-editor-empty {
  margin: 0;
  color: var(--studio-text-muted);
  font-size: 12px;
  line-height: 1.5;
}
.token-format-editor-topline,
.token-format-editor-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.token-format-editor-topline {
  color: var(--studio-text);
  font-size: 12px;
}
.token-format-editor-target {
  color: var(--studio-text-muted);
}
.token-format-editor-target code {
  color: var(--studio-primary);
  font-family: var(--studio-font-mono);
}
.token-format-editor-fields {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 0.8fr auto auto;
  gap: 9px;
  align-items: end;
  margin-top: 11px;
}
.token-format-editor-fields label:not(.token-format-editor-check) {
  display: grid;
  gap: 5px;
  color: var(--studio-text-muted);
  font-size: 11px;
}
.token-format-editor-fields select,
.token-format-editor-fields input[type='number'] {
  box-sizing: border-box;
  width: 100%;
  min-height: 34px;
  padding: 6px 8px;
  border: 1px solid var(--studio-border-strong);
  border-radius: var(--studio-radius-sm);
  color: var(--studio-text);
  background: var(--studio-bg);
  font: inherit;
  font-size: 12px;
}
.token-format-editor-check {
  display: flex;
  min-height: 34px;
  align-items: center;
  gap: 6px;
  color: var(--studio-text-muted);
  font-size: 11px;
  white-space: nowrap;
}
.token-format-editor-note {
  margin: 8px 0 0;
  color: var(--studio-text-muted);
  font-size: 11px;
}
.token-format-editor-result {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto minmax(72px, auto);
  gap: 8px;
  align-items: center;
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: var(--studio-radius-sm);
  background: var(--studio-bg);
  color: var(--studio-text-muted);
  font-size: 11px;
}
.token-format-editor-result code {
  overflow-wrap: anywhere;
  color: var(--studio-text);
  font-family: var(--studio-font-mono);
  font-size: 12px;
}
.token-format-editor-actions {
  justify-content: flex-end;
  margin-top: 10px;
}
.token-format-editor-actions button {
  min-height: 32px;
  padding: 6px 13px;
  border: 1px solid var(--studio-border-strong);
  border-radius: var(--studio-radius-sm);
  background: var(--studio-surface);
  color: var(--studio-text);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.token-format-editor-actions .token-format-editor-apply {
  border-color: var(--studio-primary);
  color: #fff;
  background: var(--studio-primary);
}
.token-editor-token-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin: 22px 0 10px;
  color: var(--studio-text-muted);
  font-size: 12px;
}
.token-editor-token-heading strong {
  color: var(--studio-text);
}
.token-editor-search {
  box-sizing: border-box;
  width: min(100%, 420px);
  min-height: 40px;
  margin-bottom: 10px;
  padding: 9px 12px;
  border: 1px solid var(--studio-border-strong);
  border-radius: var(--studio-radius-md);
  outline: 0;
  color: var(--studio-text);
  background: var(--studio-surface);
  font: inherit;
  font-size: 13px;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}
.token-editor-search:focus {
  border-color: var(--studio-primary);
  box-shadow: 0 0 0 3px var(--studio-focus-ring);
}
.token-editor-search::placeholder {
  color: var(--studio-text-subtle);
}
.token-editor-groups {
  display: grid;
  gap: 16px;
  max-height: min(520px, 58vh);
  overflow: auto;
  padding: 16px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
}
.token-editor-empty {
  margin: 0;
  padding: 28px 16px;
  color: var(--studio-text-muted);
  font-size: 13px;
  text-align: center;
}
.token-editor-group h3 {
  margin-bottom: 8px;
  color: var(--studio-text-muted);
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.token-editor-chips {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 7px;
}
.token-editor-chip {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 9px 10px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-sm);
  color: var(--studio-text);
  background: var(--studio-surface);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}
.token-editor-chip:hover {
  border-color: var(--studio-primary-border);
  background: var(--studio-primary-soft);
}
.token-editor-chip:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--studio-focus-ring);
}
.token-editor-chip span,
.token-editor-chip code {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.token-editor-chip span {
  color: var(--studio-primary);
  font-size: 12px;
  font-weight: 700;
}
.token-editor-chip code {
  color: var(--studio-text-muted);
  font-family: var(--studio-font-mono);
  font-size: 11px;
}
.token-editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
}
.token-editor-footer > span {
  color: var(--studio-text-muted);
  font-size: 12px;
}
.token-editor-action {
  min-height: 38px;
  padding: 8px 18px;
  border: 1px solid var(--studio-primary);
  border-radius: var(--studio-radius-sm);
  color: #fff;
  background: var(--studio-primary);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.token-editor-action:hover:not(:disabled) {
  filter: brightness(0.94);
}
.token-editor-action:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--studio-focus-ring);
}
.token-editor-action:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
@media (max-width: 640px) {
  .token-editor-card {
    padding: 18px;
  }
  .token-editor-token-heading,
  .token-editor-footer {
    align-items: stretch;
    flex-direction: column;
  }
  .token-editor-chips {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .token-format-list {
    grid-template-columns: 1fr;
  }
  .token-format-editor-topline {
    align-items: flex-start;
    flex-direction: column;
  }
  .token-format-editor-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .token-format-editor-result {
    grid-template-columns: 1fr;
  }
}
</style>
