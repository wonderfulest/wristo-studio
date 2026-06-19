<template>
  <div class="designer-font-list">
    <div ref="scrollContainer" class="font-list-scroll" @scroll.passive="onScroll">
      <div
        v-for="font in fonts"
        :key="font.id"
        class="font-item"
        :class="{ active: modelValue === font.slug }"
        @click="handleSelect(font)"
      >
        <FontListItem
          :label="font.fullName || font.family || font.slug"
          :font-family="font.slug"
          :type="type"
          :is-system="font.isSystem === 1"
          :is-monospace="font.isMonospace === 1"
          :subfamily="font.subfamily || ''"
          :font-id="font.id"
          :font-url="font.ttfFile?.url"
          :style-tags="font.styleTags"
          :can-edit-search-index="!!font.id"
          compact
          @edit-search-index="() => emit('editSearchIndex', font)"
          @removed="onFontRemoved"
        />
      </div>
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
import FontListItem from '@/components/fonts/FontListItem.vue'
import { filterAssetsByStudioAccess } from '@/utils/studioAssetAccess'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  modelValue: string
  type: string
  canUsePremiumAssets?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', font: FontItem): void
  (e: 'scroll'): void
  (e: 'editSearchIndex', font: DesignFontVO): void
}>()

const fonts = ref<DesignFontVO[]>([])
const loading = ref(false)
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)

const hasMore = computed(() => fonts.value.length < total.value)
const scrollContainer = ref<HTMLDivElement | null>(null)

defineExpose({
  scrollBy(delta = 120) {
    scrollContainer.value?.scrollBy({ top: delta, behavior: 'smooth' })
  },
})

const loadPage = async () => {
  if (loading.value || (!hasMore.value && pageNum.value !== 1)) return
  loading.value = true
  try {
    const resp: ApiResponse<PageResponse<DesignFontVO>> =
      props.canUsePremiumAssets === true
        ? await getDesignerUsageFontsPage({
            pageNum: pageNum.value,
            pageSize: pageSize.value,
            type: props.type,
          })
        : await searchFonts({
            pageNum: pageNum.value,
            pageSize: pageSize.value,
            type: props.type,
            isSystem: 1,
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

const onScroll = () => {
  emit('scroll')
  const el = scrollContainer.value
  if (!el || loading.value || !hasMore.value) return
  const threshold = 80
  if (el.scrollTop + el.clientHeight + threshold >= el.scrollHeight) {
    pageNum.value += 1
    void loadPage()
  }
}

const handleSelect = (font: DesignFontVO) => {
  const item: FontItem = {
    label: font.fullName || font.family || font.slug,
    value: font.slug,
    family: font.family || font.fullName || font.slug,
    isMonospace: font.isMonospace === 1,
    italic: font.italic === 1,
    isSystem: font.isSystem === 1,
  }
  emit('select', item)
}

const onFontRemoved = (id: number) => {
  fonts.value = fonts.value.filter(f => f.id !== id)
}

onMounted(() => {
  void loadPage()
})

watch(
  () => [props.type, props.canUsePremiumAssets],
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
  padding: 8px 0;
}

.font-list-scroll {
  padding: 8px 12px;
  max-height: 520px;
  overflow-y: auto;
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

.font-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.font-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.font-name {
  font-size: 12px;
  color: var(--studio-text-subtle);
}

.font-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.loading,
.end-tip {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--studio-text-subtle);
  text-align: center;
}
</style>
