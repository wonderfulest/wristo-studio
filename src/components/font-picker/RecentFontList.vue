<template>
  <div class="font-section">
    <div class="font-list-content">
      <div v-if="!visibleFonts.length" class="no-fonts">{{ t('font.noRecentFonts') }}</div>
      <FontFamilyList
        v-else
        :fonts="visibleFonts"
        :model-value="modelValue"
        :type="type"
        is-recent
        @select="(font) => emit('select', font)"
        @edit-search-index="(font) => emit('editSearchIndex', font)"
        @favorite-changed="handleFavoriteChanged" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FontItem } from '@/types/font-picker'
import FontFamilyList from '@/components/font-picker/FontFamilyList.vue'
import { filterAssetsByStudioAccess } from '@/utils/studioAssetAccess'
import { useFontStore } from '@/stores/fontStore'
import { useI18n } from '@/i18n'
import { isFontCompatibleWithDateLanguage, type DateContentLanguage } from '@/utils/dateFontCompatibility'
import { sortSystemFontsFirst } from '@/components/font-picker/fontSort'
import { isFontTypeVisible, normalizeAllowedFontTypes } from './fontTypeVisibility'

const { t } = useI18n()

const props = defineProps<{
  fonts: FontItem[]
  modelValue: string
  type?: string
  types?: string[]
  canUsePremiumAssets?: boolean
  dateContentLanguage?: DateContentLanguage
  excludeIconFonts?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', font: FontItem): void
  (e: 'editSearchIndex', font: FontItem): void
}>()

const fontStore = useFontStore()
const allowedTypes = computed(() => normalizeAllowedFontTypes(props.types, props.type))
const visibleFonts = computed(() =>
  sortSystemFontsFirst(
    filterAssetsByStudioAccess(props.fonts, props.canUsePremiumAssets === true).filter((font) => {
      if (!isFontTypeVisible(font.type, allowedTypes.value)) {
        return false
      }
      if (props.dateContentLanguage) {
        return isFontCompatibleWithDateLanguage(font, props.dateContentLanguage)
      }
      if (props.excludeIconFonts) {
        return String(font.type || '') !== 'icon_font'
      }
      return true
    })
  )
)

const handleFavoriteChanged = (id: number, favoriteWeight: number | null | undefined) => {
  fontStore.updateFontFavorite(id, favoriteWeight)
}
</script>

<style scoped>
.font-section {
  position: relative;
  border-bottom: 1px solid var(--studio-border);
}

.font-list-content {
  padding: var(--font-picker-list-y, 8px) var(--font-picker-list-x, 12px);
}

.family-name {
  font-size: 12px;
  color: var(--studio-text-subtle);
  padding: 8px 12px;
  background: var(--studio-surface-soft);
  border-bottom: 1px solid var(--studio-border);
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
