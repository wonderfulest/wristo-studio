<template>
  <div class="font-naming">
    <div class="naming-preview-row">
      <span class="naming-preview-label">
        <span class="naming-required">*</span>
        {{ t('font.nameLabel') }}
      </span>
      <el-input
        class="naming-preview-input"
        size="small"
        :model-value="namingPreview"
        :placeholder="t('font.namePlaceholder')"
        readonly
        @focus="editing = true"
        @click="editing = true"
      />
    </div>

    <div v-if="editing" class="naming-bar">
      <el-input
        v-model="seriesPart"
        size="small"
        class="naming-input"
        :placeholder="t('font.seriesPlaceholder')"
        @keyup.enter="finishEditing"
      />
      <span class="naming-sep">-</span>
      <!-- 不可编辑 -->
      <el-input
        v-model="usePart"
        size="small"
        class="naming-input naming-input--use"
        :placeholder="type"
        disabled
      />
      <span class="naming-sep">-</span>
      <el-select
        v-model="stylePart"
        size="small"
        class="naming-input"
        :placeholder="t('font.stylePlaceholder')"
        filterable
        allow-create
        @change="finishEditing"
      >
        <el-option
          v-for="item in styleOptions"
          :key="item"
          :label="item"
          :value="item"
        />
      </el-select>
      <span class="naming-sep">-</span>
      <el-select
        v-model="variantPart"
        size="small"
        class="naming-input"
        :placeholder="t('font.variantPlaceholder')"
        filterable
        allow-create
        @change="finishEditing"
      >
        <el-option
          v-for="item in variantOptions"
          :key="item"
          :label="item"
          :value="item"
        />
      </el-select>
    </div>

    <div class="naming-tip">
      <div class="naming-tip-line">{{ t('font.namingFormat', { format: '{series}-{use}-{style}-{variant}' }) }}</div>
      <div class="naming-tip-line">{{ t('font.namingUseHint', { use: type, styles: 'mono/round/sharp/segment', variants: 'regular/outline/bold/light' }) }}</div>
      <div class="naming-tip-line">{{ t('font.namingExamples', { example1: 'aura-number-mono-regular', example2: 'neon-number-segment-bold' }) }}</div>
      <div class="naming-tip-line">
        {{ t('font.namingGlossary') }}
        <a
          href="https://wiki.wristo.io/02-design/02-design-guideline/04-font-name-glossary.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Font Name Glossary
        </a>
        。
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  type: 'number' | 'text' | 'icon'
}>()

const seriesPart = ref('')
const usePart = ref(props.type || 'number')
const stylePart = ref('mono')
const variantPart = ref('regular')
const editing = ref(false)

const styleOptions = ['mono', 'round', 'italic', 'sharp', 'segment', 'hand']
const variantOptions = ['light', 'regular', 'semi-bold', 'bold', 'outline']

const normalize = (value: string, fallback: string) => {
  // 只做基础规范：trim + 小写；合法性由 watcher 保证
  const base = (value && value.trim()) || fallback
  let v = base.toLowerCase()
  if (!v) v = fallback.toLowerCase()
  return v
}

const namingPreview = computed(() => {
  // 第一段 series 必须用户自己输入；未输入时整体预览为空
  const rawSeries = (seriesPart.value || '').trim()
  const s = rawSeries.toLowerCase()
  if (!s) return ''
  const u = normalize(usePart.value, 'number')
  const st = normalize(stylePart.value, 'mono')
  const v = normalize(variantPart.value, 'regular')
  return `${s}-${u}-${st}-${v}`
})

watch(
  () => props.type,
  (val) => {
    usePart.value = val || 'number'
  }
)

// 校验：每一部分都不能以数字开头，且只能包含 [a-z0-9_-]，非法输入时恢复到之前的值
const makeNoDigitStartWatcher = (part: typeof seriesPart, label: string) => {
  watch(part, (val, oldVal) => {
    if (val == null) return
    const current = String(val).trim()
    const lower = current.toLowerCase()
    const startsWithDigit = /^[0-9]/.test(lower)
    const hasInvalidChar = /[^a-z0-9_-]/.test(lower)
    if (startsWithDigit || hasInvalidChar) {
      ElMessage.error(t('font.namePartInvalid', { label }))
      part.value = oldVal
    }
  })
}

makeNoDigitStartWatcher(seriesPart, 'Series')
makeNoDigitStartWatcher(stylePart, 'Style')
makeNoDigitStartWatcher(variantPart, 'Variant')

const finishEditing = () => {
  editing.value = false
}

// 暴露给父组件，如果后面需要用到命名结果
defineExpose({ namingPreview, seriesPart, usePart, stylePart, variantPart })
</script>

<style scoped>
.font-naming {
  margin-bottom: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background-color: var(--studio-surface-soft);
}

.naming-preview-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 12px;
}

.naming-preview-label {
  color: var(--studio-text-muted);
  white-space: nowrap;
}

.naming-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.naming-label {
  font-size: 13px;
  color: var(--studio-text-muted);
  margin-right: 4px;
}

.naming-input {
  width: 140px;
}

.naming-input--use {
  width: 90px;
}

.naming-sep {
  padding: 0 2px;
  color: var(--studio-text-subtle);
}

.naming-required {
  color: #f56c6c;
  margin-right: 2px;
}

.naming-preview-value {
  font-family: monospace;
  color: var(--studio-text);
}

.naming-preview-input {
  flex: 1;
}

.naming-tip {
  margin-top: 2px;
  font-size: 11px;
  color: var(--studio-text-subtle);
}

.naming-tip-line:not(:last-child) {
  margin-bottom: 2px;
}
</style>
