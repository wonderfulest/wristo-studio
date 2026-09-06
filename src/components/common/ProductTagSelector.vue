<script setup lang="ts">
import { ref } from 'vue'
import { MAX_PRODUCT_TAGS, matchPastedTags, autoFillProductTags } from '../dialogs/goLiveTags'
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
    suggestionText?: string
    suggestionConfig?: unknown
    supportedDeviceIds?: string
  }>(),
  {
    loading: false,
    disabled: false,
    limit: MAX_PRODUCT_TAGS,
    suggestionText: ''
  }
)

const emit = defineEmits<{
  (event: 'update:tagIds', value: number[]): void
}>()

const { t } = useI18n()
const bulkText = ref('')
const addTags = (ids: number[]) => {
  const next = [...new Set([...props.tagIds, ...ids])]
  if (next.length > props.limit) ElMessage.warning(t('productTags.limit', { limit: props.limit }))
  const selected = next.slice(0, props.limit)
  emit('update:tagIds', selected)
  return selected
}
const addPastedTags = () => {
  const ids = matchPastedTags(bulkText.value, props.tags)
  if (!ids.length) {
    ElMessage.warning(t('productTags.noMatch'))
    return
  }
  const selected = addTags(ids)
  // Keep unmatched names visible so a partial match never silently discards them.
  const matched = new Set(props.tags.filter((tag) => selected.includes(tag.id)).flatMap((tag) => [tag.name.toLowerCase(), tag.slug.toLowerCase()]))
  bulkText.value = bulkText.value
    .split(/[,，;；\n]+/)
    .filter((value) => !matched.has(value.trim().replace(/^#/, '').toLowerCase()))
    .join(', ')
  if (bulkText.value.trim()) ElMessage.warning(t('productTags.noMatch'))
}
const autoFill = () => {
  if (props.tagIds.length >= props.limit) {
    ElMessage.warning(t('productTags.limit', { limit: props.limit }))
    return
  }
  const ids = autoFillProductTags(props.suggestionText, props.tags, props.tagIds, props.suggestionConfig, props.limit, undefined, props.supportedDeviceIds)
  if (!ids.length) ElMessage.warning(t('productTags.noSuggestions'))
  else addTags(ids)
}

const handleChange = (next: number[]) => {
  const result = limitTagSelection(props.tagIds, next, props.limit)
  emit('update:tagIds', result.ids)
  if (result.exceeded) {
    ElMessage.warning(t('productTags.limit', { limit: props.limit }))
  }
}
</script>

<template>
  <el-form-item :label="t('productTags.label')" prop="tagIds">
    <el-select
      :model-value="tagIds"
      multiple
      filterable
      class="product-tag-select"
      popper-class="product-tag-options"
      :multiple-limit="limit"
      :placeholder="t('productTags.placeholder')"
      :loading="loading"
      :disabled="disabled"
      @change="handleChange">
      <el-option v-for="tag in tags" :key="tag.id" :value="tag.id" :label="tag.name" />
    </el-select>
    <div class="product-tag-actions">
      <input
        v-model="bulkText"
        class="product-tag-bulk"
        :aria-label="t('productTags.bulkPlaceholder')"
        :placeholder="t('productTags.bulkPlaceholder')"
        :disabled="disabled || loading"
        @keydown.enter.prevent="addPastedTags" />
      <button type="button" :disabled="disabled || loading || !bulkText.trim()" @click="addPastedTags">{{ t('productTags.addBulk') }}</button>
      <button type="button" :disabled="disabled || loading" @click="autoFill">{{ t('productTags.autoFill') }}</button>
      <span>{{ tagIds.length }} / {{ limit }}</span>
    </div>
    <div class="product-tag-tip">{{ t('productTags.tip', { limit }) }}</div>
  </el-form-item>
</template>

<style scoped>
.product-tag-select {
  width: 100%;
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
  width: 100%;
  margin-top: 8px;
}
.product-tag-bulk {
  flex: 1;
  min-width: 180px;
  padding: 7px 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-primary);
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
:global(.product-tag-options .el-select-dropdown__list) {
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
