<template>
  <div class="bitmap-font-list" @scroll="onScroll">
    <div
      v-for="font in fonts"
      :key="font.id"
      class="bitmap-font-item"
      :class="{ active: font.id === activeId }"
    >
      <div class="actions">
        <el-tooltip :content="isFavoriteFont(font) ? t('font.removeFavorite') : t('font.addFavorite')" placement="top">
          <button
            type="button"
            class="bitmap-icon-btn bitmap-icon-btn-favorite"
            :class="{ favorited: isFavoriteFont(font) }"
            :aria-label="isFavoriteFont(font) ? t('font.removeFavorite') : t('font.addFavorite')"
            @click.stop="() => emit('favorite-toggle', font)"
          >
            <el-icon>
              <StarFilled v-if="isFavoriteFont(font)" />
              <Star v-else />
            </el-icon>
          </button>
        </el-tooltip>
        <el-tooltip v-if="canEdit(font)" :content="t('common.edit')" placement="top">
          <button
            type="button"
            class="bitmap-icon-btn bitmap-icon-btn-edit"
            :aria-label="t('common.edit')"
            @click.stop="() => emit('edit', font)"
          >
            <el-icon><Edit /></el-icon>
          </button>
        </el-tooltip>
        <el-tooltip :content="t('common.download')" placement="top">
          <button
            type="button"
            class="bitmap-icon-btn bitmap-icon-btn-download"
            :disabled="downloadingId != null"
            :aria-label="t('common.download')"
            @click.stop="() => emit('download', font)"
          >
            <el-icon><Download /></el-icon>
          </button>
        </el-tooltip>
        <el-tooltip v-if="canDelete(font)" :content="t('font.deleteFont')" placement="top">
          <button
            type="button"
            class="bitmap-icon-btn bitmap-icon-btn-delete"
            :disabled="deletingId === font.id"
            :aria-label="t('font.deleteFont')"
            @click.stop="() => emit('delete', font)"
          >
            <el-icon><Delete /></el-icon>
          </button>
        </el-tooltip>
      </div>
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
    </div>

    <div v-if="!fonts.length" class="bitmap-font-empty">
      {{ t('font.noBitmapFonts') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Delete, Download, Edit, Star, StarFilled } from '@element-plus/icons-vue'
import type { BitmapFontVO, BitmapFontAssetRelationVO } from '@/api/wristo/bitmapFont'
import { listBitmapFontChars } from '@/api/wristo/bitmapFont'
import { useUserStore } from '@/stores/user'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  fonts: BitmapFontVO[]
  activeId: number | null
  pageNum: number
  pageSize: number
  total: number
  downloadingId?: number | null
  deletingId?: number | null
}>()

const emit = defineEmits<{
  (e: 'select', font: BitmapFontVO): void
  (e: 'edit', font: BitmapFontVO): void
  (e: 'download', font: BitmapFontVO): void
  (e: 'delete', font: BitmapFontVO): void
  (e: 'favorite-toggle', font: BitmapFontVO): void
  (e: 'page-change', page: number): void
}>()

// 需要展示的字符顺序：0-9 和 ':'
const DIGIT_ORDER = ['0','1','2','3','4','5','6','7','8','9',':'] as const

// 每个字体 id 对应的字符图片 url 映射，例如 { 1: { '0': 'url0', '1': 'url1', ... } }
const glyphMap = ref<Record<number, Record<string, string>>>({})
const loadingMap = ref<Record<number, boolean>>({})
const loadingNextPage = ref(false)

const userStore = useUserStore()
const currentUserId = computed(() => userStore.userInfo?.id as number | undefined)
const isAdmin = computed(() => {
  const roles = userStore.userInfo?.roles || []
  return roles.some((role: any) => role.roleCode === 'ROLE_ADMIN')
})

const canEdit = (font: BitmapFontVO) => {
  const uid = currentUserId.value
  if (!uid) return false
  // 拥有者 或 管理员 均可编辑
  if (font.userId === uid) return true
  if (isAdmin.value) return true
  return false
}

const canDelete = (font: BitmapFontVO) => {
  const uid = currentUserId.value
  if (!uid) return false
  if (isAdmin.value) return true
  return font.userId === uid
}

const isFavoriteFont = (font: BitmapFontVO) => {
  return font.favoriteWeight != null
}

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

// 滚动到底部时自动加载下一页
const onScroll = (e: Event) => {
  const target = e.target as HTMLElement | null
  if (!target) return

  const { scrollTop, clientHeight, scrollHeight } = target
  const distanceToBottom = scrollHeight - (scrollTop + clientHeight)

  const hasMore = props.pageNum * props.pageSize < props.total
  if (!hasMore || loadingNextPage.value) return

  // 距离底部 40px 以内触发加载下一页
  if (distanceToBottom <= 40) {
    loadingNextPage.value = true
    const nextPage = props.pageNum + 1
    emit('page-change', nextPage)
    // 父组件加载完成会重新渲染列表，这里简单延迟重置，避免频繁触发
    setTimeout(() => {
      loadingNextPage.value = false
    }, 300)
  }
}
</script>

<style scoped>
.bitmap-font-list {
  margin-top: 8px;
  border-top: 1px solid var(--studio-border);
  padding-top: 8px;
  max-height: 660px;
  overflow-y: auto;
}

.bitmap-font-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 82px;
  padding: 2px 4px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.58)),
    var(--studio-surface);
  box-shadow: var(--studio-shadow-sm);
  cursor: pointer;
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.bitmap-font-item + .bitmap-font-item {
  margin-top: 8px;
}

:root[data-studio-theme='dark'] .bitmap-font-item {
  background:
    linear-gradient(180deg, rgba(30, 41, 59, 0.78), rgba(15, 23, 42, 0.42)),
    var(--studio-surface);
}

.bitmap-font-item:hover {
  border-color: var(--studio-primary-border);
  box-shadow: var(--studio-shadow-md);
  transform: translateY(-1px);
}

.bitmap-font-item.active {
  box-shadow: 0 0 0 1px var(--studio-primary) inset;
}

.info {
  width: 100%;
  min-width: 0;
  min-height: 100%;
}

.name {
  min-width: 0;
  max-width: 100%;
  padding-right: 112px;
  font-size: 12px;
  font-weight: 600;
  line-height: 22px;
  color: var(--studio-text-subtle);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  margin-top: 2px;
  display: flex;
  gap: 6px;
  font-size: 11px;
  color: var(--studio-text-subtle);
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
  background: var(--studio-surface-soft);
  overflow: hidden;
}

.glyph-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.glyph-placeholder {
  font-size: 11px;
  color: var(--studio-text-subtle);
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--studio-surface-soft);
}

.tag.default {
  background: var(--studio-primary-soft);
  color: var(--studio-primary);
}

.tag.version {
  background: var(--el-color-success-light-9);
  color: var(--color-success);
}

.actions {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.bitmap-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--studio-border);
  border-radius: 6px;
  background: transparent;
  box-shadow: none;
  font-size: 13px;
  opacity: 0.72;
  cursor: pointer;
  transition: border-color 160ms ease, color 160ms ease, opacity 160ms ease, transform 160ms ease;
}

.bitmap-icon-btn-edit,
.bitmap-icon-btn-favorite,
.bitmap-icon-btn-download {
  color: var(--studio-primary);
}

.bitmap-icon-btn-delete {
  color: var(--color-danger);
}

.bitmap-icon-btn-favorite.favorited {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.34);
  background: rgba(245, 158, 11, 0.1);
  opacity: 1;
}

.bitmap-icon-btn:hover:not(:disabled) {
  border-color: var(--studio-primary-border);
  opacity: 1;
  transform: translateY(-1px);
}

.bitmap-icon-btn:active:not(:disabled) {
  transform: translateY(0);
}

.bitmap-icon-btn:disabled {
  cursor: progress;
  opacity: 0.38;
}

.bitmap-font-empty {
  padding: 12px 4px;
  font-size: 12px;
  color: var(--studio-text-subtle);
  text-align: center;
}

.bitmap-font-pager {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--studio-border);
  display: flex;
  justify-content: center;
}

@media (prefers-reduced-motion: reduce) {
  .bitmap-font-item,
  .bitmap-icon-btn {
    transition: none;
  }

  .bitmap-font-item:hover,
  .bitmap-icon-btn:hover:not(:disabled) {
    transform: none;
  }
}
</style>
