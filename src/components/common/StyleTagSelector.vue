<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useI18n } from '@/i18n'
import type { ProductTag } from '@/types/api/productTag'
import { limitStyleTagSelection } from './styleTagSelection'

const props = withDefaults(
  defineProps<{
    tagIds: number[]
    tags: ProductTag[]
    loading?: boolean
    disabled?: boolean
    limit?: number
  }>(),
  {
    loading: false,
    disabled: false,
    limit: 5
  }
)

const emit = defineEmits<{
  (event: 'update:tagIds', value: number[]): void
}>()

const { t } = useI18n()

const handleChange = (next: number[]) => {
  const result = limitStyleTagSelection(props.tagIds, next, props.limit)
  emit('update:tagIds', result.ids)

  if (result.exceeded) {
    ElMessage.warning(t('styleTags.limit', { limit: props.limit }))
  }
}
</script>

<template>
  <el-form-item :label="t('styleTags.label')" prop="tagIds">
    <el-select :model-value="tagIds" multiple filterable class="style-tag-select" :placeholder="t('styleTags.placeholder')" :loading="loading" :disabled="disabled" @change="handleChange">
      <el-option v-for="tag in tags" :key="tag.id" :value="tag.id" :label="tag.name" />
    </el-select>
    <div class="style-tag-tip">{{ t('styleTags.tip', { limit }) }}</div>
  </el-form-item>
</template>

<style scoped>
.style-tag-select {
  width: 100%;
}

.style-tag-tip {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}
</style>
