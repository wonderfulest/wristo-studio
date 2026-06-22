<template>
  <el-dialog
    v-model="visibleRef"
    :title="t('font.bitmapFontSetting')"
    width="640px"
    append-to-body
    @close="handleClose"
  >
    <div class="bitmap-dialog-header-extra">
      <a
        href="https://youtu.be/gNikiDDrrpU?si=FptKoIr0HL0EhX7R"
        target="_blank"
        rel="noopener noreferrer"
        class="bitmap-tutorial-link"
      >
        {{ t('font.watchTutorialYoutube') }}
      </a>
    </div>
    <el-upload
      ref="batchUploadRef"
      class="bitmap-batch-upload"
      drag
      multiple
      :show-file-list="false"
      :auto-upload="false"
      accept=".svg,image/svg+xml"
      @change="handleBatchFileChange"
    >
      <div class="bitmap-batch-title">{{ t('font.dragGlyphSvgs') }}</div>
      <div class="bitmap-batch-hint">
        {{ t('font.glyphFilenameHint', { example1: '0.svg', example2: '9.svg', example3: 'colon.svg', example4: ':.svg' }) }}
      </div>
    </el-upload>
    <el-tabs v-model="activeTab">
      <el-tab-pane :label="t('font.digit')" name="digit" />
      <el-tab-pane :label="t('font.symbol')" name="symbol" />
      <el-tab-pane :label="t('font.other')" name="other" disabled />
      <el-tab-pane :label="t('font.custom')" name="custom" disabled />
    </el-tabs>

    <!-- DIGIT 0-9 -->
    <div v-if="activeTab === 'digit'" class="bitmap-rows">
      <div
        v-for="row in localRows"
        :key="row.index"
        class="bitmap-row"
      >
        <div class="bitmap-row-index">{{ row.index }}</div>
        <div class="bitmap-row-preview" :class="{ empty: !row.imageUrl }">
          <!-- 中间区域：本地上传 + 预览 -->
          <el-upload
            class="bitmap-upload"
            :show-file-list="false"
            :auto-upload="false"
            accept="image/*"
            @change="(file: any) => handleFileChange(file, row.index)"
          >
            <template v-if="row.imageUrl">
              <img :src="row.imageUrl" class="bitmap-image" alt="digit preview" />
            </template>
            <template v-else>
              <button type="button" class="bitmap-add-btn">+</button>
            </template>
          </el-upload>
        </div>
        <div class="bitmap-row-height">317px</div>
        <el-button
          size="small"
          class="bitmap-row-reset"
          :disabled="!row.imageUrl"
          @click="emit('reset-row', row.index)"
        >
          {{ t('common.reset') }}
        </el-button>
      </div>
    </div>

    <!-- SYMBOL，例如 ':' -->
    <div v-else-if="activeTab === 'symbol'" class="bitmap-rows">
      <div
        v-for="row in localSymbolRows"
        :key="row.index"
        class="bitmap-row"
      >
        <div class="bitmap-row-index">{{ row.index }}</div>
        <div class="bitmap-row-preview" :class="{ empty: !row.imageUrl }">
          <el-upload
            class="bitmap-upload"
            :show-file-list="false"
            :auto-upload="false"
            accept="image/*"
            @change="(file: any) => handleFileChange(file, row.index)"
          >
            <template v-if="row.imageUrl">
              <img :src="row.imageUrl" class="bitmap-image" alt="symbol preview" />
            </template>
            <template v-else>
              <button type="button" class="bitmap-add-btn">+</button>
            </template>
          </el-upload>
        </div>
        <div class="bitmap-row-height">317px</div>
        <el-button
          size="small"
          class="bitmap-row-reset"
          :disabled="!row.imageUrl"
          @click="emit('reset-row', row.index)"
        >
          {{ t('common.reset') }}
        </el-button>
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="onCancel">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="onOk">{{ t('common.ok') }}</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

export interface DigitRowState {
  // 字符值，例如 '0'-'9' 或 ':'
  index: string
  imageUrl?: string
}

const props = defineProps<{
  modelValue: boolean
  rows: DigitRowState[]
  // 符号行，例如 ':'
  symbolRows?: DigitRowState[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'reset-row', index: string): void
  (e: 'upload-row', payload: { index: string; file: File; previewUrl: string }): void
  (e: 'upload-rows', payload: { index: string; file: File; previewUrl: string }[]): void
  (e: 'confirm'): void
}>()

const visibleRef = ref(props.modelValue)
watch(
  () => props.modelValue,
  v => (visibleRef.value = v),
)
watch(visibleRef, v => emit('update:modelValue', v))

const activeTab = ref<'digit' | 'symbol' | 'other' | 'custom'>('digit')
const batchUploadRef = ref<any>()
let batchUploadTimer: ReturnType<typeof setTimeout> | undefined
let pendingBatchUploadFiles: any[] = []

const localRows = ref<DigitRowState[]>([])
const localSymbolRows = ref<DigitRowState[]>([])
watch(
  () => props.rows,
  (rows) => {
    localRows.value = rows.map(r => ({ ...r }))
  },
  { immediate: true, deep: true },
)

watch(
  () => props.symbolRows,
  (rows) => {
    localSymbolRows.value = (rows || []).map(r => ({ ...r }))
  },
  { immediate: true, deep: true },
)

const handleFileChange = (file: any, index: string) => {
  if (!file?.raw) return
  const raw = file.raw as File
  const url = URL.createObjectURL(raw)
  const row = localRows.value.find(r => r.index === index)
  if (row) {
    row.imageUrl = url
  }
  const symbolRow = localSymbolRows.value.find(r => r.index === index)
  if (symbolRow) {
    symbolRow.imageUrl = url
  }
  emit('upload-row', { index, file: raw, previewUrl: url })
}

const inferGlyphIndexFromFilename = (filename: string): string | null => {
  const base = filename
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/\.[^.]+$/, '')
    .trim()
    .toLowerCase()
  if (!base) return null
  if (/^[0-9]$/.test(base)) return base
  const digitMatch = base.match(/(?:^|[-_\s])(?:digit|number|num|glyph)[-_\s]*([0-9])$/)
    || base.match(/(?:^|[-_\s])([0-9])$/)
  if (digitMatch) return digitMatch[1]
  if ([':', 'colon', 'separator', 'time-colon', 'time_colon', 'u003a', '003a'].includes(base)) return ':'
  if (/(^|[-_\s])colon$/.test(base)) return ':'
  return null
}

const applyPreview = (index: string, file: File) => {
  const url = URL.createObjectURL(file)
  const row = localRows.value.find(r => r.index === index)
  if (row) {
    row.imageUrl = url
  }
  const symbolRow = localSymbolRows.value.find(r => r.index === index)
  if (symbolRow) {
    symbolRow.imageUrl = url
  }
  return url
}

const handleBatchFileChange = (_file: any, uploadFiles: any[]) => {
  pendingBatchUploadFiles = uploadFiles || []
  if (batchUploadTimer) clearTimeout(batchUploadTimer)
  batchUploadTimer = setTimeout(() => {
    flushBatchFiles(pendingBatchUploadFiles)
    pendingBatchUploadFiles = []
    batchUploadRef.value?.clearFiles?.()
  }, 60)
}

const flushBatchFiles = (uploadFiles: any[]) => {
  const latestByIndex = new Map<string, File>()
  ;(uploadFiles || []).forEach(item => {
    const raw = item?.raw as File | undefined
    if (!raw) return
    const index = inferGlyphIndexFromFilename(raw.name)
    if (!index) return
    latestByIndex.set(index, raw)
  })
  const payload = Array.from(latestByIndex.entries()).map(([index, file]) => ({
    index,
    file,
    previewUrl: applyPreview(index, file),
  }))
  if (payload.length) {
    emit('upload-rows', payload)
  }
}

const onCancel = () => {
  visibleRef.value = false
}

const onOk = () => {
  emit('confirm')
}

const handleClose = () => {
  // dialog close sync back to v-model 已由 watch 完成
}
</script>

<style scoped>
.bitmap-rows {
  margin-top: 12px;
}

.bitmap-batch-upload {
  display: block;
  margin-bottom: 12px;
}

.bitmap-batch-title {
  color: var(--studio-text);
  font-size: 13px;
  line-height: 20px;
}

.bitmap-batch-hint {
  color: var(--studio-text-subtle);
  font-size: 12px;
  line-height: 18px;
}

.bitmap-row {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--studio-border);
}

.bitmap-row-index {
  width: 32px;
  text-align: center;
  font-size: 14px;
  color: var(--studio-text-muted);
}

.bitmap-row-preview {
  flex: 1;
  margin: 0 12px;
}

.bitmap-row-preview.empty {
  background: var(--studio-surface-soft);
}

.bitmap-upload {
  width: 100%;
}

.bitmap-image {
  display: block;
  max-width: 100%;
  max-height: 60px;
  object-fit: contain;
}

.bitmap-row-height {
  width: 64px;
  text-align: right;
  font-size: 12px;
  color: var(--studio-text-subtle);
  padding-right: 8px;
}

.bitmap-row-reset {
  min-width: 72px;
}

.bitmap-add-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--studio-border);
  background: var(--studio-surface);
  color: var(--studio-primary);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.dialog-footer {
  display: inline-flex;
  justify-content: flex-end;
  width: 100%;
  gap: 8px;
}

.bitmap-dialog-header-extra {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.bitmap-tutorial-link {
  font-size: 12px;
  color: var(--studio-primary);
  text-decoration: none;
}

.bitmap-tutorial-link:hover {
  text-decoration: underline;
}
</style>
