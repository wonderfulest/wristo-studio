<template>
  <div class="font-picker">
    <!-- Current selected bitmap font preview -->
    <div class="font-preview" @click="togglePanel">
      <span class="font-name">{{ selectedFontLabel }}</span>
    </div>

    <!-- Bitmap font selection panel -->
    <div v-if="isOpen" class="font-panel">
      <!-- Add bitmap font button -->
      <button class="add-font-btn" type="button" @click.stop.prevent="openNewBitmapFont">Add Bitmap Font</button>
      <!-- Bitmap font list -->
      <BitmapFontList
        :fonts="bitmapFonts"
        :active-id="props.modelValue"
        :page-num="pageNum"
        :page-size="pageSize"
        :total="bitmapTotal"
        @select="handleSelectBitmapFont"
        @edit="handleEditBitmapFont"
        @page-change="handleBitmapPageChange"
      />
    </div>
    <!-- Bitmap font setting dialog (DIGIT 0-9) -->
    <BitmapDigitDialog
      v-model="bitmapDialogVisible"
      :rows="digitRows"
      :symbol-rows="symbolRows"
      @reset-row="handleResetRowByIndex"
      @upload-row="handleUploadRow"
      @confirm="confirmBitmapDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useFontStore } from '@/stores/fontStore'
import { useUserStore } from '@/stores/user'
import { getFontBySlug, getSystemFonts, increaseFontUsage } from '@/api/wristo/fonts'
import { createBitmapFont, updateBitmapFont, listBitmapFontChars, bindBitmapFontAsset, unbindBitmapFontAsset, type BitmapFontAssetRelationVO, type BitmapFontVO } from '@/api/wristo/bitmapFont'
import type { FontItem } from '@/types/font-picker'
import BitmapDigitDialog, { type DigitRowState } from '@/components/font-picker/BitmapDigitDialog.vue'
import BitmapFontList from '@/components/font-picker/BitmapFontList.vue'
import { useBitmapFontStore } from '@/stores/bitmapFontStore'

const BITMAP_FONT_TYPE = 'bitmap_font'

const props = defineProps({
  // bitmapFontId
  modelValue: {
    type: Number,
    required: false,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'change'])
const fontStore = useFontStore()
const userStore = useUserStore()

const bitmapType = BITMAP_FONT_TYPE

const isOpen = ref<boolean>(false)
// 旧的字体上传弹框暂时不用
const dialogVisible = ref<boolean>(false)

// bitmap font setting dialog state
const bitmapDialogVisible = ref(false)
const activeTab = ref<'digit' | 'symbol' | 'other' | 'custom'>('digit')
const currentFontName = ref<string>('')
const isTempRandFont = ref<boolean>(false)
type BitmapRow = {
  // 字符值：'0'-'9' 或 ':' 等
  index: string
  hasValue: boolean
  relationId?: number
  imageUrl?: string
}

// 内部存储 DIGIT 行，index '0'-'9'
const rows = ref<BitmapRow[]>(Array.from({ length: 10 }, (_, i) => ({ index: String(i), hasValue: false })))
// SYMBOL 行，目前只支持 ':'
const symbolRowList = ref<BitmapRow[]>([{ index: ':', hasValue: false }])

// bitmap font list state from store
const bitmapFontStore = useBitmapFontStore()
const bitmapFonts = computed<BitmapFontVO[]>(() => bitmapFontStore.fonts)
const pageNum = computed(() => bitmapFontStore.pageNum)
const pageSize = computed(() => bitmapFontStore.pageSize)
const bitmapTotal = computed(() => bitmapFontStore.total)

type SectionName = 'recent' | 'condensed' | 'sans-serif' | 'fixed' | 'serif' | 'lcd' | 'icon' | 'custom'

const digitRows = computed<DigitRowState[]>(() => rows.value.map(r => ({ index: r.index, imageUrl: r.imageUrl })))
const symbolRows = computed<DigitRowState[]>(() => symbolRowList.value.map(r => ({ index: r.index, imageUrl: r.imageUrl })))
// bitmap 字体的显示名称：优先使用当前字体名，其次从列表中查找，最后才 fallback 到占位
const selectedFontLabel = computed(() => {
  const id = props.modelValue
  if (!id) return 'Select Bitmap Font'
  if (currentFontName.value) return currentFontName.value
  const hit = bitmapFonts.value.find(f => f.id === id)
  return hit?.fontName || `Bitmap Font #${id}`
})

const togglePanel = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value && bitmapFonts.value.length === 0) {
    bitmapFontStore.loadFromSession()
    if (!bitmapFontStore.fonts.length) {
      void bitmapFontStore.loadPage(1)
    }
  }
}

// 新建 bitmap 字体并打开编辑弹框
const openNewBitmapFont = async () => {
  bitmapDialogVisible.value = true
  try {
    const randName = `rand_${Math.random().toString(36).slice(2, 8)}`
    const res = await createBitmapFont({ fontName: randName, isDefault: 0 })
    const font = res.data as BitmapFontVO
    if (font?.id) {
      isTempRandFont.value = typeof font.fontName === 'string' && font.fontName.startsWith('rand_')
      currentFontName.value = font.fontName
      emit('update:modelValue', font.id)
      emit('change', font.id)
      // 清空本地 digit 行状态，确保是全新字体
      rows.value = rows.value.map(row => ({ index: row.index, hasValue: false }))
      await loadBitmapRows(font.id)
      // 新建后刷新列表以便展示新字体
      void bitmapFontStore.loadPage(1)
      // 新建后清理 session 缓存，确保后续列表从最新数据加载
      bitmapFontStore.clearSession()
    }
  } catch (e) {
    console.warn('create bitmap font failed', e)
  }
}

// 打开已有 bitmap 字体的编辑弹框（由 Edit 触发）
const openBitmapDialog = async (fontId?: number) => {
  const id = fontId ?? props.modelValue
  if (!id) return
  bitmapDialogVisible.value = true
  await loadBitmapRows(id)
}

const closeBitmapDialog = () => {
  bitmapDialogVisible.value = false
}

const confirmBitmapDialog = async () => {
  try {
    // 如果是自动创建的 rand_ 前缀名字，引导用户修改名字
    if (props.modelValue && isTempRandFont.value) {
      const { value } = await ElMessageBox.prompt(
        'Please rename this bitmap font',
        'Rename Bitmap Font',
        {
          inputValue: currentFontName.value || '',
          inputPlaceholder: 'Enter font name',
        },
      )
      const newName = String(value || '').trim()
      if (newName && newName !== currentFontName.value) {
        try {
          await updateBitmapFont({ id: props.modelValue as number, fontName: newName })
          currentFontName.value = newName
        } catch (e) {
          console.warn('update bitmap font name failed', e)
        }
      }
      isTempRandFont.value = false
    }
  } catch {
    // 用户取消重命名则保持原名
  } finally {
    bitmapDialogVisible.value = false
    // 每次点击 OK 结束编辑后，清理 bitmap 字体缓存
    bitmapFontStore.clearSession()
    // 并重新加载列表，确保 UI 展示的是最新的 bitmap 字体信息
    void bitmapFontStore.loadPage(1)
  }
}

const toggleSection = (section: SectionName | string) => {
  fontStore.toggleSection(section)
}

const onDesignerScroll = () => {
  if (fontStore.expandedSections?.recent) {
    fontStore.toggleSection('recent')
  }
}

// 从后端加载 bitmap 字体的字符绑定，映射到 DIGIT 0-9 和 SYMBOL ':'
const loadBitmapRows = async (fontId: number) => {
  try {
    const res = await listBitmapFontChars(fontId)
    const list = (res.data || []) as BitmapFontAssetRelationVO[]
    const digitMap = new Map<string, BitmapFontAssetRelationVO>()
    const symbolMap = new Map<string, BitmapFontAssetRelationVO>()

    list.forEach(r => {
      if (typeof r.charValue !== 'string') return
      if (r.charType === 'digital') {
        digitMap.set(r.charValue, r)
      } else if (r.charType === 'symbol') {
        symbolMap.set(r.charValue, r)
      }
    })

    // digits '0'-'9'
    rows.value = rows.value.map(row => {
      const rel = digitMap.get(row.index)
      if (!rel) {
        return { index: row.index, hasValue: false }
      }
      return {
        index: row.index,
        hasValue: true,
        relationId: rel.id,
        imageUrl: rel.image?.previewUrl || rel.image?.url,
      }
    })

    // symbol ':'
    symbolRowList.value = symbolRowList.value.map(row => {
      const rel = symbolMap.get(row.index)
      if (!rel) {
        return { index: row.index, hasValue: false }
      }
      return {
        index: row.index,
        hasValue: true,
        relationId: rel.id,
        imageUrl: rel.image?.previewUrl || rel.image?.url,
      }
    })
  } catch (e) {
    console.warn('load bitmap font chars failed', e)
  }
}

const handleBitmapPageChange = async (page: number) => {
  await bitmapFontStore.loadPage(page)
}

const handleSelectBitmapFont = async (font: BitmapFontVO) => {
  if (!font?.id) return
  emit('update:modelValue', font.id)
  emit('change', font.id)
   currentFontName.value = font.fontName
  await loadBitmapRows(font.id)
}

const handleEditBitmapFont = async (font: BitmapFontVO) => {
  if (!font?.id) return
  emit('update:modelValue', font.id)
  emit('change', font.id)
  currentFontName.value = font.fontName
  isTempRandFont.value = typeof font.fontName === 'string' && font.fontName.startsWith('rand_')
  // 直接使用当前点击的字体 id，避免依赖父组件异步更新后的 props.modelValue 造成一次延迟
  await openBitmapDialog(font.id)
}

const ensureFontBySlug = async (slug: string, family: string) => {
  try {
    if (document.fonts && (document as any).fonts.check && (document as any).fonts.check(`12px ${family}`)) return
    let url = ''
    try {
      const by = await getFontBySlug(slug)
      url = by?.data?.ttfFile?.url || ''
    } catch {}
    if (!url) {
      try {
        const sys = await getSystemFonts(undefined, userStore.userInfo?.id)
        const hit = (sys.data || []).find((f: any) => f.slug === slug)
        url = hit?.ttfFile?.url || ''
      } catch {}
    }
    if (!url) return
    const ttfUrl = url.startsWith('http') ? url : `${location.origin}${url.startsWith('/') ? '' : '/'}${url}`
    await fontStore.loadFont(slug, ttfUrl)
  } catch {}
}

const selectFont = async (font: FontItem) => {
  await ensureFontBySlug(font.value, font.family)
  emit('update:modelValue', font.value)
  emit('change', font.value)
  try {
    await increaseFontUsage(font.value, userStore.userInfo?.id)
  } catch {}
  fontStore.addRecentFont(font)
  isOpen.value = false
}

const onFontUploaded = async (slug: string) => {
  emit('update:modelValue', slug)
  emit('change', slug)
  isOpen.value = false
}

const addCustomFont = () => {
  dialogVisible.value = true
}

const handleResetRowByIndex = async (index: string) => {
  // 先在 digit 中找
  let row = rows.value.find(r => r.index === index)
  if (!row) {
    row = symbolRowList.value.find(r => r.index === index)
  }
  if (!row || !row.relationId) return
  try {
    await unbindBitmapFontAsset(row.relationId)
    row.hasValue = false
    row.relationId = undefined
    row.imageUrl = undefined
  } catch (e) {
    console.warn('unbind bitmap font asset failed', e)
  } finally {
    // 删除某个 glyph 后，同步清理缓存
    bitmapFontStore.clearSession()
  }
}

const handleUploadRow = async (payload: { index: string; file: File; previewUrl: string }) => {
  if (!props.modelValue) return
  try {
    const isSymbol = payload.index === ':'
    await bindBitmapFontAsset({
      file: payload.file,
      fontId: props.modelValue,
      charType: isSymbol ? 'symbol' : 'digital',
      charValue: payload.index,
    })
    // 绑定成功后重新加载该字体的行数据
    await loadBitmapRows(props.modelValue)
  } catch (e) {
    console.warn('bind bitmap font asset failed', e)
  } finally {
    // 上传/绑定 glyph 后，同步清理缓存
    bitmapFontStore.clearSession()
  }
}

const handleOutsideClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target?.closest?.('.font-picker')) {
    isOpen.value = false
  }
}

onMounted(async () => {
  await fontStore.fetchFonts()
  try {
    await Promise.all([
      fontStore.initBuiltinFontsFromSystem(bitmapType),
      fontStore.initRecentFonts(bitmapType),
    ])
  } catch {}
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>


<style scoped>
.font-picker {
  position: relative;
  width: 100%;
}

.font-preview {
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  background: white;
  display: flex;
  gap: 12px;
  align-items: center;
}

.font-preview:hover {
  border-color: #409eff;
}

.font-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.font-name {
  font-size: 13px;
  color: #666;
}

.preview-text {
  font-size: 18px;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-text-icon {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.add-font-btn {
  width: 100%;
  padding: 12px;
  border: none;
  background: none;
  color: #409eff;
  font-size: 14px;
  cursor: pointer;
  border-top: 1px solid #eee;
}

.add-font-btn:hover {
  background: #f5f7fa;
}

.icon-lib-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  font-size: 13px;
  color: #606266;
}

/* solid divider between sections (thicker with subtle pattern) */
.section-divider {
  width: 100%;
  height: 6px; /* thicker */
  border-radius: 4px;
  margin: 12px 0; /* more spacing */
  background: repeating-linear-gradient(
    135deg,
    #e5e7eb 0px,
    #e5e7eb 8px,
    #f3f4f6 8px,
    #f3f4f6 16px
  );
  box-shadow: inset 0 0 0 1px #e5e7eb; /* crisp border */
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.font-upload {
  margin: 16px 0;
  display: flex;
  justify-content: center;
}

.font-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.font-upload-area {
  width: 100%;
}

:deep(.el-upload-dragger) {
  width: 100%;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.upload-icon {
  font-size: 48px;
  color: #409EFF;
}

.upload-text {
  text-align: center;
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

.font-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.file-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.remove-btn {
  padding: 2px;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-label {
  font-size: 14px;
  color: #666;
}

.font-preview {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 16px;
}

.preview-section .preview-text {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  font-size: 16px;
}

.preview-numbers {
  font-size: 24px;
  color: #409EFF;
}

.preview-letters {
  font-size: 20px;
  color: #333;
}

.preview-chinese {
  font-size: 18px;
  color: #666;
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .form-item label {
    color: #e0e0e0;
  }

  .form-tip {
    color: #888;
  }

  .font-preview {
    border-color: #444;
    background: #2a2a2a;
    color: #e0e0e0;
  }

  .font-info {
    background: #2a2a2a;
  }

  .file-name {
    color: #e0e0e0;
  }

  .preview-label {
    color: #e0e0e0;
  }

  .font-preview {
    background: #1a1a1a;
    border-color: #444;
  }

  .preview-letters {
    color: #e0e0e0;
  }

  .preview-chinese {
    color: #bbb;
  }

  .upload-tip {
    color: #888;
  }

  .section-divider {
    background: repeating-linear-gradient(
      135deg,
      #343434 0px,
      #343434 8px,
      #2a2a2a 8px,
      #2a2a2a 16px
    );
    box-shadow: inset 0 0 0 1px #3a3a3a;
  }
}

</style>
