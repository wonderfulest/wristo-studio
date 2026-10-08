<script setup lang="ts">
import { computed } from 'vue'
import { MAX_PRODUCT_TAGS, matchPastedTags } from '../dialogs/goLiveTags'
import { ElMessage } from 'element-plus'
import { useI18n } from '@/i18n'
import type { ProductTag } from '@/types/api/productTag'
import { limitTagSelection } from './styleTagSelection'

const props = withDefaults(
  defineProps<{
    tagIds: number[]
    tags: ProductTag[]
    loading?: boolean
    disabled?: boolean
    limit?: number
    showGeneration?: boolean
    canGenerate?: boolean
    generating?: boolean
    generationStatus?: string
  }>(),
  {
    loading: false,
    disabled: false,
    limit: MAX_PRODUCT_TAGS,
    showGeneration: true,
    canGenerate: false,
    generating: false,
    generationStatus: 'ready'
  }
)

const emit = defineEmits<{
  (event: 'update:tagIds', value: number[]): void
  (event: 'generate'): void
}>()

const { t } = useI18n()

const groupedTags = computed(() => {
  const groups = new Map<string, ProductTag[]>()
  for (const tag of props.tags) {
    const parent = tag.tagGroup || ''
    if (!groups.has(parent)) groups.set(parent, [])
    groups.get(parent)!.push(tag)
  }
  return [...groups].map(([slug, tags]) => ({ slug, label: slug ? t(`styleTags.group.${slug}`) : 'Other tags', tags }))
})
const addTags = (ids: number[]) => {
  const next = [...new Set([...props.tagIds, ...ids])]
  if (next.length > props.limit) ElMessage.warning(t('productTags.limit', { limit: props.limit }))
  const selected = next.slice(0, props.limit)
  emit('update:tagIds', selected)
  return selected
}
const handlePaste = (event: ClipboardEvent) => {
  if (props.disabled || props.loading || props.generating) return
  const text = event.clipboardData?.getData('text') || ''
  const ids = matchPastedTags(text, props.tags)
  if (!ids.length) return // Leave unmatched text in the select's search input.
  event.preventDefault()
  const selected = addTags(ids)
  const matched = new Set(props.tags.filter(tag => selected.includes(tag.id)).flatMap(tag => [tag.name.toLowerCase(), tag.slug.toLowerCase()]))
  const unmatched = text.split(/[,，;；\n]+/).filter(value => value.trim() && !matched.has(value.trim().replace(/^#/, '').toLowerCase()))
  if (unmatched.length) ElMessage.warning(`${t('productTags.noMatch')}: ${unmatched.join(', ')}`)
}
const generate = () => {
  if (props.showGeneration && !props.disabled && !props.loading && !props.generating && props.canGenerate && !props.tagIds.length) emit('generate')
}

const handleChange = (next: number[]) => {
  if (props.disabled || props.loading || props.generating) return
  const result = limitTagSelection(props.tagIds, next, props.limit)
  emit('update:tagIds', result.ids)
  if (result.exceeded) {
    ElMessage.warning(t('productTags.limit', { limit: props.limit }))
  }
}
</script>

<template>
  <el-form-item :label="t('productTags.label')" prop="tagIds">
    <div class="product-tag-row" @paste.capture="handlePaste">
      <el-select
        :model-value="tagIds"
        multiple
        clearable
        filterable
        class="product-tag-select"
        popper-class="product-tag-options"
        :multiple-limit="limit"
        :placeholder="t('productTags.bulkPlaceholder')"
        :loading="loading"
        :disabled="disabled || loading || generating"
        @change="handleChange">
        <el-option-group v-for="group in groupedTags" :key="group.slug" :label="group.label">
          <el-option v-for="tag in group.tags" :key="tag.id" :value="tag.id" :label="tag.name" />
        </el-option-group>
      </el-select>
      <div class="product-tag-actions">
        <button v-if="showGeneration" type="button" data-testid="generate-tags" :disabled="disabled || loading || generating || !canGenerate || tagIds.length > 0" @click="generate">
          {{ t(generating ? 'productTags.generating' : 'productTags.generate') }}
        </button>
        <span>{{ tagIds.length }} / {{ limit }}</span>
      </div>
    </div>
    <div class="product-tag-tip">{{ t('productTags.tip', { limit }) }} <template v-if="showGeneration">{{ t('productTags.generateWhenEmpty') }}</template></div>
    <div v-if="showGeneration && (generationStatus === 'failed' || generationStatus === 'processing' || generationStatus === 'unavailable')" class="product-tag-tip" role="status">{{ t(`productTags.generation.${generationStatus}`) }}</div>
  </el-form-item>
</template>

<style scoped>
.product-tag-row { display: flex; align-items: center; gap: 8px; width: 100%; }
.product-tag-select {
  flex: 1;
  min-width: 0;
}

.product-tag-tip {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.product-tag-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}
.product-tag-actions button {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 7px 10px;
  background: var(--el-fill-color-blank);
  color: var(--el-color-primary);
  cursor: pointer;
}
.product-tag-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.product-tag-actions span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
:global(.product-tag-options .el-select-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px;
  max-width: min(760px, 85vw);
}
:global(.product-tag-options .el-select-dropdown__item) {
  flex: 0 0 auto;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 0 28px 0 12px;
}
:global(.product-tag-options .el-select-dropdown__item.is-selected) {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}
</style>

<style>
.product-tag-options .el-select-group__wrap { width: 100%; }
</style>
