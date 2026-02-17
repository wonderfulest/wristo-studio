<template>
  <div class="bitmap-font-list">
    <div
      v-for="font in fonts"
      :key="font.id"
      class="bitmap-font-item"
      :class="{ active: font.id === activeId }"
    >
      <div class="info" @click="() => emit('select', font)">
        <div class="name">{{ font.fontName }}</div>
        <!-- glyph preview: 0-9 and ':' -->
        <div class="glyph-preview" v-if="font.id && glyphMap[font.id]">
          <div
            v-for="ch in DIGIT_ORDER"
            :key="ch"
            class="glyph-cell"
          >
            <img
              v-if="getGlyphUrl(font.id, ch)"
              :src="getGlyphUrl(font.id, ch)"
              class="glyph-img"
              :alt="`${font.fontName} ${ch}`"
            />
            <span v-else class="glyph-placeholder">{{ ch }}</span>
          </div>
        </div>
      </div>
      <div class="actions">
        <el-button type="text" size="small" @click.stop="() => emit('edit', font)">
          Edit
        </el-button>
      </div>
    </div>

    <div v-if="!fonts.length" class="bitmap-font-empty">
      No bitmap fonts yet.
    </div>

    <div v-if="total > pageSize" class="bitmap-font-pager">
      <el-pagination
        background
        layout="prev, pager, next"
        :current-page="pageNum"
        :page-size="pageSize"
        :total="total"
        small
        @current-change="(p:number) => emit('page-change', p)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { BitmapFontVO, BitmapFontAssetRelationVO } from '@/api/wristo/bitmapFont'
import { listBitmapFontChars } from '@/api/wristo/bitmapFont'

const props = defineProps<{
  fonts: BitmapFontVO[]
  activeId: number | null
  pageNum: number
  pageSize: number
  total: number
}>()

const emit = defineEmits<{
  (e: 'select', font: BitmapFontVO): void
  (e: 'edit', font: BitmapFontVO): void
  (e: 'page-change', page: number): void
}>()

// 需要展示的字符顺序：0-9 和 ':'
const DIGIT_ORDER = ['0','1','2','3','4','5','6','7','8','9',':'] as const

// 每个字体 id 对应的字符图片 url 映射，例如 { 1: { '0': 'url0', '1': 'url1', ... } }
const glyphMap = ref<Record<number, Record<string, string>>>({})
const loadingMap = ref<Record<number, boolean>>({})

const loadGlyphsForFont = async (fontId: number) => {
  if (!fontId) return
  if (glyphMap.value[fontId] || loadingMap.value[fontId]) return
  loadingMap.value[fontId] = true
  try {
    const res = await listBitmapFontChars(fontId)
    const list = (res.data || []) as BitmapFontAssetRelationVO[]
    const charMap: Record<string, string> = {}
    list.forEach((r) => {
      if (typeof r.charValue !== 'string') return
      if (!DIGIT_ORDER.includes(r.charValue as any)) return
      const img = (r as any).image
      const url = img?.previewUrl || img?.url
      if (url) {
        charMap[r.charValue] = url
      }
    })
    glyphMap.value = { ...glyphMap.value, [fontId]: charMap }
  } catch (e) {
    // 忽略单个字体加载失败
  } finally {
    loadingMap.value[fontId] = false
  }
}

// 当列表字体变化时，为当前页字体预加载字符图片
watch(
  () => props.fonts,
  (fonts) => {
    (fonts || []).forEach((f) => {
      if (f?.id) {
        void loadGlyphsForFont(f.id)
      }
    })
  },
  { immediate: true },
)

const getGlyphUrl = (fontId: number, ch: string) => glyphMap.value[fontId]?.[ch]
</script>

<style scoped>
.bitmap-font-list {
  margin-top: 8px;
  border-top: 1px solid #ebeef5;
  padding-top: 8px;
  max-height: 260px;
  overflow-y: auto;
}

.bitmap-font-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.bitmap-font-item:hover {
  background: #f5f7fa;
}

.bitmap-font-item.active {
  background: #ecf5ff;
  box-shadow: 0 0 0 1px #409eff inset;
}

.info {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  margin-top: 2px;
  display: flex;
  gap: 6px;
  font-size: 11px;
  color: #909399;
}

.glyph-preview {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.glyph-cell {
  width: 18px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  background: #f5f7fa;
  overflow: hidden;
}

.glyph-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.glyph-placeholder {
  font-size: 11px;
  color: #c0c4cc;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 999px;
  background: #f4f4f5;
}

.tag.default {
  background: #ecf5ff;
  color: #409eff;
}

.tag.version {
  background: #f0f9eb;
  color: #67c23a;
}

.actions {
  margin-left: 8px;
}

.bitmap-font-empty {
  padding: 12px 4px;
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.bitmap-font-pager {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: center;
}
</style>
