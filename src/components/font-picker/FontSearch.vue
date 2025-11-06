<template>
  <div class="font-section">
    <!-- Search bar -->
    <div class="search-container">
      <input
        type="text"
        v-model="searchQuery"
        placeholder="Search fonts..."
        class="search-input"
        @input="onInput"
      />
      <div class="filters">
        <label class="filter-item">
          <input type="checkbox" v-model="monospaceChecked" @change="onFilterChange" />
          Monospace
        </label>
        <label class="filter-item">
          <input type="checkbox" v-model="italicChecked" @change="onFilterChange" />
          Italic
        </label>
        <RouterLink class="open-library-anchor" to="/fonts" target="_blank" rel="noopener">Open Fonts Library</RouterLink>
      </div>
    </div>

    <template v-if="searchQuery || monospaceChecked || italicChecked">
      <!-- Local search results -->
      <template v-if="filteredFonts.length > 0">
        <div class="section-header">
          <span class="arrow expanded">›</span>
          Local Search Results
        </div>
        <div class="section-content">
          <div v-for="group in groupByFamily(filteredFonts)" :key="group.family" class="font-family-group">
            <div class="family-name">{{ group.family }}</div>
            <div v-for="font in group.fonts" :key="font.value" class="font-item"
              :class="{ active: modelValue === font.value }" @click="handleSelect(font)">
              <span class="preview-text" :style="{ fontFamily: font.value }">12:23 AM 72°F & Sunny 0123456789</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Remote search results -->
      <template v-if="remoteSearchResults.length > 0">
        <div class="section-header">
          <span class="arrow expanded">›</span>
          Online Search Results
        </div>
        <div class="section-content">
          <div v-for="group in groupByFamily(remoteSearchResults)" :key="group.family" class="font-family-group">
            <div class="family-name">{{ group.family }}</div>
            <div v-for="font in group.fonts" :key="font.value" class="font-item"
              :class="{ active: modelValue === font.value }" @click="handleSelect(font)">
              <span class="preview-text" :style="{ fontFamily: font.value }">12:23 AM 72°F & Sunny 0123456789</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Loading state -->
      <div v-if="isSearching" class="search-loading">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        Searching...
      </div>

      <!-- No result hint -->
      <div v-if="!isSearching && filteredFonts.length === 0 && remoteSearchResults.length === 0" class="no-results">
        No matching fonts
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { FontOption, useFontStore } from '@/stores/fontStore'
import { useMessageStore } from '@/stores/message'
import { searchFonts } from '@/api/wristo/fonts'
import type { FontItem } from '@/types/font-picker'
import { DesignFontVO } from '@/types/font'

const props = defineProps<{
  modelValue: string
  type?: string
}>()

const emit = defineEmits<{
  (e: 'select', font: FontItem): void
}>()

const fontStore = useFontStore()
const messageStore = useMessageStore()

const searchQuery = ref<string>('')
const filteredFonts = ref<FontItem[]>([])
const remoteSearchResults = ref<FontItem[]>([])
const isSearching = ref<boolean>(false)
let searchTimer: number | undefined

// filters
const monospaceChecked = ref<boolean>(false)
const italicChecked = ref<boolean>(false)

const onInput = () => {
  // debounce input to reduce remote requests
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(filterFonts, 250)
}

// immediate refresh when toggling filters
const onFilterChange = () => {
  if (searchTimer) window.clearTimeout(searchTimer)
  filterFonts()
}

// Precise local style filters using metadata (fallback to heuristic if missing)
const applyLocalStyleFilters = (items: FontItem[]) => {
  
  return items.filter((f) => {
    // monospace
    if (monospaceChecked.value && (f as any).isMonospace !== true) return false
    // italic
    if (italicChecked.value && (f as any).italic !== true) return false
    return true
  })
}

const filterFonts = async () => {
  
  // local filter
  const local = fontStore.searchFonts(searchQuery.value)
  filteredFonts.value = applyLocalStyleFilters(local)
  
  // remote search whenever query is not empty
  remoteSearchResults.value = []
  try {
    isSearching.value = true
    const response = await searchFonts({
      pageNum: 1,
      pageSize: 20,
      name: searchQuery.value,
      type: props.type,
      isMonospace: monospaceChecked.value ? 1 : undefined,
      italic: italicChecked.value ? 1 : undefined,
      onlyApprovedActive: true
    })
    const list = (response.data?.list ?? []) as DesignFontVO[]
    
    const localValues = new Set(fontStore.allFonts.map((f: FontOption) => f.value))
    const serverList = list.filter((font: DesignFontVO) => {
      const val = font.slug
      return !!val && !localValues.has(val)
    })
    // load fonts (register FontFace) before presenting results
    try {
      await Promise.all(
        serverList.map((font: DesignFontVO) => {
          font?.slug ? fontStore.loadFont(font.slug, font?.ttfFile?.url) : Promise.resolve(true)
        })
      )
    } catch (e) {
      // ignore individual font load failures
      console.warn('Some remote fonts failed to load for preview', e)
    }
    const remoteFonts = serverList.map((font: DesignFontVO) => {
      const label = font.fullName || font.family
      const family = font.family || font.fullName
      const value = font.slug || family
      const isMonospace = (font?.isMonospace === 1)
      const italic = (font?.italic === 1)
      return { label, value, family, isMonospace, italic } as FontItem
    })
    // Apply the same local style filters to remote results
    remoteSearchResults.value = applyLocalStyleFilters(remoteFonts)
  } catch (error) {
    console.error('Remote font search error:', error)
    messageStore.error('Remote search failed')
  } finally {
    isSearching.value = false
  }
}

const groupByFamily = (fonts: FontItem[]) => {
  const groups = new Map<string, FontItem[]>()
  fonts.forEach((font) => {
    if (!groups.has(font.family)) {
      groups.set(font.family, [])
    }
    groups.get(font.family)!.push(font)
  })
  return Array.from(groups.entries()).map(([family, fonts]) => ({ family, fonts }))
}

const handleSelect = (font: FontItem) => {
  emit('select', font)
}
</script>

<style scoped>
.search-container {
  padding: 16px;
  border-bottom: 1px solid #eee;
}
.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
}
.search-input:focus {
  border-color: #409eff;
}
.filters {
  margin-top: 8px;
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: nowrap;
  white-space: nowrap;
  overflow-x: auto;
}
.filter-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}
.section-header {
  padding: 12px;
  font-size: 13px;
  color: #333;
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
.arrow.expanded { transform: rotate(90deg); }
.section-content { padding: 8px 0; }
.family-name {
  font-size: 12px;
  color: #909399;
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #eee;
}
.font-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.font-item:hover { background: #f5f7fa; }
.font-item.active { background: #ecf5ff; color: #409eff; }
.preview-text { font-size: 18px; color: #333; }
.no-results { padding: 24px; text-align: center; color: #909399; font-size: 14px; }
.search-loading {
  padding: 20px;
  text-align: center;
  color: #909399;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.search-loading .el-icon { font-size: 16px; color: #409EFF; }

/* open library link (subtle, right-aligned) */
.open-library-anchor {
  margin-left: auto;
  font-size: 12px;
  color: #409eff;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
}
.open-library-anchor:hover { color: #606266; text-decoration: underline; }

/* active filter chips */
.active-chips {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 4px;
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 12px;
  line-height: 1.6;
  color: #409eff;
  background: #ecf5ff;
  border: 1px solid #c6e2ff;
  border-radius: 999px;
  white-space: nowrap;
}
</style>
