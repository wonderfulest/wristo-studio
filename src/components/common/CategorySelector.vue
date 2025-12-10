<template>
  <div class="category-selector">
    <el-form-item label="Categories" prop="categoryIds">
      <el-select
        v-model="localCategoryIds"
        multiple
        filterable
        placeholder="Select categories"
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
        Select one or more categories for your app, will be show on wristo store
      </div>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Category } from '@/types/api/category'
import { ElMessage } from 'element-plus'

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

const localCategoryIds = computed({
  get: () => props.categoryIds,
  set: (val: number[]) => {
    const filtered = Array.isArray(val) ? val.filter((id) => id !== 1) : []
    emit('update:categoryIds', filtered)
  }
})

const filteredCategories = computed(() => (props.categories || []).filter(c => c && c.id !== 1))

const onCategoriesChange = (val: number[]) => {
  const limit = props.categoryLimit ?? 3
  if (Array.isArray(val) && val.length > limit) {
    ElMessage.warning(`分类最多选择${limit}个`)
    emit('update:categoryIds', val.slice(0, limit))
  }
}
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
