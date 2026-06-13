<template>
  <div class="fonts-preview">
    <!-- Search & filters (same layout as Fonts.vue, but focused on number fonts) -->
    <div class="search-panel">
      <div class="search-inputs">
        <el-input
          v-model="searchQuery"
          :placeholder="t('font.searchNumberFonts')"
          class="search-input"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button :icon="Search" @click="handleSearch">{{ t('common.search') }}</el-button>
          </template>
        </el-input>

        <el-input
          v-model="previewText"
          placeholder="1234567890:"
          class="preview-input"
          clearable
          @input="handlePreviewTextChange"
        >
          <template #prefix>
            <span class="preview-prefix"></span>
          </template>
        </el-input>
      </div>
      <el-divider />

      <!-- Toolbar: upload & reset -->
      <div class="search-toolbar flex items-center justify-between">
        <div class="toolbar-actions">
          <el-button
            v-if="canUsePremiumAssets"
            size="small"
            @click="showUploadArea = !showUploadArea"
            :type="showUploadArea ? 'primary' : 'default'"
          >
            <el-icon><Upload /></el-icon>
            {{ t('font.uploadNumberFonts') }}
          </el-button>
          <el-button size="small" style="margin-left: 12px;" @click="handleResetFilters">{{ t('common.reset') }}</el-button>
          <el-button
            v-if="canUsePremiumAssets"
            size="small"
            type="primary"
            style="margin-left: 12px;"
            @click="openGlyphEditor"
          >
            {{ t('font.editNumberGlyphs') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- Upload area -->
    <div v-show="showUploadArea && canUsePremiumAssets" class="upload-section">
      <div class="upload-header">
        <h3>{{ t('font.uploadCustomNumberFonts') }}</h3>
        <p class="upload-description">{{ t('font.uploadNumberFontsDescription') }}</p>
      </div>

      <el-upload
        class="font-upload-area"
        drag
        multiple
        accept=".ttf,.otf"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFontFilesChange"
      >
        <div class="upload-content">
          <el-icon class="upload-icon">
            <Upload />
          </el-icon>
          <div class="upload-text">
            <span>{{ t('font.clickDragFontFiles') }}</span>
            <p class="upload-tip">{{ t('font.supportedTtfOtf') }}</p>
          </div>
        </div>
      </el-upload>

      <!-- Upload processing queue -->
      <div v-if="uploadQueue.length > 0" class="upload-queue">
        <div class="queue-header">
          <span>{{ t('font.processingFonts', { count: uploadQueue.length }) }}</span>
          <el-button size="small" type="text" @click="clearQueue" :disabled="isProcessing">
            {{ t('common.clearAll') }}
          </el-button>
        </div>

        <div class="queue-list">
          <div
            v-for="(item, index) in uploadQueue"
            :key="index"
            class="queue-item"
            :class="{
              'processing': item.status === 'processing',
              'completed': item.status === 'completed',
              'error': item.status === 'error'
            }"
          >
            <div class="item-info">
              <div class="item-name">{{ item.file.name }}</div>
              <div class="item-details" v-if="item.parsedInfo">
                <span>{{ item.parsedInfo.fullName || item.parsedInfo.family }}</span>
                <span v-if="item.parsedInfo.subfamily"> - {{ item.parsedInfo.subfamily }}</span>
              </div>
            </div>

            <div class="item-status">
              <el-icon v-if="item.status === 'pending'" class="status-pending">
                <Upload />
              </el-icon>
              <el-icon v-else-if="item.status === 'processing'" class="status-processing">
                <Loading />
              </el-icon>
              <el-icon v-else-if="item.status === 'completed'" class="status-completed">
                <Check />
              </el-icon>
              <el-icon v-else-if="item.status === 'error'" class="status-error">
                <Warning />
              </el-icon>
            </div>

            <div class="item-actions">
              <el-button
                v-if="item.status === 'pending' || item.status === 'error'"
                size="small"
                type="text"
                @click="removeFromQueue(index)"
                :disabled="isProcessing"
              >
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
          </div>
        </div>

        <div class="queue-actions">
          <el-button
            type="primary"
            @click="processQueue"
            :loading="isProcessing"
            :disabled="uploadQueue.every(item => item.status === 'completed')"
          >
            {{ isProcessing ? t('common.processing') : t('font.uploadAllFonts') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- Number font list -->
    <div class="fonts-grid">
      <div
        v-for="font in fonts"
        :key="font.id"
        class="font-card"
      >
        <div class="font-card-header">
          <div class="font-name" :title="font.fullName || font.family">
            {{ font.fullName || font.family }}
          </div>
        </div>
        <div class="preview-oneline" :style="{ fontFamily: font.previewFamily || font.family }">
          {{ previewText || '1234567890:' }}
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div class="pagination-wrap flex justify-center">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[12, 24, 36, 48]"
        layout="total, sizes, prev, pager, next"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- Number glyph editor dialog component -->
    <NumberGlyphEditorDialog ref="glyphEditorRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useFontStore } from '@/stores/fontStore'
import { useUserStore } from '@/stores/user'
import { useStudioMembershipGate } from '@/composables/useStudioMembershipGate'
import { Search, Upload, Close, Check, Warning, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { searchFonts, uploadFontFile, getFontByName, increaseFontUsage } from '@/api/wristo/fonts'
import type { DesignFontVO } from '@/types/font'
import type { ParsedFontInfo } from '@/types/font-parse'
import opentype, { Font, FontNames } from 'opentype.js'
import NumberGlyphEditorDialog from '@/views/fonts/number/NumberGlyphEditorDialog.vue'
import { filterAssetsByStudioAccess } from '@/utils/studioAssetAccess'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const fonts = ref<(DesignFontVO & { previewFamily?: string })[]>([])
const currentPage = ref(1)
const pageSize = ref(48)
const total = ref(0)
const searchQuery = ref('')
const previewText = ref('1234567890:')

const showUploadArea = ref(false)
const uploadQueue = ref<UploadQueueItem[]>([])
const isProcessing = ref(false)

const fontStore = useFontStore()
const userStore = useUserStore()
const membershipGate = useStudioMembershipGate()
const canUsePremiumAssets = computed(() => userStore.canUsePremiumStudioAssets)
const glyphEditorRef = ref<InstanceType<typeof NumberGlyphEditorDialog> | null>(null)

interface UploadQueueItem {
  file: File
  status: 'pending' | 'processing' | 'completed' | 'error'
  parsedInfo?: ParsedFontInfo
  error?: string
}

const openGlyphEditor = () => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('font.premiumAssetRequired')
    return
  }
  glyphEditorRef.value?.open()
}

const loadFonts = async () => {
  try {
    const { data } = await searchFonts({
      pageNum: currentPage.value,
      pageSize: pageSize.value,
      name: searchQuery.value || undefined,
      type: 'text_font',
      isSystem: canUsePremiumAssets.value ? undefined : 1,
    })
    const list = filterAssetsByStudioAccess(data?.list ?? [], canUsePremiumAssets.value)
    total.value = data?.total ?? list.length
    // preload fonts using slug as family via fontStore
    await Promise.all(
      list.map((f: DesignFontVO) =>
        f?.slug ? fontStore.loadFont(f.slug, (f as any)?.ttfFile?.url) : Promise.resolve(true)
      )
    )
    fonts.value = list.map((f: any) => ({ ...f, previewFamily: f.slug || f.family }))
  } catch (error) {
    console.error('Failed to load number fonts:', error)
    ElMessage.error(t('font.loadNumberListFailed'))
  }
}

const handleSearch = () => {
  currentPage.value = 1
  loadFonts()
}

const handlePreviewTextChange = () => {
  // only rerender
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  loadFonts()
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  loadFonts()
}

const handleResetFilters = () => {
  searchQuery.value = ''
  currentPage.value = 1
  loadFonts()
}

const handleFontFilesChange = async (file: any) => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('font.uploadRequiresPremium')
    return
  }
  if (!file?.raw) return

  const lower = (file.name || '').toLowerCase()
  const isTTF = lower.endsWith('.ttf')
  const isOTF = lower.endsWith('.otf')

  if (!isTTF && !isOTF) {
    ElMessage.error(t('font.uploadTtfOtfOnly'))
    return
  }

  const exists = uploadQueue.value.some(item => item.file.name === file.name)
  if (exists) {
    ElMessage.warning(t('font.duplicateQueue', { name: file.name }))
    return
  }

  const queueItem: UploadQueueItem = {
    file: file.raw as File,
    status: 'pending',
  }
  uploadQueue.value.push(queueItem)

  try {
    const parsedInfo = await parseFontFile(file.raw as File)
    queueItem.parsedInfo = parsedInfo
  } catch (error) {
    console.error('Failed to parse font:', error)
    queueItem.error = t('font.parseFailed')
  }
}

const parseFontFile = async (file: File): Promise<ParsedFontInfo> => {
  const arrayBuffer = await file.arrayBuffer()
  const font: Font = opentype.parse(arrayBuffer)
  const names = font?.names as FontNames
  const tables: any = (font as any)?.tables || {}
  const os2 = tables.os2 || tables.OS_2
  const post = tables.post

  const langSet = new Set<string>()
  const collectLangs = (rec: Record<string, unknown> | undefined) => {
    if (!rec) return
    Object.keys(rec).forEach((k) => {
      if (k.length >= 2 && k.length <= 8) langSet.add(k)
    })
  }
  collectLangs(names?.fullName as any)
  collectLangs(names?.fontFamily as any)
  collectLangs(names?.fontSubfamily as any)
  collectLangs(names?.version as any)

  const subfamilyStr = names?.fontSubfamily?.en || names?.fontSubfamily?.enUS || names?.fontSubfamily?.enGB || ''
  const initialName = file.name.replace(/\.(ttf|otf)$/i, '')

  return {
    fullName: names?.fullName?.en || names?.fullName?.enUS || names?.fullName?.enGB,
    postscriptName: names?.postScriptName?.en || names?.postScriptName?.enUS || names?.postScriptName?.enGB,
    family: names?.fontFamily?.en || names?.fontFamily?.enUS || names?.fontFamily?.enGB || initialName,
    subfamily: subfamilyStr,
    version: names?.version?.en || names?.version?.enUS || names?.version?.enGB,
    copyright: names?.copyright?.en || names?.copyright?.enUS || names?.copyright?.enGB,
    glyphCount: font?.glyphs?.length ?? 0,
    languageCodes: Array.from(langSet),
    isMonospace: !!post?.isFixedPitch,
    italic: typeof os2?.fsSelection === 'number' ? Boolean(os2.fsSelection & 0x01) : /italic/i.test(subfamilyStr),
    weightClass: os2?.usWeightClass,
    widthClass: os2?.usWidthClass,
    unitsPerEm: (font as any)?.unitsPerEm,
    ascent: (font as any)?.tables?.hhea?.ascent ?? (font as any)?.ascender,
    descent: (font as any)?.tables?.hhea?.descent ?? (font as any)?.descender,
    lineGap: (font as any)?.tables?.hhea?.lineGap,
    capHeight: os2?.sCapHeight,
    xHeight: os2?.sxHeight,
  }
}

const removeFromQueue = (index: number) => {
  uploadQueue.value.splice(index, 1)
}

const clearQueue = () => {
  uploadQueue.value = uploadQueue.value.filter(item => item.status === 'processing')
}

const processQueue = async () => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('font.uploadRequiresPremium')
    return
  }
  if (isProcessing.value) return

  isProcessing.value = true
  let successCount = 0
  let errorCount = 0

  for (const item of uploadQueue.value) {
    if (item.status === 'completed') continue

    item.status = 'processing'

    try {
      await uploadSingleFont(item)
      item.status = 'completed'
      successCount++
    } catch (error: any) {
      item.status = 'error'
      item.error = error?.response?.data?.message || t('font.uploadFailed')
      errorCount++
      console.error('Font upload error:', error)
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  isProcessing.value = false

  if (successCount > 0 && errorCount === 0) {
    ElMessage.success(t('font.uploadSuccessCount', { count: successCount }))
  } else if (successCount > 0 && errorCount > 0) {
    ElMessage.warning(t('font.uploadPartialCount', { success: successCount, failed: errorCount }))
  } else if (errorCount > 0) {
    ElMessage.error(t('font.uploadFailedCount', { count: errorCount }))
  }

  if (successCount > 0) {
    loadFonts()
  }
}

const uploadSingleFont = async (item: UploadQueueItem) => {
  if (!canUsePremiumAssets.value) {
    throw new Error(t('font.uploadRequiresPremium'))
  }
  if (!item.parsedInfo) {
    throw new Error(t('font.parseFailed'))
  }

  const fontName = item.parsedInfo.fullName || item.parsedInfo.family || item.file.name.replace(/\.(ttf|otf)$/i, '')

  const byName = await getFontByName(fontName)
  const usedExisting = Boolean(byName.data)

  let created: DesignFontVO
  if (usedExisting) {
    created = byName.data as DesignFontVO
  } else {
    const uploadRes = await uploadFontFile(item.file, 'text_font')
    created = uploadRes.data as DesignFontVO
  }

  const familyName = created.family || created.fullName || created.postscriptName || fontName

  try {
    await increaseFontUsage(created.slug)
  } catch {}

  // NOTE: we do not register to fontStore here to avoid circular imports; runtime font-picker will handle loading.
  ;(created as any).previewFamily = created.slug || familyName

  return created
}

onMounted(() => {
  loadFonts()
})
</script>

<style scoped>
.fonts-preview {
  padding: 12px;
  color: var(--studio-text);
}

.search-panel {
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  padding: 16px;
  margin-bottom: 16px;
}

.search-inputs {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  min-width: 280px;
  max-width: 320px;
}

.preview-input {
  min-width: 240px;
  max-width: 280px;
}

.preview-prefix {
  font-size: 14px;
  font-weight: 500;
  color: var(--studio-text-muted);
}

.search-toolbar { margin-top: 12px; }

.fonts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.font-card {
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.font-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2px;
}

.font-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--studio-text);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.preview-oneline {
  font-size: 32px;
  min-height: 32px;
  color: var(--studio-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pagination-wrap { margin-top: 20px; }

.upload-section {
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  padding: 20px;
  margin-bottom: 20px;
}

.upload-header {
  margin-bottom: 16px;
}

.upload-header h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--studio-text);
}

.upload-description {
  margin: 0;
  font-size: 14px;
  color: var(--studio-text-muted);
}

.font-upload-area {
  margin-bottom: 20px;
}

.font-upload-area :deep(.el-upload-dragger) {
  width: 100%;
  height: 120px;
  border: 2px dashed var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.font-upload-area :deep(.el-upload-dragger:hover) {
  border-color: var(--studio-primary);
  background: var(--studio-primary-soft);
}

.upload-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.upload-icon {
  font-size: 32px;
  color: var(--studio-text-subtle);
}

.upload-text span {
  display: block;
  font-size: 14px;
  color: var(--studio-text);
  margin-bottom: 4px;
}

.upload-tip {
  margin: 0;
  font-size: 12px;
  color: var(--studio-text-subtle);
}

.upload-queue {
  border-top: 1px solid var(--studio-border);
  padding-top: 16px;
}

.queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--studio-text);
}

.queue-list {
  margin-bottom: 16px;
}

.queue-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--studio-border);
  border-radius: 6px;
  margin-bottom: 8px;
  transition: all 0.3s;
}

.queue-item:last-child {
  margin-bottom: 0;
}

.queue-item.processing {
  border-color: var(--studio-primary);
  background: var(--studio-primary-soft);
}

.queue-item.completed {
  border-color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.queue-item.error {
  border-color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--studio-text);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-details {
  font-size: 12px;
  color: var(--studio-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-status {
  margin: 0 12px;
}

.status-pending {
  color: var(--studio-text-subtle);
}

.status-processing {
  color: var(--studio-primary);
  animation: spin 1s linear infinite;
}

.status-completed {
  color: var(--el-color-success);
}

.status-error {
  color: var(--el-color-danger);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.item-actions {
  display: flex;
  align-items: center;
}

.queue-actions {
  display: flex;
  justify-content: center;
}

.toolbar-actions {
  display: flex;
  align-items: center;
}
</style>
