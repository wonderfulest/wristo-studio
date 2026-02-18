<template>
  <div class="search-panel">
    <div class="search-inputs">
      <el-input
        :model-value="searchQuery"
        placeholder="Search fonts 1..."
        class="search-input"
        clearable
        @input="onSearchInput"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
        <template #append>
          <el-button :icon="Search" @click="emit('search')">Search</el-button>
        </template>
      </el-input>

      <el-input
        :model-value="previewText"
        placeholder="Enter preview text..."
        class="preview-input"
        clearable
        @input="onPreviewTextInput"
      >
        <template #prefix>
          <span class="preview-prefix">Aa</span>
        </template>
      </el-input>
    </div>
    <el-divider />
    <!-- Filters -->
    <el-form :inline="true" class="filters-form" label-position="left" size="small">
      <el-form-item>
        <template #label>
          Monospace: {{ isMonospace ? 'On' : 'Off' }}
        </template>
        <el-switch
          :model-value="isMonospace"
          active-text="On"
          inactive-text="Off"
          inline-prompt
          @change="onIsMonospaceChange"
        />
      </el-form-item>
      <el-form-item>
        <template #label>
          Italic: {{ italic ? 'On' : 'Off' }}
        </template>
        <el-switch
          :model-value="italic"
          active-text="On"
          inactive-text="Off"
          inline-prompt
          @change="onItalicChange"
        />
      </el-form-item>
      <el-form-item>
        <template #label>
          Weight: {{ weightClass ?? 'Any' }}
        </template>
        <el-select
          :model-value="weightClass"
          placeholder="Any"
          class="w-40"
          clearable
          @change="onWeightClassChange"
        >
          <el-option v-for="w in [100,200,300,400,500,600,700,800,900]" :key="w" :label="String(w)" :value="w" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <template #label>
          Width: {{ widthClass ?? 'Any' }}
        </template>
        <el-select
          :model-value="widthClass"
          placeholder="Any"
          class="w-40"
          clearable
          @change="onWidthClassChange"
        >
          <el-option v-for="w in [1,2,3,4,5,6,7,8,9]" :key="w" :label="String(w)" :value="w" />
        </el-select>
      </el-form-item>
    </el-form>

    <!-- Toolbar: total + reset -->
    <div class="search-toolbar flex items-center justify-between">
      <div class="toolbar-actions">
        <el-button size="small" @click="emit('openUploadDialog')">
          <el-icon><Upload /></el-icon>
          Upload Fonts
        </el-button>
        <el-button size="small" style="margin-left: 12px;" @click="emit('resetFilters')">Reset Filters</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import { Search, Upload } from '@element-plus/icons-vue'

defineProps<{
  searchQuery: string
  previewText: string
  isMonospace: boolean
  italic: boolean
  weightClass?: number
  widthClass?: number
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', value: string): void
  (e: 'update:previewText', value: string): void
  (e: 'update:isMonospace', value: boolean): void
  (e: 'update:italic', value: boolean): void
  (e: 'update:weightClass', value: number | undefined): void
  (e: 'update:widthClass', value: number | undefined): void
  (e: 'search'): void
  (e: 'filterChange'): void
  (e: 'resetFilters'): void
  (e: 'openUploadDialog'): void
  (e: 'previewTextChange'): void
}>()

const onSearchInput = (val: string) => {
  emit('update:searchQuery', val)
  emit('search')
}

const onPreviewTextInput = (val: string) => {
  emit('update:previewText', val)
  emit('previewTextChange')
}

const onIsMonospaceChange = (val: boolean) => {
  emit('update:isMonospace', val)
  emit('filterChange')
}

const onItalicChange = (val: boolean) => {
  emit('update:italic', val)
  emit('filterChange')
}

const onWeightClassChange = (val?: number) => {
  emit('update:weightClass', val)
  emit('filterChange')
}

const onWidthClassChange = (val?: number) => {
  emit('update:widthClass', val)
  emit('filterChange')
}
</script>

<style scoped>
.search-panel {
  background: #fff;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}

.search-inputs {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  min-width: 280px;
  max-width: 320px;
}

.preview-input {
  min-width: 240px;
  max-width: 280px;
}

.preview-prefix {
  font-size: 14px;
  font-weight: 500;
  color: #666;
}

.filters-form { margin-top: 12px; }
.filters-form :deep(.el-form-item) { margin-right: 16px; margin-bottom: 8px; }
.filters-form :deep(.el-select) { min-width: 160px; }

.search-toolbar { margin-top: 12px; }

.toolbar-actions {
  display: flex;
  align-items: center;
}
</style>
