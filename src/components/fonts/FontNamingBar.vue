<template>
  <div class="font-naming">
    <div class="naming-head">
      <div>
        <div class="naming-title">
          <span class="naming-required">*</span>
          {{ t('font.nameLabel') }}
        </div>
        <div class="naming-subtitle">{{ t('font.nameHelper', { use: type }) }}</div>
      </div>
      <el-button size="small" text class="naming-random" @click="randomizeName">
        <el-icon><Refresh /></el-icon>
        {{ t('font.randomName') }}
      </el-button>
    </div>

    <div class="naming-preview">
      <span class="naming-preview-value">{{ namingPreview || t('font.namePlaceholder') }}</span>
    </div>

    <div class="naming-bar">
      <label class="naming-field">
        <span>{{ t('font.seriesLabel') }}</span>
        <el-input
          v-model="seriesPart"
          size="small"
          :placeholder="t('font.seriesPlaceholder')"
          @blur="normalizeAllParts"
        />
      </label>

      <label class="naming-field naming-field--use">
        <span>{{ t('font.useLabel') }}</span>
        <el-input v-model="usePart" size="small" disabled />
      </label>

      <label class="naming-field">
        <span>{{ t('font.styleLabel') }}</span>
        <el-select
          v-model="stylePart"
          size="small"
          filterable
          allow-create
          :placeholder="t('font.stylePlaceholder')"
          @change="normalizeAllParts"
        >
          <el-option
            v-for="item in styleOptions"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </label>

      <label class="naming-field">
        <span>{{ t('font.variantLabel') }}</span>
        <el-select
          v-model="variantPart"
          size="small"
          filterable
          allow-create
          :placeholder="t('font.variantPlaceholder')"
          @change="normalizeAllParts"
        >
          <el-option
            v-for="item in variantOptions"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </label>
    </div>

    <div class="naming-tip">
      <div class="naming-tip-line">{{ t('font.namingAutoSlug') }}</div>
      <div class="naming-examples">
        <button
          v-for="example in examples"
          :key="example"
          type="button"
          class="naming-chip"
          @click="applyExample(example)"
        >
          {{ example }}
        </button>
      </div>
      <div class="naming-tip-line naming-tip-line--muted">
        {{ t('font.namingShortRule', { format: '{series}-{use}-{style}-{variant}' }) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  type: 'number' | 'text' | 'icon'
}>()

const seriesPart = ref('')
const usePart = ref<string>(props.type || 'number')
const stylePart = ref('mono')
const variantPart = ref('regular')

const styleOptions = ['mono', 'round', 'sharp', 'segment', 'hand', 'line', 'pixel']
const variantOptions = ['light', 'regular', 'outline', 'semi-bold', 'bold']
const seriesOptions = ['aura', 'neon', 'luna', 'nova', 'pixel', 'orbit', 'zen', 'halo', 'muse', 'flux', 'hand-drawn-doodle']

const examples = computed(() => {
  if (props.type === 'icon') {
    return ['hand-drawn-doodle-icon-round-semi-bold', 'aura-icon-mono-regular']
  }
  if (props.type === 'text') {
    return ['luna-text-round-regular', 'muse-text-sharp-light']
  }
  return ['aura-number-mono-regular', 'neon-number-segment-bold']
})

const pickRandom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]

const makeRandomSuffix = () => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1296
    return value.toString(36).padStart(2, '0')
  }
  return Math.floor(Math.random() * 1296).toString(36).padStart(2, '0')
}

const randomizeName = () => {
  seriesPart.value = `${pickRandom(seriesOptions)}-${makeRandomSuffix()}`
  stylePart.value = pickRandom(styleOptions)
  variantPart.value = pickRandom(variantOptions)
  usePart.value = props.type || 'number'
}

const slugifyPart = (value: string, fallback = '') => {
  const base = String(value || fallback || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

  if (!base) return fallback
  return /^[a-z]/.test(base) ? base : `font-${base}`
}

const normalizeAllParts = () => {
  seriesPart.value = slugifyPart(seriesPart.value)
  usePart.value = slugifyPart(usePart.value, props.type || 'number')
  stylePart.value = slugifyPart(stylePart.value, 'mono')
  variantPart.value = slugifyPart(variantPart.value, 'regular')
}

const namingPreview = computed(() => {
  const s = slugifyPart(seriesPart.value)
  if (!s) return ''
  const u = slugifyPart(usePart.value, props.type || 'number')
  const st = slugifyPart(stylePart.value, 'mono')
  const v = slugifyPart(variantPart.value, 'regular')
  return `${s}-${u}-${st}-${v}`
})

const normalizedParts = computed(() => ({
  series: slugifyPart(seriesPart.value),
  use: slugifyPart(usePart.value, props.type || 'number'),
  style: slugifyPart(stylePart.value, 'mono'),
  variant: slugifyPart(variantPart.value, 'regular'),
}))

const getNamingPayload = () => ({
  name: namingPreview.value,
  ...normalizedParts.value,
})

watch(
  () => props.type,
  (val) => {
    usePart.value = val || 'number'
  }
)

onMounted(() => {
  randomizeName()
})

const applyExample = (example: string) => {
  const suffix = `-${props.type}-`
  const index = example.indexOf(suffix)
  if (index < 0) return
  seriesPart.value = example.slice(0, index)
  usePart.value = props.type
  const rest = example.slice(index + suffix.length)
  const style = styleOptions.find(item => rest === item || rest.startsWith(`${item}-`)) || 'mono'
  stylePart.value = style
  variantPart.value = rest.slice(style.length).replace(/^-/, '') || 'regular'
  normalizeAllParts()
}

// 暴露给父组件，如果后面需要用到命名结果
defineExpose({
  namingPreview,
  normalizedParts,
  seriesPart,
  usePart,
  stylePart,
  variantPart,
  randomizeName,
  normalizeAllParts,
  getNamingPayload,
})
</script>

<style scoped>
.font-naming {
  margin-bottom: 12px;
  padding: 16px;
  border: 1px solid var(--studio-border);
  border-radius: 8px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--studio-surface) 92%, transparent),
      color-mix(in srgb, var(--studio-surface-soft) 84%, transparent)
    ),
    var(--studio-surface-soft);
}

.naming-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.naming-title {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--studio-text);
}

.naming-subtitle {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--studio-text-subtle);
}

.naming-random {
  flex: 0 0 auto;
}

.naming-preview {
  min-height: 42px;
  display: flex;
  align-items: center;
  margin-bottom: 14px;
  padding: 9px 12px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--studio-primary-border) 54%, var(--studio-border));
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--studio-primary) 7%, transparent), transparent 54%),
    var(--studio-surface);
}

.naming-preview-value {
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.4;
  color: var(--studio-text);
}

.naming-bar {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(92px, 0.65fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.naming-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--studio-text-subtle);
}

.naming-field :deep(.el-input__wrapper),
.naming-field :deep(.el-select__wrapper) {
  min-height: 34px;
}

.naming-field :deep(.el-select) {
  width: 100%;
}

.naming-field--use :deep(.el-input__wrapper) {
  background: color-mix(in srgb, var(--studio-surface-soft) 78%, var(--studio-surface));
}

.naming-required {
  color: #f56c6c;
  margin-right: 3px;
}

.naming-tip {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed color-mix(in srgb, var(--studio-border) 86%, transparent);
  font-size: 12px;
  line-height: 1.45;
  color: var(--studio-text-subtle);
}

.naming-tip-line:not(:last-child) {
  margin-bottom: 6px;
}

.naming-tip-line--muted {
  font-size: 11px;
}

.naming-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0;
}

.naming-chip {
  min-height: 30px;
  max-width: 100%;
  padding: 5px 10px;
  border: 1px solid color-mix(in srgb, var(--studio-primary-border) 46%, var(--studio-border));
  border-radius: 6px;
  background: var(--studio-surface);
  color: var(--studio-text-muted);
  cursor: pointer;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  line-height: 1.35;
  overflow-wrap: anywhere;
  transition: border-color 0.16s ease, color 0.16s ease, background-color 0.16s ease;
}

.naming-chip:hover,
.naming-chip:focus-visible {
  border-color: var(--studio-primary);
  color: var(--studio-primary);
  outline: none;
}

@media (max-width: 720px) {
  .naming-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .naming-bar {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  .naming-bar {
    grid-template-columns: 1fr;
  }
}
</style>
