<template>
  <div class="font-picker">
    <!-- Current selected bitmap font preview -->
    <div class="font-preview" @click="togglePanel">
      <span class="font-name">{{ selectedFontLabel }}</span>
    </div>

    <!-- Bitmap font selection panel -->
    <div v-if="isOpen" class="font-panel">
      <!-- Add bitmap font button -->
      <div v-if="canUsePremiumAssets" class="font-panel-toolbar">
        <button class="add-font-btn" type="button" @click.stop.prevent="openNewBitmapFont">{{ t('font.addBitmapFont') }}</button>
        <el-segmented
          v-if="canViewAllBitmapFonts"
          v-model="fontScope"
          class="font-scope-toggle"
          :options="fontScopeOptions"
          size="small"
        />
      </div>
      <!-- Bitmap font list -->
      <BitmapFontList
        v-if="canUsePremiumAssets"
        :fonts="bitmapFonts"
        :active-id="props.modelValue"
        :page-num="pageNum"
        :page-size="pageSize"
        :total="bitmapTotal"
        :downloading-id="downloadingFontId"
        :deleting-id="deletingFontId"
        @select="handleSelectBitmapFont"
        @edit="handleEditBitmapFont"
        @download="handleDownloadBitmapFont"
        @delete="handleDeleteBitmapFont"
        @favorite-toggle="handleToggleBitmapFontFavorite"
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
      @upload-rows="handleUploadRows"
      @confirm="confirmBitmapDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import JSZip from 'jszip'
import { useFontStore } from '@/stores/fontStore'
import { useUserStore } from '@/stores/user'
import { useStudioMembershipGate } from '@/composables/useStudioMembershipGate'
import { createBitmapFont, updateBitmapFont, listBitmapFontChars, bindBitmapFontAsset, unbindBitmapFontAsset, favoriteBitmapFont, unfavoriteBitmapFont, removeBitmapFont, type BitmapFontAssetRelationVO, type BitmapFontVO } from '@/api/wristo/bitmapFont'
import BitmapDigitDialog, { type DigitRowState } from '@/components/font-picker/BitmapDigitDialog.vue'
import BitmapFontList from '@/components/font-picker/BitmapFontList.vue'
import { useBitmapFontStore } from '@/stores/bitmapFontStore'
import { useI18n } from '@/i18n'
import { invalidateBitmapTimeFontCache } from '@/elements/time/time/time.renderer'
import emitter from '@/utils/eventBus'

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
const membershipGate = useStudioMembershipGate()
const { t } = useI18n()

const bitmapType = BITMAP_FONT_TYPE

const isOpen = ref<boolean>(false)
const fontScope = ref<'mine' | 'all'>('mine')
const settingsPopupId = `bitmap-font-picker_${Date.now()}_${Math.random().toString(36).slice(2)}`

// bitmap font setting dialog state
const bitmapDialogVisible = ref(false)
const currentFontName = ref<string>('')
const isTempRandFont = ref<boolean>(false)
const downloadingFontId = ref<number | null>(null)
const deletingFontId = ref<number | null>(null)
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
const canUsePremiumAssets = computed(() => userStore.canUsePremiumStudioAssets)
const canViewAllBitmapFonts = computed(() => userStore.isMerchantUser || userStore.isAdminUser)
const includeAllUsers = computed(() => canViewAllBitmapFonts.value === true && fontScope.value === 'all')
const fontScopeOptions = computed(() => [
  { label: t('font.scopeMine'), value: 'mine' },
  { label: t('font.scopeAll'), value: 'all' },
])

const digitRows = computed<DigitRowState[]>(() => rows.value.map(r => ({ index: r.index, imageUrl: r.imageUrl })))
const symbolRows = computed<DigitRowState[]>(() => symbolRowList.value.map(r => ({ index: r.index, imageUrl: r.imageUrl })))
// bitmap 字体的显示名称：优先使用当前字体名，其次从列表中查找，最后才 fallback 到占位
const selectedFontLabel = computed(() => {
  const id = props.modelValue
  if (!id) return t('font.selectBitmapFont')
  if (currentFontName.value) return currentFontName.value
  const hit = bitmapFonts.value.find(f => f.id === id)
  return hit?.fontName || `Bitmap Font #${id}`
})

const togglePanel = () => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('font.premiumAssetRequired')
    return
  }
  isOpen.value = !isOpen.value
  if (isOpen.value && bitmapFonts.value.length === 0) {
    emitter.emit('settings-popup-open', settingsPopupId)
    bitmapFontStore.loadFromSession()
    if (!bitmapFontStore.fonts.length) {
      void bitmapFontStore.loadPage(1, undefined, includeAllUsers.value)
    }
  } else if (isOpen.value) {
    emitter.emit('settings-popup-open', settingsPopupId)
  }
}

// 新建 bitmap 字体并打开编辑弹框
const openNewBitmapFont = async () => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('font.uploadRequiresPremium')
    return
  }
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
      void bitmapFontStore.loadPage(1, undefined, includeAllUsers.value)
      // 新建后清理 session 缓存，确保后续列表从最新数据加载
      bitmapFontStore.clearSession()
    }
  } catch (e) {
    console.warn('create bitmap font failed', e)
  }
}

// 打开已有 bitmap 字体的编辑弹框（由 Edit 触发）
const openBitmapDialog = async (fontId?: number) => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('font.premiumAssetRequired')
    return
  }
  const id = fontId ?? props.modelValue
  if (!id) return
  bitmapDialogVisible.value = true
  await loadBitmapRows(id)
}

const confirmBitmapDialog = async () => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('font.premiumAssetRequired')
    bitmapDialogVisible.value = false
    return
  }
  try {
    // 如果是自动创建的 rand_ 前缀名字，引导用户修改名字
    if (props.modelValue && isTempRandFont.value) {
      const { value } = await ElMessageBox.prompt(
        t('font.renameBitmapPrompt'),
        t('font.renameBitmapTitle'),
        {
          inputValue: currentFontName.value || '',
          inputPlaceholder: t('font.enterFontName'),
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
    void bitmapFontStore.loadPage(1, undefined, includeAllUsers.value)
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
  await bitmapFontStore.loadPage(page, undefined, includeAllUsers.value)
}

const handleSelectBitmapFont = async (font: BitmapFontVO) => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('font.premiumAssetRequired')
    return
  }
  if (!font?.id) return
  invalidateBitmapTimeFontCache(font.id)
  emit('update:modelValue', font.id)
  emit('change', font.id)
  currentFontName.value = font.fontName
  await loadBitmapRows(font.id)
}

const handleEditBitmapFont = async (font: BitmapFontVO) => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('font.premiumAssetRequired')
    return
  }
  if (!font?.id) return
  invalidateBitmapTimeFontCache(font.id)
  emit('update:modelValue', font.id)
  emit('change', font.id)
  currentFontName.value = font.fontName
  isTempRandFont.value = typeof font.fontName === 'string' && font.fontName.startsWith('rand_')
  // 直接使用当前点击的字体 id，避免依赖父组件异步更新后的 props.modelValue 造成一次延迟
  await openBitmapDialog(font.id)
}

const sanitizeDownloadName = (name: string) => {
  return String(name || 'bitmap-font')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '') || 'bitmap-font'
}

const safeCharFileName = (charValue: string) => {
  if (charValue === ':') return 'colon'
  if (charValue === '/') return 'slash'
  if (charValue === '\\') return 'backslash'
  if (charValue === ' ') return 'space'
  const encoded = Array.from(charValue || '').map((char) => {
    if (/^[a-zA-Z0-9_-]$/.test(char)) return char
    return `u${char.codePointAt(0)?.toString(16).padStart(4, '0') || '0000'}`
  }).join('')
  return encoded || 'empty'
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const handleDownloadBitmapFont = async (font: BitmapFontVO) => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('font.premiumAssetRequired')
    return
  }
  if (!font?.id || downloadingFontId.value) return

  downloadingFontId.value = font.id
  try {
    const res = await listBitmapFontChars(font.id)
    const relations = ((res.data || []) as BitmapFontAssetRelationVO[])
      .filter(relation => relation.image?.url || relation.image?.previewUrl)

    if (!relations.length) {
      ElMessage.warning(t('font.noBitmapGlyphsToDownload'))
      return
    }

    const zip = new JSZip()
    const usedNames = new Set<string>()

    for (const relation of relations) {
      const url = relation.image?.url || relation.image?.previewUrl
      if (!url) continue
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch glyph ${relation.charValue}`)
      }
      const baseName = `${relation.charType || 'glyph'}-${safeCharFileName(relation.charValue)}`
      let fileName = `${baseName}.svg`
      if (usedNames.has(fileName)) {
        fileName = `${baseName}-${relation.id}.svg`
      }
      usedNames.add(fileName)
      zip.file(fileName, await response.blob())
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(blob, `${sanitizeDownloadName(font.fontName)}.zip`)
  } catch (e) {
    console.warn('download bitmap font failed', e)
    ElMessage.error(t('font.downloadBitmapFontFailed'))
  } finally {
    downloadingFontId.value = null
  }
}

const handleDeleteBitmapFont = async (font: BitmapFontVO) => {
  if (!font?.id || deletingFontId.value) return
  try {
    await ElMessageBox.confirm(
      t('font.deleteFontConfirm'),
      t('font.deleteFont'),
      {
        type: 'warning',
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
      },
    )
  } catch {
    return
  }

  deletingFontId.value = font.id
  try {
    const res = await removeBitmapFont(font.id)
    if (res.code === 0 && res.data) {
      if (props.modelValue === font.id) {
        invalidateBitmapTimeFontCache(font.id)
        emit('update:modelValue', null)
        emit('change', null)
        currentFontName.value = ''
        rows.value = rows.value.map(row => ({ index: row.index, hasValue: false }))
        symbolRowList.value = symbolRowList.value.map(row => ({ index: row.index, hasValue: false }))
      }
      bitmapFontStore.removeLocal(font.id)
      bitmapFontStore.clearSession()
      ElMessage.success(t('common.deleteSuccess'))
    } else {
      ElMessage.error(res.msg || t('common.deleteFailed'))
    }
  } catch (e) {
    console.warn('delete bitmap font failed', e)
    ElMessage.error(t('common.deleteFailed'))
  } finally {
    deletingFontId.value = null
  }
}

const handleToggleBitmapFontFavorite = async (font: BitmapFontVO) => {
  if (!font?.id) return
  try {
    const favorited = font.favoriteWeight != null
    const res = favorited
      ? await unfavoriteBitmapFont(font.id)
      : await favoriteBitmapFont(font.id)
    bitmapFontStore.updateFavorite(font.id, res.data?.favoriteWeight)
    bitmapFontStore.clearSession()
    await bitmapFontStore.loadPage(1, undefined, includeAllUsers.value)
  } catch (e) {
    console.warn('toggle bitmap font favorite failed', e)
    ElMessage.error(t('font.favoriteFailed'))
  }
}

const handleResetRowByIndex = async (index: string) => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('font.premiumAssetRequired')
    return
  }
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
    if (props.modelValue) {
      invalidateBitmapTimeFontCache(props.modelValue)
      emit('change', props.modelValue)
    }
  }
}

type BitmapUploadPayload = { index: string; file: File; previewUrl: string }

const bindBitmapGlyph = (payload: BitmapUploadPayload) => {
  const isSymbol = payload.index === ':'
  return bindBitmapFontAsset({
    file: payload.file,
    fontId: props.modelValue as number,
    charType: isSymbol ? 'symbol' : 'digital',
    charValue: payload.index,
  })
}

const finalizeBitmapGlyphUpload = async () => {
  if (props.modelValue) {
    await loadBitmapRows(props.modelValue)
  }
  bitmapFontStore.clearSession()
  invalidateBitmapTimeFontCache(props.modelValue)
  if (props.modelValue) {
    emit('change', props.modelValue)
  }
}

const handleUploadRow = async (payload: BitmapUploadPayload) => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('font.uploadRequiresPremium')
    return
  }
  if (!props.modelValue) return
  try {
    await bindBitmapGlyph(payload)
  } catch (e) {
    console.warn('bind bitmap font asset failed', e)
  } finally {
    // 上传/绑定 glyph 后，同步清理缓存
    await finalizeBitmapGlyphUpload()
  }
}

const handleUploadRows = async (payloads: BitmapUploadPayload[]) => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('font.uploadRequiresPremium')
    return
  }
  if (!props.modelValue || !payloads.length) return
  try {
    for (const payload of payloads) {
      await bindBitmapGlyph(payload)
    }
  } catch (e) {
    console.warn('bind bitmap font assets failed', e)
  } finally {
    // 批量上传后只重新加载一次，避免 11 个 glyph 连续刷新列表和缓存
    await finalizeBitmapGlyphUpload()
  }
}

const handleOutsideClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target?.closest?.('.font-picker')) {
    isOpen.value = false
  }
}

const handleSettingsPopupOpen = (id: unknown) => {
  if (String(id) !== settingsPopupId) {
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
  emitter.on('settings-popup-open', handleSettingsPopupOpen)
})

watch(includeAllUsers, async () => {
  bitmapFontStore.clearSession()
  if (isOpen.value) {
    await bitmapFontStore.loadPage(1, undefined, includeAllUsers.value)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
  emitter.off('settings-popup-open', handleSettingsPopupOpen)
})
</script>


<style scoped>
.font-picker {
  position: relative;
  width: 100%;
}

.font-preview {
  padding: 8px 12px;
  border: 1px solid var(--studio-border);
  border-radius: 4px;
  cursor: pointer;
  background: var(--studio-surface);
  color: var(--studio-text);
  display: flex;
  gap: 12px;
  align-items: center;
}

.font-preview:hover {
  border-color: var(--studio-primary);
}

.font-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--studio-surface-raised);
  border: 1px solid var(--studio-border);
  border-radius: 4px;
  box-shadow: var(--studio-shadow-md);
  z-index: 1000;
}

.font-panel-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--studio-surface-raised);
  border-bottom: 1px solid var(--studio-border);
}

.font-scope-toggle {
  flex-shrink: 0;
  margin-left: auto;
}

.font-name {
  font-size: 13px;
  color: var(--studio-text-muted);
}

.preview-text {
  font-size: 18px;
  color: var(--studio-text);
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
  color: var(--studio-primary);
  font-size: 14px;
  cursor: pointer;
  border-top: 1px solid var(--studio-border);
}

.add-font-btn:hover {
  background: var(--studio-surface-soft);
}

.icon-lib-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid var(--studio-border);
  border-bottom: 1px solid var(--studio-border);
  font-size: 13px;
  color: var(--studio-text-muted);
}

/* solid divider between sections (thicker with subtle pattern) */
.section-divider {
  width: 100%;
  height: 6px; /* thicker */
  border-radius: 4px;
  margin: 12px 0; /* more spacing */
  background: repeating-linear-gradient(
    135deg,
    var(--studio-border) 0px,
    var(--studio-border) 8px,
    var(--studio-surface-soft) 8px,
    var(--studio-surface-soft) 16px
  );
  box-shadow: inset 0 0 0 1px var(--studio-border); /* crisp border */
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--studio-surface-soft);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: var(--studio-border-strong);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--studio-primary-border);
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
  color: var(--studio-primary);
}

.upload-text {
  text-align: center;
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--studio-text-subtle);
}

.font-info {
  background: var(--studio-surface-soft);
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
  color: var(--studio-text);
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
  color: var(--studio-text-muted);
}

.font-preview {
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
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
  color: var(--studio-primary);
}

.preview-letters {
  font-size: 20px;
  color: var(--studio-text);
}

.preview-chinese {
  font-size: 18px;
  color: var(--studio-text-muted);
}

</style>
