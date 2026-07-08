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
          :label="categoryDisplayName(category)"
          :value="category.id"
        />
      </el-select>
      <div class="form-tip">
        {{ t('category.tip') }} {{ t('category.limit', { limit: selectionLimit }) }}
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
  hiddenCategorySlugs?: string[]
}>(), {
  categoryIds: () => [],
  categories: () => [],
  loadingCategories: false,
  categoryLimit: 5,
  hiddenCategorySlugs: () => []
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

const withoutHiddenCategories = (ids: number[]) => {
  const hiddenIds = new Set(
    (props.categories || [])
      .filter((category) => hiddenCategorySlugs.value.has((category.slug || '').toLowerCase()))
      .map((category) => category.id)
  )
  return ids.filter((id) => !hiddenIds.has(id))
}

const localCategoryIds = computed({
  get: () => withoutHiddenCategories(uniqueIds(props.categoryIds)),
  set: (val: number[]) => {
    emit('update:categoryIds', withWholeCategory(val))
  }
})

const studioBaseCategoryLabels: Record<string, string> = {
  whole: 'All Watch Faces',
  digital: 'Digital',
  'data-rich': 'Data-rich',
  weather: 'Weather',
  minimal: 'Minimal',
  simple: 'Simple',
  daily: 'Daily',
  strokes: 'Strokes',
  analog: 'Analog',
  neon: 'Neon',
  cyberpunk: 'Cyberpunk',
  halo: 'Halo',
  nature: 'Nature',
  landscape: 'Landscape',
  mountain: 'Mountain',
  cartoon: 'Cartoon',
  animal: 'Animal',
  family: 'Family',
  fun: 'Fun',
  flower: 'Flower',
  mandala: 'Mandala',
  dots: 'Dots',
  galaxy: 'Galaxy',
  fantasy: 'Fantasy',
  'pop-retro': 'Pop & Retro',
  'pop-pulse': 'Pop Pulse',
  retro: 'Retro',
  skull: 'Skull',
  seasonal: 'Seasonal',
  christmas: 'Christmas',
  'seasonal-themes': 'Seasonal Themes',
}

const hiddenCategorySlugs = computed(() => new Set((props.hiddenCategorySlugs || []).map((slug) => slug.toLowerCase())))
const selectionLimit = computed(() => props.categoryLimit ?? 5)

const filteredCategories = computed(() => {
  return (props.categories || []).filter((category) => !hiddenCategorySlugs.value.has((category.slug || '').toLowerCase()))
})

const categoryDisplayName = (category: Category) => {
  return studioBaseCategoryLabels[(category.slug || '').toLowerCase()] || category.name
}

const onCategoriesChange = (val: number[]) => {
  const limit = selectionLimit.value
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
