<template>
  <div class="font-section">
    <div class="section-header" @click="$emit('toggle')">
      <span class="arrow" :class="{ expanded: expanded }">›</span>
      {{ t('font.recent') }}
    </div>
    <div
      v-if="expanded"
      class="section-content"
      @wheel="onSectionWheel"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
    >
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
            compact
            @edit-search-index="() => emit('editSearchIndex', font)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FontItem } from '@/types/font-picker'
import FontListItem from '@/components/fonts/FontListItem.vue'
import { filterAssetsByStudioAccess } from '@/utils/studioAssetAccess'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  fonts: FontItem[]
  modelValue: string
  expanded: boolean
  type?: string
  canUsePremiumAssets?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', font: FontItem): void
  (e: 'toggle'): void
  (e: 'scrollDown', delta: number): void
  (e: 'editSearchIndex', font: FontItem): void
}>()

const visibleFonts = computed(() => filterAssetsByStudioAccess(props.fonts, props.canUsePremiumAssets === true))
const touchStartY = ref(0)

const onSectionWheel = (event: WheelEvent) => {
  if (event.deltaY > 12) {
    emit('scrollDown', event.deltaY)
  }
}

const onTouchStart = (event: TouchEvent) => {
  touchStartY.value = event.touches[0]?.clientY ?? 0
}

const onTouchMove = (event: TouchEvent) => {
  const currentY = event.touches[0]?.clientY ?? touchStartY.value
  const delta = touchStartY.value - currentY
  if (delta > 12) {
    emit('scrollDown', delta)
  }
}
</script>

<style scoped>
.font-section {
  border-bottom: 1px solid var(--studio-border);
}

.section-header {
  padding: 4px 12px;
  font-size: 13px;
  color: var(--studio-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  user-select: none;
}

.arrow {
  display: inline-block;
  margin-right: 8px;
  transition: transform 0.3s;
}

.arrow.expanded {
  transform: rotate(90deg);
}

.section-content {
  padding: 8px 0;
  max-height: 180px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.family-name {
  font-size: 12px;
  color: var(--studio-text-subtle);
  padding: 8px 12px;
  background: var(--studio-surface-soft);
  border-bottom: 1px solid var(--studio-border);
}

.font-item {
  padding: 5px 10px;
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
