<template>
  <div class="designer-font-list">
    <div class="font-list-scroll">
      <FontFamilyList
        :fonts="visibleFontItems"
        :model-value="modelValue"
        :type="type"
        @select="handleSelect"
        @edit-search-index="(font) => emit('editSearchIndex', font)"
        @favorite-changed="handleFavoriteChanged"
        @removed="onFontRemoved" />
      <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
      <div v-else-if="!hasMore && fonts.length" class="end-tip">{{ t('common.noMore') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { DesignFontVO } from '@/types/font'
import type { ApiResponse, PageResponse } from '@/types/api/api'
import { getDesignerUsageFontsPage, searchFonts } from '@/api/wristo/fonts'
import type { FontItem } from '@/types/font-picker'
import FontFamilyList from '@/components/font-picker/FontFamilyList.vue'
import { filterAssetsByStudioAccess } from '@/utils/studioAssetAccess'
import { useI18n } from '@/i18n'
import { isFontCompatibleWithDateLanguage, type DateContentLanguage } from '@/utils/dateFontCompatibility'
import { getFontLanguagesForDateContent } from '@/utils/fontLanguageFilter'
import { sortSystemFontsFirst } from '@/components/font-picker/fontSort'

const { t } = useI18n()

const props = defineProps<{
  modelValue: string
  type: string
  canUsePremiumAssets?: boolean
  includeAllUsers?: boolean
  excludedFontValues?: Set<string>
  dateContentLanguage?: DateContentLanguage
  excludeIconFonts?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', font: FontItem): void
  (e: 'editSearchIndex', font: FontItem): void
}>()

const fonts = ref<DesignFontVO[]>([])
const loading = ref(false)
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)

const hasMore = computed(() => fonts.value.length < total.value)
const languageFilter = computed(() => getFontLanguagesForDateContent(props.dateContentLanguage))
const isVisibleFont = (font: DesignFontVO) => {
  if (props.excludedFontValues?.has(font.slug)) return false
  if (props.dateContentLanguage) {
    return isFontCompatibleWithDateLanguage(font, props.dateContentLanguage)
  }
  if (props.excludeIconFonts) {
    return String(font.type || '') !== 'icon_font'
  }
  return true
}

const visibleFonts = computed(() => sortSystemFontsFirst(fonts.value.filter(isVisibleFont)))
const visibleFontItems = computed<FontItem[]>(() =>
  visibleFonts.value.map((font) => ({
    id: font.id,
    label: font.fullName || font.family || font.slug,
    value: font.slug,
    family: font.family || font.fullName || font.slug,
    src: font.ttfFile?.url,
    isMonospace: font.isMonospace === 1,
    italic: font.italic === 1,
    isSystem: font.isSystem === 1,
    styleTags: font.styleTags,
    searchKeywords: font.searchKeywords,
    weightClass: font.weightClass,
    widthClass: font.widthClass,
    favoriteWeight: font.favoriteWeight,
    language: font.language,
    type: font.type
  }))
)

defineExpose({
  loadNextPage,
  loadUntilFont
})

const loadPage = async () => {
  if (loading.value || (!hasMore.value && pageNum.value !== 1)) return
  loading.value = true
  try {
    const resp: ApiResponse<PageResponse<DesignFontVO>> =
      props.canUsePremiumAssets === true && props.type
        ? await getDesignerUsageFontsPage({
            pageNum: pageNum.value,
            pageSize: pageSize.value,
            type: props.type,
            includeAllUsers: props.includeAllUsers === true,
            languages: languageFilter.value
          })
        : await searchFonts({
            pageNum: pageNum.value,
            pageSize: pageSize.value,
            type: props.type || undefined,
            isSystem: props.canUsePremiumAssets === true ? undefined : 1,
            includeAllUsers: props.canUsePremiumAssets === true && props.includeAllUsers === true,
            languages: languageFilter.value
          })
    if (resp.code === 0 && resp.data) {
      const { list, total: t } = resp.data
      total.value = t
      const visibleList = filterAssetsByStudioAccess(list || [], props.canUsePremiumAssets === true)
      if (pageNum.value === 1) {
        fonts.value = visibleList
      } else {
        fonts.value = fonts.value.concat(visibleList)
      }
    }
  } finally {
    loading.value = false
  }
}

async function loadNextPage() {
  if (loading.value || !hasMore.value) return
  pageNum.value += 1
  await loadPage()
}

const waitForIdle = () =>
  new Promise<void>((resolve) => {
    if (!loading.value) {
      resolve()
      return
    }

    const timer = window.setInterval(() => {
      if (!loading.value) {
        window.clearInterval(timer)
        resolve()
      }
    }, 50)
  })

async function loadUntilFont(slug: string) {
  if (!slug) return false
  await waitForIdle()

  while (!fonts.value.some((font) => font.slug === slug) && hasMore.value) {
    const previousLength = fonts.value.length
    await loadNextPage()
    await waitForIdle()

    if (fonts.value.length === previousLength && !hasMore.value) break
  }

  return fonts.value.some((font) => font.slug === slug)
}

const handleSelect = (font: FontItem) => emit('select', font)

const onFontRemoved = (id: number) => {
  fonts.value = fonts.value.filter((f) => f.id !== id)
}

const handleFavoriteChanged = (id: number, favoriteWeight: number | null | undefined) => {
  fonts.value = fonts.value.map((font) => (font.id === id ? { ...font, favoriteWeight } : font)).sort((a, b) => Number(b.favoriteWeight || 0) - Number(a.favoriteWeight || 0))
}

onMounted(() => {
  void loadPage()
})

watch(
  () => [props.type, props.canUsePremiumAssets, props.includeAllUsers, props.dateContentLanguage, props.excludeIconFonts],
  () => {
    // reset when type changes
    pageNum.value = 1
    total.value = 0
    fonts.value = []
    void loadPage()
  }
)
</script>

<style scoped>
.designer-font-list {
  padding: 0;
}

.font-list-scroll {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: var(--font-picker-list-y, 8px) var(--font-picker-list-x, 12px);
}

.loading,
.end-tip {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--studio-text-subtle);
  text-align: center;
}
</style>
