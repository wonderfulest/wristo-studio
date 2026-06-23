<template>
  <div class="font-section">
    <div class="font-list-content">
      <div v-if="!visibleFonts.length" class="no-fonts">{{ t('font.noRecentFonts') }}</div>
      <div v-else class="font-family-group">
        <div
          v-for="font in visibleFonts"
          :key="font.value"
          class="font-item"
          :class="{ active: modelValue === font.value }"
          @click="$emit('select', font)"
        >
          <FontListItem
            :label="font.family"
            :font-family="font.value"
            :type="type"
            :font-url="font.src"
            :font-id="font.id"
            :style-tags="font.styleTags"
            :can-edit-search-index="!!font.id"
            is-recent
            compact
            @edit-search-index="() => emit('editSearchIndex', font)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FontItem } from '@/types/font-picker'
import FontListItem from '@/components/fonts/FontListItem.vue'
import { filterAssetsByStudioAccess } from '@/utils/studioAssetAccess'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  fonts: FontItem[]
  modelValue: string
  type?: string
  canUsePremiumAssets?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', font: FontItem): void
  (e: 'editSearchIndex', font: FontItem): void
}>()

const visibleFonts = computed(() => filterAssetsByStudioAccess(props.fonts, props.canUsePremiumAssets === true))
</script>

<style scoped>
.font-section {
  position: relative;
  border-bottom: 1px solid var(--studio-border);
}

.font-list-content {
  padding: 8px 12px;
}

.family-name {
  font-size: 12px;
  color: var(--studio-text-subtle);
  padding: 8px 12px;
  background: var(--studio-surface-soft);
  border-bottom: 1px solid var(--studio-border);
}

.font-family-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.font-item {
  width: 100%;
  padding: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.font-item:hover {
  background: var(--studio-surface-soft);
}

.font-item.active {
  background: var(--studio-primary-soft);
  color: var(--studio-primary);
}

.preview-text {
  font-size: 18px;
  color: var(--studio-text);
}

.preview-text-icon {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.font-name {
  font-size: 12px;
  color: var(--studio-text-subtle);
}

.no-fonts {
  padding: 12px;
  color: var(--studio-text-subtle);
  font-size: 13px;
  text-align: center;
}
</style>
