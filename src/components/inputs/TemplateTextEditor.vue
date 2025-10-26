<template>
  <div class="template-editor" :class="{ 'has-sidebar': showSidebar }">
    <div class="editor">
      <MdEditor
        ref="editorRef"
        v-model="localValue"
        :placeholder="placeholder"
        :toolbars-exclude="excludedToolbars"
        :markdown-it-config="configMarkdownIt"
        :code-mirror-extensions="codeMirrorExtensions"
        :preview="false"
        style="height: 400px"
      />
      <div class="used-vars" v-if="usedVariables.length > 0">
        <div class="section-title">Used Variables</div>
        <div class="chips">
          <span v-for="v in usedVariables" :key="v" class="chip">{{ v }}</span>
        </div>
      </div>
    </div>
    <div class="sidebar" v-if="showSidebar">
      <div class="section-title">Variables</div>
      <el-input v-model="search" placeholder="Search variable" class="mb-2" />
      <div class="var-list">
        <div v-for="v in filteredVariables" :key="v.id" class="var-item">
          <div class="var-key">{{ v.variableKey }}</div>
          <div class="var-actions">
            <el-button size="small" @click="insertVariable(v.variableKey)">Insert</el-button>
          </div>
        </div>
      </div>
      <div class="section-title mt-3">Preview Context</div>
      <el-button size="small" @click="loadPreview" :loading="loadingPreview">Load Preview</el-button>
      <div class="preview" v-if="preview && Object.keys(preview).length">
        <div v-for="(val, key) in preview" :key="String(key)" class="preview-row">
          <span class="k">{{ key }}</span>
          <span class="v">{{ formatValue(val) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { templateVariablesApi } from '@/api/wristo/templateVariables'
import type { TemplateVariableVO } from '@/types/api/template-variable'
// minimal markdown-it types to avoid any
type MarkdownItToken = { type: string; attrGet: (name: string) => string | null; attrSet: (name: string, value: string) => void; content?: string }
type MarkdownItRenderer = { rules: Record<string, ((tokens: MarkdownItToken[], idx: number, options: unknown, env: unknown, self: { renderToken: (tokens: MarkdownItToken[], idx: number, options: unknown) => string }) => string) | undefined> }
type MarkdownItLike = { renderer: MarkdownItRenderer; linkify?: boolean }
// minimal MdEditor expose type (v5 signature)
type MdEditorInsertParam = { targetValue: string; select?: boolean }
type MdEditorExpose = { insert: (generate: () => MdEditorInsertParam) => void }

interface Props {
  modelValue: string | null
  placeholder?: string
  prefix?: string
  suffix?: string
  dataType?: string
  userId?: number
  productId?: number
  showSidebar?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Enter template... You can insert variables from the right panel.',
  prefix: '[[${',
  suffix: '}]]',
  showSidebar: true,
})

const emit = defineEmits<{ (e: 'update:modelValue', v: string | null): void }>()

const localValue = ref<string>(props.modelValue ?? '')
const editorRef = ref<MdEditorExpose | null>(null)
watch(() => props.modelValue, (v) => { localValue.value = v ?? '' })
watch(localValue, (v) => {
  const out: string | null = v === '' ? null : v
  if (out !== props.modelValue) emit('update:modelValue', out)
})

const excludedToolbars = ['github', 'catalog'] as Array<string>

// CodeMirror extensions: remove built-in 'linkShortener' to prevent URL collapsing
const codeMirrorExtensions = (exts: unknown[]): unknown[] => {
  const list = Array.isArray(exts) ? exts : []
  return list.filter((e: unknown) => {
    const t = (e as { type?: string } | null)?.type
    return t !== 'linkShortener'
  })
}

// (no extra editor config)

// Custom markdown-it config: render link text as its full href and add target/rel
const configMarkdownIt = (md: MarkdownItLike): void => {
  // Enable auto-detect bare URLs
  md.linkify = true
  
  const defaultOpen = md.renderer.rules.link_open || ((tokens, idx, _options, _env, self) => self.renderToken(tokens, idx, _options))
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet('href') || ''
    // ensure open in new tab and secure
    tokens[idx].attrSet('target', '_blank')
    tokens[idx].attrSet('rel', 'noopener')
    // replace following text token content with href so it shows full URL
    const next = tokens[idx + 1]
    if (next && next.type === 'text') {
      next.content = href
    }
    return defaultOpen(tokens, idx, options, env, self)
  }
}

const variables = ref<TemplateVariableVO[]>([])
const loadingVars = ref(false)
const search = ref('')

const loadVariables = async () => {
  loadingVars.value = true
  try {
    const res = await templateVariablesApi.list({ dataType: props.dataType, isActive: 1, orderBy: 'sortOrder:asc' })
    variables.value = res.data ?? []
  } finally {
    loadingVars.value = false
  }
}

const filteredVariables = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return variables.value
  return variables.value.filter(v => (v.variableKey || '').toLowerCase().includes(q) || (v.label || '').toLowerCase().includes(q))
})

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const usedVariables = computed<string[]>(() => {
  const pre = escapeRegex(props.prefix)
  const suf = escapeRegex(props.suffix)
  const re = new RegExp(`${pre}\s*([a-zA-Z0-9_.-]+)\s*${suf}`, 'g')
  const found = new Set<string>()
  for (const match of localValue.value.matchAll(re)) {
    const key = match[1]
    if (key) found.add(key)
  }
  return Array.from(found)
})

const insertVariable = (key: string) => {
  const token = `${props.prefix}${key}${props.suffix}`

  const tryEditorInsert = (): boolean => {
    const ed = editorRef.value
    if (!ed) return false
    try {
      ed.insert(() => ({ targetValue: token, select: false }))
      return true
    } catch {
      return false
    }
  }

  const tryDomTextareaInsert = (): boolean => {
    // attempt to find underlying textarea and insert at caret
    const root = (editorRef.value as unknown as { $el?: Element } | null)?.$el
    const ta = root?.querySelector('.md-editor-textarea textarea') as HTMLTextAreaElement | null | undefined
    if (!ta) return false
    const start = ta.selectionStart ?? 0
    const end = ta.selectionEnd ?? 0
    const v = localValue.value || ''
    localValue.value = v.slice(0, start) + token + v.slice(end)
    // restore caret
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + token.length
      ta.setSelectionRange(pos, pos)
    })
    const out: string | null = localValue.value === '' ? null : localValue.value
    emit('update:modelValue', out)
    return true
  }

  if (tryEditorInsert()) return
  if (tryDomTextareaInsert()) return

  // final fallback: append to end
  const value = localValue.value || ''
  localValue.value = value + token
  const out: string | null = localValue.value === '' ? null : localValue.value
  emit('update:modelValue', out)
}

const preview = ref<Record<string, unknown>>({})
const loadingPreview = ref(false)
const loadPreview = async () => {
  if (!props.userId) return
  loadingPreview.value = true
  try {
    const res = await templateVariablesApi.previewContext({ userId: props.userId, productId: props.productId })
    preview.value = res.data ?? {}
  } finally {
    loadingPreview.value = false
  }
}

const formatValue = (v: unknown): string => {
  try { return typeof v === 'object' ? JSON.stringify(v) : String(v) } catch { return String(v) }
}

onMounted(() => {
  loadVariables()
})
</script>

<style scoped>
.template-editor { display: grid; grid-template-columns: 1fr; gap: 16px; }
.template-editor.has-sidebar { grid-template-columns: 4fr 1fr; }
.editor { display: flex; flex-direction: column; gap: 8px; }
.sidebar { border-left: 1px solid #eee; padding-left: 12px; min-width: 0; }
.section-title { font-weight: 600; color: #333; margin: 4px 0 8px; }
.var-list { max-height: 240px; overflow: auto; display: flex; flex-direction: column; gap: 6px; }
.var-item { display: flex; align-items: center; gap: 8px; justify-content: space-between; }
.var-key { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.used-vars .chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { background: #f5f5f5; border-radius: 10px; padding: 2px 8px; font-size: 12px; }
.preview { margin-top: 8px; max-height: 160px; overflow: auto; }
.preview-row { display: flex; gap: 6px; font-size: 12px; line-height: 1.6; }
.preview-row .k { color: #555; min-width: 120px; }
.preview-row .v { color: #111; flex: 1; word-break: break-all; }
.mb-2 { margin-bottom: 8px; }
.mt-3 { margin-top: 12px; }

</style>
