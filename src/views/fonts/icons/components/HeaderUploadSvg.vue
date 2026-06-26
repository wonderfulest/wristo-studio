<template>
  <div class="upload-wrap">
    <div v-if="showHint" class="hint">{{ t('icon.uploadHint') }}</div>
    <el-button v-if="showButton && canUsePremiumAssets" type="success" :loading="uploading" @click="openUpload()">{{ t('icon.uploadSvg') }}</el-button>

    <el-dialog v-model="dialogVisible" :title="t('icon.uploadSvgTitle')" width="960px" class="upload-svg-dialog" :close-on-click-modal="false">
      <el-upload
        class="svg-upload"
        drag
        :show-file-list="false"
        :before-upload="beforeUpload"
        :http-request="doUpload"
        accept=".svg"
        multiple
      >
        <div class="upload-drop-content">
          <el-icon class="upload-drop-icon"><UploadFilled /></el-icon>
          <div class="upload-drop-title">{{ t('icon.dropSvgTitle') }}</div>
          <div class="upload-drop-subtitle">{{ t('icon.dropSvgSubtitle') }}</div>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            <div class="upload-guidance">
              <div class="guidance-item">{{ t('icon.uploadRuleSelected') }}</div>
              <div class="guidance-item">{{ t('icon.uploadRuleFilenames') }}</div>
            </div>
            <div class="upload-extra">
              <div class="display-type-row">
                <span class="label"><span class="required-mark">*</span> {{ t('icon.displayTypeRequired') }}</span>
                <el-radio-group v-model="displayType">
                  <el-radio v-for="opt in displayTypeOptions" :key="opt.value" :label="opt.value">{{ opt.name || opt.value }}</el-radio>
                </el-radio-group>
              </div>
            </div>
            <div class="symbol-quick">
              <div class="symbol-selected">
                <span>{{ t('icon.selectedIconType') }}</span>
                <span class="code" v-if="selectedSymbolCode">{{ selectedSymbolCode }}</span>
                <span v-else class="empty-selection">{{ t('icon.notSelected') }}</span>
                <el-button v-if="selectedSymbolCode" link type="primary" @click="clearSelect" :disabled="uploading">{{ t('icon.clearSelection') }}</el-button>
              </div>
              <el-input
                v-model="symbolKeyword"
                :placeholder="t('icon.searchIconType')"
                clearable
                class="symbol-search"
              />
              <div class="symbol-grid">
                <div
                  v-for="it in filteredIconList"
                  :key="it.symbolCode"
                  class="symbol-card"
                  :class="{ active: selectedSymbolCode === it.symbolCode }"
                  @click="toggleSelect(it.symbolCode)"
                >
                  <div class="symbol-code">{{ it.symbolCode }}</div>
                  <div class="symbol-label">{{ it.label }}</div>
                  <div class="symbol-code">{{ it.iconUnicode }}</div>
                </div>
              </div>
            </div>
            <div v-if="uploadQueue.length > 0" class="upload-queue">
              <div class="queue-header">
                <span>{{ t('asset.uploadQueue') }}</span>
                <span>{{ t('asset.uploadQueueSummary', { done: completedQueueCount, total: uploadQueue.length }) }}</span>
              </div>
              <el-progress
                :percentage="queueProgress"
                :stroke-width="8"
                :show-text="false"
              />
              <div class="queue-list">
                <div
                  v-for="item in uploadQueue"
                  :key="item.id"
                  class="queue-item"
                  :class="`queue-item--${item.status}`"
                >
                  <div class="queue-item-main">
                    <span class="queue-file">{{ item.file.name }}</span>
                    <span class="queue-status">{{ queueStatusLabel(item.status) }}</span>
                  </div>
                  <el-progress
                    :percentage="item.progress"
                    :status="item.status === 'failed' ? 'exception' : (item.status === 'done' ? 'success' : undefined)"
                    :stroke-width="6"
                  />
                  <div v-if="item.message" class="queue-message">{{ item.message }}</div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </el-upload>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false" :disabled="uploading">{{ t('common.close') }}</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useStudioMembershipGate } from '@/composables/useStudioMembershipGate'
import { uploadIconSvg, listIconLibrary, type IconLibraryVO, type IconAssetVO, type DisplayType } from '@/api/wristo/iconGlyph'
import { getEnumOptions, type EnumOption } from '@/api/common'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const userStore = useUserStore()
const membershipGate = useStudioMembershipGate()
const canUsePremiumAssets = computed(() => userStore.canUsePremiumStudioAssets)

type UploadContext = {
  glyphId?: number
}

const props = withDefaults(defineProps<{
  iconUnicode?: string
  showButton?: boolean
  showHint?: boolean
  uploadContext?: UploadContext
}>(), {
  showButton: true,
  showHint: true,
})
const emit = defineEmits<{
  (e: 'uploaded', payload?: { asset?: IconAssetVO; assets?: IconAssetVO[]; context?: UploadContext }): void
  (e: 'update:iconUnicode', val?: string): void
}>()

const uploading = ref(false)
const dialogVisible = ref(false)
const iconList = ref<Pick<IconLibraryVO, 'symbolCode' | 'label' | 'iconUnicode'>[]>([])
const selectedSymbolCode = ref<string | undefined>(undefined)
const pendingIconUnicode = ref<string | undefined>(undefined)
const activeUploadContext = ref<UploadContext | undefined>(undefined)
const displayType = ref<DisplayType | undefined>(undefined)
const displayTypeOptions = ref<EnumOption[]>([])
const symbolKeyword = ref('')
type QueueStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'failed'

type UploadQueueItem = {
  id: string
  file: File
  displayType: DisplayType
  selectedSymbolCode?: string
  context?: UploadContext
  status: QueueStatus
  progress: number
  message?: string
}

const uploadQueue = ref<UploadQueueItem[]>([])
let queueSeq = 0

const normalizeSymbolCode = (value?: string) => (value || '').trim().toLowerCase().replace(/[-\s]+/g, '_')

const findIconBySymbolCode = (symbolCode?: string) => {
  const normalized = normalizeSymbolCode(symbolCode)
  if (!normalized) return undefined
  return iconList.value.find(it => normalizeSymbolCode(it.symbolCode) === normalized)
}

const readFileNameIconMetadata = (fileName: string) => {
  const baseName = fileName.replace(/\.svg$/i, '').trim()
  const hexNameMatch = baseName.match(/^([0-9a-fA-F]{2,6})-(.+)$/)
  if (!hexNameMatch) {
    return {
      baseName,
      symbolCode: baseName,
      iconUnicode: undefined,
    }
  }
  return {
    baseName,
    symbolCode: hexNameMatch[2].replace(/-/g, '_'),
    iconUnicode: hexNameMatch[1].toLowerCase(),
  }
}

const loadIconLibrary = async () => {
  if (iconList.value.length > 0) return
  const resp = await listIconLibrary()
  const arr = (resp?.data || [])
    .map((it: any) => ({ symbolCode: it?.symbolCode, label: it?.label, iconUnicode: it?.iconUnicode }))
    .filter((it: any) => !!it.symbolCode)
  iconList.value = arr
}

const readSvgIconMetadata = async (file: File) => {
  try {
    const text = await file.text()
    const descMatch = text.match(/<desc\b[^>]*>([\s\S]*?)<\/desc>/i)
    const source = descMatch?.[1] || text
    const symbolMatch = source.match(/(?:^|[\s.;,])([a-z][a-z0-9]*(?:[_-][a-z0-9]+)+)(?=\s*[;,.]?\s*(?:unicode|$))/i)
    const unicodeMatch = source.match(/\bunicode\s*[:=]?\s*([0-9a-fA-F]{2,6})\b/i)
    return {
      symbolCode: symbolMatch?.[1],
      iconUnicode: unicodeMatch?.[1]?.toLowerCase(),
    }
  } catch {
    return {}
  }
}

const resolveUploadUnicode = async (file: File, selectedSymbol?: string) => {
  if (selectedSymbol) {
    const found = findIconBySymbolCode(selectedSymbol)
    return found?.iconUnicode || ''
  }

  const fileNameMetadata = readFileNameIconMetadata(file.name)
  if (fileNameMetadata.iconUnicode) return fileNameMetadata.iconUnicode

  const foundByName = findIconBySymbolCode(fileNameMetadata.symbolCode || fileNameMetadata.baseName)
  if (foundByName?.iconUnicode) return foundByName.iconUnicode

  const metadata = await readSvgIconMetadata(file)
  const foundByMetadata = findIconBySymbolCode(metadata.symbolCode)
  if (foundByMetadata?.iconUnicode) return foundByMetadata.iconUnicode
  return metadata.iconUnicode || ''
}

const completedQueueCount = computed(() => uploadQueue.value.filter(item => item.status === 'done' || item.status === 'failed').length)
const queueProgress = computed(() => {
  if (uploadQueue.value.length === 0) return 0
  const total = uploadQueue.value.reduce((sum, item) => sum + item.progress, 0)
  return Math.round(total / uploadQueue.value.length)
})

const queueStatusLabel = (status: QueueStatus) => {
  if (status === 'pending') return t('asset.uploadPending')
  if (status === 'uploading') return t('common.uploading')
  if (status === 'processing') return t('icon.uploadProcessing')
  if (status === 'done') return t('asset.uploadDone')
  return t('asset.uploadFailed')
}

const getUploadErrorMessage = (error: unknown): string => {
  const e = error as any
  return e?.response?.data?.msg
    || e?.response?.data?.message
    || e?.msg
    || e?.message
    || t('asset.uploadFailed')
}

const startProcessingProgress = (item: UploadQueueItem) => {
  item.status = 'processing'
  item.message = t('icon.uploadProcessingHint')
  item.progress = Math.max(item.progress, 95)
  return window.setInterval(() => {
    if (item.status !== 'processing') return
    item.progress = Math.min(99, item.progress + 1)
  }, 900)
}

const filteredIconList = computed(() => {
  const keyword = symbolKeyword.value.trim().toLowerCase()
  if (!keyword) return iconList.value
  return iconList.value.filter((it) => {
    return [it.symbolCode, it.label, it.iconUnicode]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(keyword))
  })
})

watch(dialogVisible, async (v) => {
  if (v && !canUsePremiumAssets.value) {
    dialogVisible.value = false
    membershipGate.requirePremium('icon.premiumRequired')
    return
  }
  if (v && iconList.value.length === 0) {
    try {
      await loadIconLibrary()
    } catch {
      // silent
    }
  }
  if (v && displayTypeOptions.value.length === 0) {
    try {
      const res: any = await getEnumOptions('DisplayType')
      const list: EnumOption[] = res?.data ?? res ?? []
      displayTypeOptions.value = Array.isArray(list) && list.length ? list : [ { name: 'mip', value: 'mip' }, { name: 'amoled', value: 'amoled' } ]
    } catch {
      displayTypeOptions.value = [ { name: 'mip', value: 'mip' }, { name: 'amoled', value: 'amoled' } ]
    }
    // no default; user must select explicitly
  }
  // apply pending preselection if possible
  if (v && pendingIconUnicode.value && iconList.value.length) {
    const found = iconList.value.find(it => it.iconUnicode === pendingIconUnicode.value)
    if (found?.symbolCode) selectedSymbolCode.value = found.symbolCode
    pendingIconUnicode.value = undefined
  }
})

function preselectIconUnicode(iconUnicode?: string) {
  if (!iconUnicode) return
  if (iconList.value.length > 0) {
    const found = iconList.value.find(it => it.iconUnicode === iconUnicode)
    selectedSymbolCode.value = found?.symbolCode
    pendingIconUnicode.value = undefined
  } else {
    pendingIconUnicode.value = iconUnicode
  }
}

function openUpload(iconUnicode?: string, initialDisplayType?: DisplayType, context?: UploadContext) {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('icon.premiumRequired')
    return
  }
  symbolKeyword.value = ''
  if (!uploading.value && completedQueueCount.value === uploadQueue.value.length) {
    uploadQueue.value = []
  }
  activeUploadContext.value = context ?? props.uploadContext
  if (initialDisplayType) displayType.value = initialDisplayType
  const targetIconUnicode = iconUnicode || props.iconUnicode
  if (targetIconUnicode) {
    preselectIconUnicode(targetIconUnicode)
  } else {
    selectedSymbolCode.value = undefined
    pendingIconUnicode.value = undefined
  }
  dialogVisible.value = true
}

defineExpose({ openUpload })

// react to prop change
watch(
  () => props.iconUnicode,
  (u) => {
    if (!u) {
      // clear selection only if not uploading
      if (!uploading.value) selectedSymbolCode.value = undefined
      pendingIconUnicode.value = undefined
      return
    }
    if (iconList.value.length > 0) {
      const found = iconList.value.find(it => it.iconUnicode === u)
      selectedSymbolCode.value = found?.symbolCode
      pendingIconUnicode.value = undefined
    } else {
      pendingIconUnicode.value = u
    }
  },
  { immediate: true }
)

const beforeUpload = (file: File) => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('icon.premiumRequired')
    return false
  }
  const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
  if (!isSvg) {
    ElMessage.error(t('icon.uploadSvgOnly'))
    return false
  }
  return true
}

const doUpload = async (options: { file: File }) => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('icon.premiumRequired')
    return
  }
  const file = options.file
  if (!beforeUpload(file)) return
  if (!displayType.value) {
    ElMessage.error(t('icon.selectDisplayType'))
    return
  }
  uploadQueue.value.push({
    id: `${Date.now()}-${queueSeq++}`,
    file,
    displayType: displayType.value,
    selectedSymbolCode: selectedSymbolCode.value,
    context: activeUploadContext.value,
    status: 'pending',
    progress: 0,
  })
  processUploadQueue()
}

const processUploadQueue = async () => {
  if (uploading.value) return
  uploading.value = true
  const uploadedAssets: IconAssetVO[] = []
  let uploadedContext: UploadContext | undefined
  try {
    await loadIconLibrary()
    while (true) {
      const item = uploadQueue.value.find(entry => entry.status === 'pending')
      if (!item) break
      item.status = 'uploading'
      item.progress = 1
      item.message = undefined
      try {
        const unicode = await resolveUploadUnicode(item.file, item.selectedSymbolCode)
        if (!unicode) {
          item.status = 'failed'
          item.progress = 100
          item.message = t('icon.resolveUnicodeFailed')
          ElMessage.error(t('icon.uploadFailed', { name: item.file.name }))
          continue
        }

        let processingTimer: number | undefined
        try {
          const { data } = await uploadIconSvg(
            item.file,
            unicode,
            item.displayType,
            (evt) => {
              if (!evt.total) {
                item.progress = Math.max(item.progress, 30)
                return
              }
              const percent = Math.round((evt.loaded / evt.total) * 100)
              item.progress = Math.min(95, percent)
              if (percent >= 100 && processingTimer == null) {
                processingTimer = startProcessingProgress(item)
              }
            },
          )
          item.message = undefined
          item.status = 'done'
          item.progress = 100
          ElMessage.success(t('icon.uploadSuccess', { name: item.file.name }))
          if (data) uploadedAssets.push(data)
          uploadedContext = item.context
        } finally {
          if (processingTimer != null) {
            window.clearInterval(processingTimer)
          }
        }
      } catch (e) {
        item.status = 'failed'
        item.progress = 100
        const errorMessage = getUploadErrorMessage(e)
        item.message = errorMessage
        ElMessage.error(`${t('icon.uploadFailed', { name: item.file.name })}: ${errorMessage}`)
      }
    }
  } finally {
    uploading.value = false
    if (uploadedAssets.length > 0) {
      emit('uploaded', {
        asset: uploadedAssets[uploadedAssets.length - 1],
        assets: uploadedAssets,
        context: uploadedContext,
      })
    }
    if (uploadQueue.value.length > 0 && uploadQueue.value.every(item => item.status === 'done')) {
      dialogVisible.value = false
    }
  }
}

function toggleSelect(code?: string) {
  if (uploading.value) return
  if (!code) {
    selectedSymbolCode.value = undefined
    emit('update:iconUnicode', undefined)
    return
  }
  selectedSymbolCode.value = selectedSymbolCode.value === code ? undefined : code
  // emit corresponding unicode to parent for syncing selection in IconAssets
  if (selectedSymbolCode.value) {
    const found = iconList.value.find(it => it.symbolCode === selectedSymbolCode.value)
    emit('update:iconUnicode', found?.iconUnicode)
  } else {
    emit('update:iconUnicode', undefined)
  }
}

function clearSelect() {
  if (uploading.value) return
  selectedSymbolCode.value = undefined
  emit('update:iconUnicode', undefined)
}
</script>

<style scoped>
.upload-wrap { display: flex; align-items: center; gap: 12px; }
.hint { font-size: 12px; color: var(--studio-text-muted); }

:global(.upload-svg-dialog) {
  --el-dialog-padding-primary: 22px;
  border-radius: 14px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
:global(.upload-svg-dialog .el-dialog__body) {
  max-height: calc(90vh - 148px);
  overflow: auto;
}
:global(.upload-svg-dialog .el-dialog__footer) {
  flex: 0 0 auto;
}

.svg-upload :deep(.el-upload) { width: 100%; }
.svg-upload :deep(.el-upload-dragger) {
  padding: 0;
  border-color: color-mix(in srgb, var(--studio-primary) 22%, var(--studio-border));
  border-radius: 12px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--studio-primary) 5%, transparent), transparent 70%),
    var(--studio-surface);
}
.svg-upload :deep(.el-upload-dragger:hover) {
  border-color: var(--studio-primary);
  background: color-mix(in srgb, var(--studio-primary) 5%, var(--studio-surface));
}
.upload-drop-content {
  display: flex;
  min-height: 128px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--studio-text);
}
.upload-drop-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
}
.upload-drop-title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
}
.upload-drop-subtitle {
  max-width: 440px;
  color: var(--studio-text-subtle);
  font-size: 12px;
  line-height: 1.45;
}
.upload-guidance {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.guidance-item {
  min-height: 44px;
  padding: 9px 11px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-sm);
  background: var(--studio-surface-soft);
  color: var(--studio-text-subtle);
  font-size: 12px;
  line-height: 1.45;
}
.upload-extra {
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-sm);
  background: var(--studio-surface);
}
.display-type-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 32px;
}
.display-type-row .label { font-size: 12px; color: var(--studio-text-subtle); font-weight: 600; }
.required-mark { color: var(--el-color-danger); }
.symbol-quick { margin-top: 12px; }
.symbol-selected { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: var(--studio-text-subtle); font-size: 12px; }
.empty-selection {
  color: var(--studio-text-muted);
}
.code {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--studio-primary-soft);
  color: var(--studio-primary);
  font-weight: 700;
}
.symbol-search { margin-bottom: 10px; }
.symbol-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 8px; max-height: 284px; overflow: auto; padding-right: 4px; }
.symbol-card { border: 1px solid var(--studio-border); border-radius: var(--studio-radius-sm); padding: 8px 10px; background: var(--studio-surface-soft); cursor: pointer; color: var(--studio-text); transition: border-color .18s ease, background .18s ease, transform .18s ease; }
.symbol-card:hover { border-color: var(--studio-primary-border); transform: translateY(-1px); }
.symbol-card.active { border-color: var(--studio-primary); box-shadow: 0 0 0 1px var(--studio-primary) inset; background: var(--studio-primary-soft); }
.symbol-code { font-weight: 600; color: var(--studio-text); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.symbol-label { font-size: 12px; color: var(--studio-text-subtle); margin-top: 4px; }
.upload-queue { margin-top: 12px; padding: 10px; border: 1px solid var(--studio-border); border-radius: var(--studio-radius-sm); background: var(--studio-surface-soft); }
.queue-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; color: var(--studio-text); font-size: 12px; font-weight: 700; }
.queue-list { max-height: 220px; overflow: auto; display: flex; flex-direction: column; gap: 8px; margin-top: 10px; padding-right: 4px; }
.queue-item { padding: 8px; border: 1px solid var(--studio-border); border-radius: var(--studio-radius-sm); background: var(--studio-surface); }
.queue-item--done { border-color: var(--el-color-success-light-5); }
.queue-item--failed { border-color: var(--el-color-danger-light-5); }
.queue-item-main { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; margin-bottom: 6px; }
.queue-file { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--studio-text); font-size: 12px; font-weight: 600; }
.queue-status { color: var(--studio-text-subtle); font-size: 12px; white-space: nowrap; }
.queue-message { margin-top: 4px; color: var(--el-color-danger); font-size: 12px; line-height: 1.4; }

@media (max-width: 720px) {
  :global(.upload-svg-dialog) {
    width: calc(100vw - 24px) !important;
  }
  .upload-guidance {
    grid-template-columns: 1fr;
  }
  .display-type-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
}

@media (max-height: 760px) {
  :global(.upload-svg-dialog) {
    margin-top: 5vh;
  }
  :global(.upload-svg-dialog .el-dialog__body) {
    max-height: calc(90vh - 132px);
  }
  .upload-drop-content {
    min-height: 104px;
  }
  .symbol-grid {
    max-height: 188px;
  }
}
</style>
