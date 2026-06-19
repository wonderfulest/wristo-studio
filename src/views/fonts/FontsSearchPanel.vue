<template>
  <section class="search-panel" aria-label="Font search">
    <div class="panel-copy">
      <div>
        <p class="eyebrow">{{ t('font.searchFonts') }}</p>
        <h1>{{ t('font.libraryTitle') }}</h1>
      </div>
      <p class="panel-description">
        {{ t('font.librarySubtitle') }}
      </p>
    </div>
    <div class="search-inputs">
      <el-input
        :model-value="searchQuery"
        :placeholder="t('font.describeFontSearch')"
        class="search-input"
        clearable
        @input="onSearchInput"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
        <template #append>
          <el-button :icon="Search" @click="emit('search')">{{ t('common.search') }}</el-button>
        </template>
      </el-input>

      <el-input
        :model-value="previewText"
        :placeholder="t('font.enterPreviewText')"
        class="preview-input"
        clearable
        @input="onPreviewTextInput"
      >
        <template #prefix>
          <span class="preview-prefix">Aa</span>
        </template>
      </el-input>
    </div>
    <div v-if="interpretedFilters?.length" class="intent-chips">
      <el-tag
        v-for="filter in interpretedFilters"
        :key="filter"
        size="small"
        closable
        effect="plain"
        @close="emit('removeInterpretedFilter', filter)"
      >
        {{ filter }}
      </el-tag>
    </div>
    <el-divider />
    <!-- Filters -->
    <el-form :inline="true" class="filters-form" label-position="left" size="small">
      <el-form-item>
        <template #label>
          {{ t('font.monospace') }}: {{ isMonospace ? t('common.on') : t('common.off') }}
        </template>
        <el-switch
          :model-value="isMonospace"
          :active-text="t('common.on')"
          :inactive-text="t('common.off')"
          inline-prompt
          @change="onIsMonospaceChange"
        />
      </el-form-item>
      <el-form-item>
        <template #label>
          {{ t('font.italic') }}: {{ italic ? t('common.on') : t('common.off') }}
        </template>
        <el-switch
          :model-value="italic"
          :active-text="t('common.on')"
          :inactive-text="t('common.off')"
          inline-prompt
          @change="onItalicChange"
        />
      </el-form-item>
      <el-form-item>
        <template #label>
          {{ t('font.weight') }}: {{ weightClass ?? t('common.any') }}
        </template>
        <el-select
          :model-value="weightClass"
          :placeholder="t('common.any')"
          class="w-40"
          clearable
          @change="onWeightClassChange"
        >
          <el-option v-for="w in [100,200,300,400,500,600,700,800,900]" :key="w" :label="String(w)" :value="w" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <template #label>
          {{ t('font.width') }}: {{ widthClass ?? t('common.any') }}
        </template>
        <el-select
          :model-value="widthClass"
          :placeholder="t('common.any')"
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
        <el-button v-if="canUploadFonts" size="small" @click="emit('openUploadDialog')">
          <el-icon><Upload /></el-icon>
          {{ t('font.uploadFonts') }}
        </el-button>
        <el-button size="small" style="margin-left: 12px;" @click="emit('resetFilters')">{{ t('common.resetFilters') }}</el-button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Search, Upload } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

defineProps<{
  searchQuery: string
  previewText: string
  isMonospace: boolean
  italic: boolean
  weightClass?: number
  widthClass?: number
  canUploadFonts?: boolean
  interpretedFilters?: string[]
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
  (e: 'removeInterpretedFilter', value: string): void
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
  background:
    radial-gradient(circle at 12% 0%, rgba(15, 107, 104, 0.12), transparent 32%),
    linear-gradient(135deg, var(--studio-surface), var(--studio-surface-soft));
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  padding: 22px;
  margin-bottom: 18px;
  box-shadow: var(--studio-shadow-sm);
}

.panel-copy {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--studio-primary);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: var(--studio-text);
  font-size: 28px;
  line-height: 1.15;
}

.panel-description {
  max-width: 460px;
  margin: 0;
  color: var(--studio-text-muted);
  font-size: 14px;
  line-height: 1.55;
}

.search-inputs {
  display: grid;
  grid-template-columns: minmax(260px, 1.35fr) minmax(220px, 0.8fr);
  gap: 16px;
  align-items: center;
}

.search-input {
  min-width: 0;
}

.preview-input {
  min-width: 0;
}

.preview-prefix {
  font-size: 14px;
  font-weight: 500;
  color: var(--studio-text-muted);
}

.intent-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.search-panel :deep(.el-input__wrapper) {
  min-height: 44px;
  border-radius: var(--studio-radius-md);
  box-shadow: 0 0 0 1px var(--studio-border) inset;
}

.search-panel :deep(.el-input-group__append) {
  border-radius: 0 var(--studio-radius-md) var(--studio-radius-md) 0;
}

.filters-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  margin-top: 12px;
}

.filters-form :deep(.el-form-item) {
  min-height: 44px;
  margin-right: 0;
  margin-bottom: 0;
  padding: 8px 10px;
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
}

.filters-form :deep(.el-form-item__label) {
  color: var(--studio-text-muted);
  font-weight: 650;
}

.filters-form :deep(.el-select) { min-width: 132px; }

.search-toolbar { margin-top: 12px; }

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar-actions :deep(.el-button) {
  margin-left: 0 !important;
}

@media (max-width: 760px) {
  .search-panel {
    padding: 16px;
  }

  .panel-copy,
  .search-inputs {
    grid-template-columns: 1fr;
  }

  .panel-copy {
    display: block;
  }

  .panel-description {
    margin-top: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .search-panel :deep(*) {
    transition: none !important;
  }
}
</style>
