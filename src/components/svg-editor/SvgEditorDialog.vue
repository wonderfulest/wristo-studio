<template>
  <el-dialog
    v-model="visibleInner"
    :title="title"
    width="min(860px, calc(100vw - 32px))"
    append-to-body
    :z-index="zIndex"
    :close-on-click-modal="false"
    class="svg-editor-dialog"
    @closed="handleClosed"
  >
    <div class="svg-editor">
      <div class="svg-editor-side">
        <div class="svg-editor-preview" v-html="previewSvgText"></div>
        <div v-if="hasEditableEntries" class="svg-editor-fields">
          <div v-if="colorEntries.length" class="svg-editor-section">
            <div class="svg-editor-section-title">{{ t('asset.svgColors') }}</div>
            <div
              v-for="entry in colorEntries"
              :key="entry.id"
              class="svg-color-row"
            >
              <div class="svg-color-meta">
                <span class="svg-color-prop">{{ entry.property }}</span>
                <span class="svg-color-value">{{ entry.originalValue }}</span>
              </div>
              <ColorPicker
                v-model="entry.nextColor"
                class="svg-color-picker"
                :popup-z-index="zIndex + 10"
              />
            </div>
          </div>

          <div v-if="stopEntries.length" class="svg-editor-section">
            <div class="svg-editor-section-title">{{ t('asset.svgGradientStops') }}</div>
            <div
              v-for="entry in stopEntries"
              :key="entry.id"
              class="svg-stop-row"
            >
              <div class="svg-stop-name">Stop {{ entry.index + 1 }}</div>
              <label class="svg-stop-field">
                <span>{{ t('asset.svgStopOffset') }}</span>
                <el-input v-model="entry.nextOffset" size="small" placeholder="0%" />
              </label>
              <label class="svg-stop-field">
                <span>{{ t('asset.svgStopOpacity') }}</span>
                <el-input v-model="entry.nextOpacity" size="small" placeholder="1" />
              </label>
            </div>
          </div>
        </div>
        <div v-else class="svg-editor-empty">
          {{ emptyColorMessage }}
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="visibleInner = false">{{ t('common.cancel') }}</el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="!svgText"
        @click="handleSave"
      >
        {{ saveLabel }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ColorPicker from '@/components/color-picker/index.vue'
import { useI18n } from '@/i18n'

type SvgColorProperty = 'fill' | 'stroke' | 'stop-color'

interface SvgColorEntry {
  id: string
  property: SvgColorProperty
  originalValue: string
  nextColor: string
}

interface SvgStopEntry {
  id: string
  index: number
  nextOffset: string
  nextOpacity: string
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  initialSvg: string
  title?: string
  placeholder?: string
  saveLabel?: string
  saving?: boolean
  emptyColorMessage?: string
  zIndex?: number
}>(), {
  title: '',
  placeholder: '',
  saveLabel: '',
  saving: false,
  emptyColorMessage: '',
  zIndex: 15000,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', svgText: string): void
  (e: 'closed'): void
}>()

const { t } = useI18n()

const visibleInner = ref(false)
const svgText = ref('')
const colorEntries = ref<SvgColorEntry[]>([])
const stopEntries = ref<SvgStopEntry[]>([])
const svgColorProperties: SvgColorProperty[] = ['fill', 'stroke', 'stop-color']

const hasEditableEntries = computed(() => colorEntries.value.length > 0 || stopEntries.value.length > 0)
const title = computed(() => props.title || t('icon.svgEditorTitle'))
const saveLabel = computed(() => props.saveLabel || t('common.save'))
const emptyColorMessage = computed(() => props.emptyColorMessage || t('asset.noEditableSvgColors'))
const zIndex = computed(() => props.zIndex)
const previewSvgText = computed(() => {
  if (!svgText.value) return ''
  try {
    return buildEditedSvgText()
  } catch {
    return svgText.value
  }
})

watch(() => props.modelValue, (value) => {
  visibleInner.value = value
  if (value) setSvgText(props.initialSvg)
})

watch(visibleInner, (value) => {
  emit('update:modelValue', value)
})

watch(() => props.initialSvg, (value) => {
  if (visibleInner.value) setSvgText(value)
})

const setSvgText = (value: string) => {
  svgText.value = value || ''
  refreshEditableEntries()
}

const refreshEditableEntries = () => {
  if (!svgText.value.trim()) {
    colorEntries.value = []
    stopEntries.value = []
    return
  }

  try {
    colorEntries.value = parseSvgColorEntries(svgText.value)
    stopEntries.value = parseSvgStopEntries(svgText.value)
  } catch {
    colorEntries.value = []
    stopEntries.value = []
  }
}

const handleClosed = () => {
  svgText.value = ''
  colorEntries.value = []
  stopEntries.value = []
  emit('closed')
}

const handleSave = () => {
  try {
    emit('save', buildEditedSvgText())
  } catch {
    ElMessage.error(t('icon.invalidSvg'))
  }
}

const isEditableColorValue = (value: string | null): value is string => {
  const raw = String(value || '').trim()
  if (!raw) return false
  const lower = raw.toLowerCase()
  if (['none', 'transparent', 'currentcolor', 'inherit', 'initial', 'unset'].includes(lower)) return false
  if (lower.startsWith('url(') || lower.startsWith('var(')) return false
  return Boolean(toHexColor(raw))
}

const toHexColor = (value: string): string => {
  const raw = value.trim()
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase()
  const shortHex = raw.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i)
  if (shortHex) {
    return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`.toLowerCase()
  }
  const rgb = raw.match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i)
  if (rgb) {
    const parts = rgb.slice(1, 4).map((part) => Math.max(0, Math.min(255, Number(part))))
    return `#${parts.map((part) => part.toString(16).padStart(2, '0')).join('')}`
  }

  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = '#000000'
  ctx.fillStyle = raw
  return /^#[0-9a-f]{6}$/i.test(ctx.fillStyle) ? ctx.fillStyle.toLowerCase() : ''
}

const collectStyleColorEntries = (styleValue: string, entries: Map<string, SvgColorEntry>) => {
  const declarations = styleValue.split(';')
  for (const declaration of declarations) {
    const [rawName, ...rawValueParts] = declaration.split(':')
    const property = rawName?.trim() as SvgColorProperty
    if (!svgColorProperties.includes(property)) continue
    const value = rawValueParts.join(':').trim()
    if (!isEditableColorValue(value)) continue
    const key = `${property}:${value}`
    if (!entries.has(key)) {
      entries.set(key, {
        id: key,
        property,
        originalValue: value,
        nextColor: toHexColor(value),
      })
    }
  }
}

const collectCssColorEntries = (cssText: string, entries: Map<string, SvgColorEntry>) => {
  const declarationPattern = /\b(fill|stroke|stop-color)\s*:\s*([^;}{]+)/gi
  let match: RegExpExecArray | null
  while ((match = declarationPattern.exec(cssText)) !== null) {
    const property = match[1] as SvgColorProperty
    const value = match[2].trim()
    if (!isEditableColorValue(value)) continue
    const key = `${property}:${value}`
    if (!entries.has(key)) {
      entries.set(key, {
        id: key,
        property,
        originalValue: value,
        nextColor: toHexColor(value),
      })
    }
  }
}

const parseSvgColorEntries = (value: string): SvgColorEntry[] => {
  const doc = new DOMParser().parseFromString(value, 'image/svg+xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid SVG')
  }

  const entries = new Map<string, SvgColorEntry>()
  doc.querySelectorAll('*').forEach((node) => {
    for (const property of svgColorProperties) {
      const attrValue = node.getAttribute(property)
      if (!isEditableColorValue(attrValue)) continue
      const key = `${property}:${attrValue}`
      if (!entries.has(key)) {
        entries.set(key, {
          id: key,
          property,
          originalValue: attrValue,
          nextColor: toHexColor(attrValue),
        })
      }
    }

    const styleValue = node.getAttribute('style')
    if (styleValue) collectStyleColorEntries(styleValue, entries)
  })
  doc.querySelectorAll('style').forEach((node) => {
    collectCssColorEntries(node.textContent || '', entries)
  })

  return Array.from(entries.values())
}

const parseSvgStopEntries = (value: string): SvgStopEntry[] => {
  const doc = new DOMParser().parseFromString(value, 'image/svg+xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid SVG')
  }

  return Array.from(doc.querySelectorAll('stop')).map((node, index) => ({
    id: `stop:${index}`,
    index,
    nextOffset: node.getAttribute('offset') || '',
    nextOpacity: node.getAttribute('stop-opacity') || '',
  }))
}

const updateStyleDeclaration = (styleValue: string, updates: SvgColorEntry[]): string => {
  return styleValue
    .split(';')
    .map((declaration) => {
      const [rawName, ...rawValueParts] = declaration.split(':')
      const property = rawName?.trim() as SvgColorProperty
      if (!svgColorProperties.includes(property)) return declaration
      const value = rawValueParts.join(':').trim()
      const update = updates.find((entry) => entry.property === property && entry.originalValue === value)
      if (!update) return declaration
      return `${rawName.trim()}: ${update.nextColor}`
    })
    .join(';')
}

const updateCssColorDeclarations = (cssText: string, updates: SvgColorEntry[]): string => {
  return cssText.replace(/\b(fill|stroke|stop-color)\s*:\s*([^;}{]+)/gi, (match, rawProperty, rawValue) => {
    const property = rawProperty as SvgColorProperty
    const value = String(rawValue || '').trim()
    const update = updates.find((entry) => entry.property === property && entry.originalValue === value)
    if (!update) return match
    return `${rawProperty}: ${update.nextColor}`
  })
}

const buildEditedSvgText = (): string => {
  const doc = new DOMParser().parseFromString(svgText.value, 'image/svg+xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid SVG')
  }

  doc.querySelectorAll('*').forEach((node) => {
    for (const entry of colorEntries.value) {
      if (node.getAttribute(entry.property) === entry.originalValue) {
        node.setAttribute(entry.property, entry.nextColor)
      }
    }

    const styleValue = node.getAttribute('style')
    if (styleValue) {
      node.setAttribute('style', updateStyleDeclaration(styleValue, colorEntries.value))
    }
  })
  doc.querySelectorAll('style').forEach((node) => {
    node.textContent = updateCssColorDeclarations(node.textContent || '', colorEntries.value)
  })

  doc.querySelectorAll('stop').forEach((node, index) => {
    const entry = stopEntries.value[index]
    if (!entry) return

    const offset = entry.nextOffset.trim()
    if (offset) node.setAttribute('offset', offset)
    else node.removeAttribute('offset')

    const opacity = entry.nextOpacity.trim()
    if (opacity) node.setAttribute('stop-opacity', opacity)
    else node.removeAttribute('stop-opacity')
  })

  return new XMLSerializer().serializeToString(doc)
}
</script>

<style scoped>
.svg-editor {
  min-width: 0;
}

.svg-editor-side {
  min-width: 0;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
  padding: 12px;
  overflow: auto;
  max-height: 560px;
}

.svg-editor-preview {
  min-height: 220px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-sm);
  background: var(--studio-canvas-shell);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.svg-editor-preview :deep(svg) {
  max-width: 100%;
  max-height: 240px;
}

.svg-editor-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.svg-editor-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.svg-editor-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--studio-text-muted);
}

.svg-color-row {
  display: grid;
  grid-template-columns: minmax(140px, 180px) minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-sm);
  background: var(--studio-surface);
}

.svg-color-meta {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.svg-color-prop {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 600;
  color: var(--studio-text);
  white-space: nowrap;
}

.svg-color-value {
  min-width: 0;
  overflow: hidden;
  color: var(--studio-text-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.svg-color-picker {
  min-width: 0;
}

.svg-stop-row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) minmax(0, 1fr);
  align-items: end;
  gap: 8px;
}

.svg-stop-name {
  color: var(--studio-text);
  font-size: 12px;
  font-weight: 600;
}

.svg-stop-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--studio-text-muted);
  font-size: 11px;
}

.svg-editor-empty {
  margin-top: 12px;
  border: 1px dashed var(--studio-border);
  border-radius: var(--studio-radius-sm);
  padding: 12px;
  color: var(--studio-text-muted);
  font-size: 12px;
  line-height: 1.4;
}

@media (max-width: 900px) {
  .svg-editor-side {
    max-height: none;
  }

  .svg-color-row {
    grid-template-columns: 1fr;
  }

  .svg-color-meta {
    justify-content: space-between;
  }
}
</style>
