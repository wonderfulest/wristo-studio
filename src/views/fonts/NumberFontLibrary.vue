<template>
  <div class="fonts-preview">
    <!-- Search & filters (same layout as Fonts.vue, but focused on number fonts) -->
    <div class="search-panel">
      <div class="search-inputs">
        <el-input
          v-model="searchQuery"
          placeholder="Search number fonts..."
          class="search-input"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button :icon="Search" @click="handleSearch">Search</el-button>
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
            size="small"
            @click="showUploadArea = !showUploadArea"
            :type="showUploadArea ? 'primary' : 'default'"
          >
            <el-icon><Upload /></el-icon>
            Upload Number Fonts
          </el-button>
          <el-button size="small" style="margin-left: 12px;" @click="handleResetFilters">Reset</el-button>
          <el-button
            size="small"
            type="primary"
            style="margin-left: 12px;"
            @click="openGlyphEditor"
          >
            Edit Number Glyphs (0-9 & :)
          </el-button>
        </div>
      </div>
    </div>

    <!-- Upload area -->
    <div v-show="showUploadArea" class="upload-section">
      <div class="upload-header">
        <h3>Upload Custom Number Fonts</h3>
        <p class="upload-description">Upload TTF or OTF font files for number-only fonts.</p>
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
            <span>Click to select or drag and drop font files</span>
            <p class="upload-tip">TTF / OTF files supported</p>
          </div>
        </div>
      </el-upload>

      <!-- Upload processing queue -->
      <div v-if="uploadQueue.length > 0" class="upload-queue">
        <div class="queue-header">
          <span>Processing {{ uploadQueue.length }} font{{ uploadQueue.length > 1 ? 's' : '' }}</span>
          <el-button size="small" type="text" @click="clearQueue" :disabled="isProcessing">
            Clear All
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
            {{ isProcessing ? 'Processing...' : 'Upload All Fonts' }}
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
import { ref, onMounted, computed } from 'vue'
import { useFontStore } from '@/stores/fontStore'
import { Search, Upload, Close, Check, Warning, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { searchFonts, uploadFontFile, getFontByName, increaseFontUsage } from '@/api/wristo/fonts'
import type { DesignFontVO } from '@/types/font'
import type { ParsedFontInfo } from '@/types/font-parse'
import opentype, { Font, FontNames } from 'opentype.js'
import NumberGlyphEditorDialog from './components/NumberGlyphEditorDialog.vue'

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
const glyphEditorRef = ref<InstanceType<typeof NumberGlyphEditorDialog> | null>(null)

interface UploadQueueItem {
  file: File
  status: 'pending' | 'processing' | 'completed' | 'error'
  parsedInfo?: ParsedFontInfo
  error?: string
}

const openGlyphEditor = () => {
  glyphEditorRef.value?.open()
}

const loadFonts = async () => {
  try {
    const { data } = await searchFonts({
      pageNum: currentPage.value,
      pageSize: pageSize.value,
      name: searchQuery.value || undefined,
      type: 'number_font',
      onlyApprovedActive: true,
    })
    const list = data?.list ?? []
    total.value = data?.total ?? 0
    // preload fonts using slug as family via fontStore
    await Promise.all(
      list.map((f: DesignFontVO) =>
        f?.slug ? fontStore.loadFont(f.slug, (f as any)?.ttfFile?.url) : Promise.resolve(true)
      )
    )
    fonts.value = list.map((f: any) => ({ ...f, previewFamily: f.slug || f.family }))
  } catch (error) {
    console.error('Failed to load number fonts:', error)
    ElMessage.error('Failed to load number fonts')
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
  if (!file?.raw) return

  const lower = (file.name || '').toLowerCase()
  const isTTF = lower.endsWith('.ttf')
  const isOTF = lower.endsWith('.otf')

  if (!isTTF && !isOTF) {
    ElMessage.error('Please upload TTF/OTF files only')
    return
  }

  const exists = uploadQueue.value.some(item => item.file.name === file.name)
  if (exists) {
    ElMessage.warning(`Font "${file.name}" is already in the queue`)
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
    queueItem.error = 'Failed to parse font file'
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
      item.error = error?.response?.data?.message || 'Upload failed'
      errorCount++
      console.error('Font upload error:', error)
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  isProcessing.value = false

  if (successCount > 0 && errorCount === 0) {
    ElMessage.success(`Successfully uploaded ${successCount} font${successCount > 1 ? 's' : ''}`)
  } else if (successCount > 0 && errorCount > 0) {
    ElMessage.warning(`Uploaded ${successCount} font${successCount > 1 ? 's' : ''}, ${errorCount} failed`)
  } else if (errorCount > 0) {
    ElMessage.error(`Failed to upload ${errorCount} font${errorCount > 1 ? 's' : ''}`)
  }

  if (successCount > 0) {
    loadFonts()
  }
}

const uploadSingleFont = async (item: UploadQueueItem) => {
  if (!item.parsedInfo) {
    throw new Error('Font parsing failed')
  }

  const fontName = item.parsedInfo.fullName || item.parsedInfo.family || item.file.name.replace(/\.(ttf|otf)$/i, '')

  const byName = await getFontByName(fontName)
  const usedExisting = Boolean(byName.data)

  const mapWeight = (w?: number, sub?: string): string => {
    const subLower = (sub || '').toLowerCase()
    if (/bold/.test(subLower)) return 'bold'
    if (/semi[- ]?bold|demi[- ]?bold/.test(subLower)) return 'semibold'
    if (/medium/.test(subLower)) return 'medium'
    if (/light|extralight|ultralight/.test(subLower)) return 'light'
    if (/thin|hairline/.test(subLower)) return 'thin'
    if (typeof w !== 'number') return 'regular'
    if (w >= 900) return 'black'
    if (w >= 800) return 'extrabold'
    if (w >= 700) return 'bold'
    if (w >= 600) return 'semibold'
    if (w >= 500) return 'medium'
    if (w <= 300) return 'light'
    return 'regular'
  }

  let created: DesignFontVO
  if (usedExisting) {
    created = byName.data as DesignFontVO
  } else {
    const uploadRes = await uploadFontFile(item.file, 'number_font')
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
}

.search-panel {
  background: #fff;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 10px;
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
  color: #666;
}

.search-toolbar { margin-top: 12px; }

.fonts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.font-card {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 10px;
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
  color: #333;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.preview-oneline {
  font-size: 32px;
  min-height: 32px;
  color: #444;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pagination-wrap { margin-top: 20px; }

.upload-section {
  background: #fff;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 10px;
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
  color: #333;
}

.upload-description {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.font-upload-area {
  margin-bottom: 20px;
}

.font-upload-area :deep(.el-upload-dragger) {
  width: 100%;
  height: 120px;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.font-upload-area :deep(.el-upload-dragger:hover) {
  border-color: #409eff;
  background: #f0f9ff;
}

.upload-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.upload-icon {
  font-size: 32px;
  color: #999;
}

.upload-text span {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.upload-tip {
  margin: 0;
  font-size: 12px;
  color: #999;
}

.upload-queue {
  border-top: 1px solid #eee;
  padding-top: 16px;
}

.queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.queue-list {
  margin-bottom: 16px;
}

.queue-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 6px;
  margin-bottom: 8px;
  transition: all 0.3s;
}

.queue-item:last-child {
  margin-bottom: 0;
}

.queue-item.processing {
  border-color: #409eff;
  background: #f0f9ff;
}

.queue-item.completed {
  border-color: #67c23a;
  background: #f0f9ff;
}

.queue-item.error {
  border-color: #f56c6c;
  background: #fef0f0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-details {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-status {
  margin: 0 12px;
}

.status-pending {
  color: #999;
}

.status-processing {
  color: #409eff;
  animation: spin 1s linear infinite;
}

.status-completed {
  color: #67c23a;
}

.status-error {
  color: #f56c6c;
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
