<template>
  <div class="category-selector">
    <el-form-item :label="t('category.categories')" prop="categoryIds">
      <el-select
        v-model="localCategoryIds"
        multiple
        filterable
        :placeholder="t('category.selectCategories')"
        :loading="loadingCategories"
        style="width: 100%"
        @change="onCategoriesChange"
      >
        <el-option
          v-for="category in filteredCategories"
          :key="category.id"
          :label="category.name"
          :value="category.id"
        />
      </el-select>
      <div class="form-tip">
        {{ t('category.tip') }}
      </div>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { Category } from '@/types/api/category'
import { ElMessage } from 'element-plus'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  categoryIds: number[]
  categories: Category[]
  loadingCategories?: boolean
  categoryLimit?: number
}>(), {
  categoryIds: () => [],
  categories: () => [],
  loadingCategories: false,
  categoryLimit: 3
})

const emit = defineEmits<{
  (e: 'update:categoryIds', val: number[]): void
}>()

const wholeCategoryId = computed(() => {
  const whole = (props.categories || []).find((category) => category?.slug === 'whole')
  if (whole?.id) return whole.id
  return (props.categories || []).some((category) => category?.id === 1) ? 1 : undefined
})

const uniqueIds = (ids: number[]) => Array.from(new Set(ids.filter((id) => typeof id === 'number')))

const withWholeCategory = (ids: number[]) => {
  const normalized = uniqueIds(Array.isArray(ids) ? ids : [])
  const wholeId = wholeCategoryId.value
  if (!wholeId || normalized.includes(wholeId)) {
    return normalized
  }
  return [wholeId, ...normalized]
}

const sameIds = (a: number[], b: number[]) => a.length === b.length && a.every((id, index) => id === b[index])

const localCategoryIds = computed({
  get: () => withWholeCategory(props.categoryIds),
  set: (val: number[]) => {
    emit('update:categoryIds', withWholeCategory(val))
  }
})

const filteredCategories = computed(() => props.categories || [])

const onCategoriesChange = (val: number[]) => {
  const limit = props.categoryLimit ?? 3
  const wholeId = wholeCategoryId.value
  const ids = withWholeCategory(val)
  const selectedWithoutWhole = wholeId ? ids.filter((id) => id !== wholeId) : ids
  if (selectedWithoutWhole.length > limit) {
    ElMessage.warning(t('category.limit', { limit }))
    emit('update:categoryIds', withWholeCategory(selectedWithoutWhole.slice(0, limit)))
  }
}

watch(
  () => [wholeCategoryId.value, ...(props.categoryIds || [])],
  () => {
    const next = withWholeCategory(props.categoryIds)
    if (!sameIds(next, props.categoryIds || [])) {
      emit('update:categoryIds', next)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
