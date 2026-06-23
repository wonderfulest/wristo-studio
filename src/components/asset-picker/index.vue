<template>
  <div
    class="asset-picker"
    :class="{ 'is-drag-over': dragOver }"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <button class="asset-trigger" type="button" @click="openAssetDialog">
      <span class="asset-trigger-preview" :class="{ empty: !currentPreviewUrl }">
        <img v-if="currentPreviewUrl" :src="currentPreviewUrl" :alt="t('asset.currentAsset')" />
        <el-icon v-else><Plus /></el-icon>
      </span>
      <span class="asset-trigger-copy">
        <strong>{{ t('asset.openLibrary') }}</strong>
        <small>{{ t('asset.directDropHint') }}</small>
      </span>
    </button>
    <input
      ref="uploadInput"
      type="file"
      :accept="uploadAccept"
      multiple
      style="display: none"
      @change="handleUpload"
    />

    <el-dialog
      v-model="assetDialogVisible"
      :title="t('asset.libraryTitle')"
      append-to-body
      width="min(1520px, 96vw)"
      class="asset-library-dialog"
    >
      <div
        class="asset-drop-zone"
        :class="{ 'is-drag-over': dragOver }"
        @click="triggerUpload"
        @dragenter.prevent="handleDragEnter"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
      >
        <el-icon class="upload-icon"><Plus /></el-icon>
        <div class="asset-drop-copy">
          <strong>{{ uploading ? t('common.uploading') : t('asset.upload') }}</strong>
          <span>{{ t('asset.dropMultiHint') }}</span>
        </div>
      </div>

      <div v-if="uploadQueue.length" class="upload-queue">
        <div class="upload-queue-header">
          <strong>{{ t('asset.uploadQueue') }}</strong>
          <span>{{ t('asset.uploadQueueSummary', { done: completedUploadCount, total: uploadQueue.length }) }}</span>
        </div>
        <div class="upload-queue-list">
          <div
            v-for="item in uploadQueue"
            :key="item.id"
            class="upload-queue-item"
            :class="`status-${item.status}`"
          >
            <span class="upload-file-name" :title="item.file.name">{{ item.file.name }}</span>
            <span class="upload-file-status">{{ uploadStatusLabel(item.status) }}</span>
          </div>
        </div>
      </div>
      <div
        v-else-if="uploadSummaryMessage"
        class="upload-complete-message"
        :class="`tone-${uploadSummaryTone}`"
      >
        {{ uploadSummaryMessage }}
      </div>

      <div v-if="canViewAllAssets" class="asset-scope-tabs">
        <el-segmented
          v-model="assetScope"
          :options="assetScopeOptions"
          size="small"
          @change="handleScopeChange"
        />
      </div>

      <div class="asset-grid" @scroll="handleAssetGridScroll">
        <!-- 素材列表 -->
        <div
          v-for="asset in assets"
          :key="asset.id"
          class="asset-item"
          :class="{
            active: isAssetSelected(asset),
            deleting: deletingId === asset.id
          }"
          @click="handleSelect(asset)"
          @mouseenter="handleMouseEnter(asset, $event)"
          @mouseleave="handleMouseLeave"
        >
          <img v-if="getAssetUrl(asset)" :src="getAssetUrl(asset)" :alt="asset.file?.name" />
          <el-icon
            v-if="isEditableSvgAsset(asset)"
            class="edit-icon"
            @click.stop="openSvgEditor(asset)"
            :title="t('asset.editSvgColors')"
          >
            <Edit />
          </el-icon>
          <el-icon
            v-if="canRemoveAsset(asset) && !isAssetSelected(asset)"
            class="delete-icon"
            @click.stop="handleRemove(asset)"
            :title="t('asset.deleteAsset')"
          >
            <Delete />
          </el-icon>
          <el-icon v-if="asset.isSystem" class="system-badge"><Star /></el-icon>
        </div>

        <!-- 加载中 -->
        <div v-if="loading" class="asset-item loading-item">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <span>{{ t('asset.loading') }}</span>
        </div>
      </div>

      <div class="asset-scroll-hint">
        <span v-if="loading">
          <el-icon class="hint-loading-icon"><Loading /></el-icon>
          {{ t('asset.loading') }}
        </span>
        <button v-else-if="hasMore" class="asset-scroll-more" type="button" @click="loadMore">
          {{ t('asset.scrollForMore') }}
        </button>
        <span v-else-if="assets.length">{{ t('asset.noMore') }}</span>
      </div>

      <template #footer>
        <el-button @click="assetDialogVisible = false">{{ t('common.close') }}</el-button>
      </template>
    </el-dialog>

    <Teleport to="body">
      <div
        v-if="hoverPreviewUrl"
        class="asset-large-preview"
        :style="hoverPreviewStyle"
      >
        <img :src="hoverPreviewUrl" :alt="hoverPreviewAsset?.file?.name" />
      </div>
    </Teleport>

    <el-dialog
      v-model="svgEditorVisible"
      :title="t('asset.editSvgColors')"
      append-to-body
      width="880px"
      class="svg-color-dialog"
    >
      <div v-if="svgPreviewUrl" class="svg-editor-preview">
        <img :src="svgPreviewUrl" :alt="editingSvgAsset?.file?.name || t('asset.editSvgColors')" />
      </div>
      <div v-if="hasSvgEditableEntries" class="svg-editor-fields">
        <div v-if="svgColorEntries.length" class="svg-editor-section">
          <div class="svg-editor-section-title">{{ t('asset.svgColors') }}</div>
          <div
            v-for="entry in svgColorEntries"
            :key="entry.id"
            class="svg-color-row"
          >
            <div class="svg-color-meta">
              <span class="svg-color-prop">{{ entry.property }}</span>
              <span class="svg-color-value">{{ entry.originalValue }}</span>
            </div>
            <ColorPicker v-model="entry.nextColor" class="svg-color-picker" />
          </div>
        </div>
        <div v-if="svgStopEntries.length" class="svg-editor-section">
          <div class="svg-editor-section-title">{{ t('asset.svgGradientStops') }}</div>
          <div
            v-for="entry in svgStopEntries"
            :key="entry.id"
            class="svg-stop-row"
          >
            <div class="svg-stop-name">Stop {{ entry.index + 1 }}</div>
            <label class="svg-stop-field">
              <span>{{ t('asset.svgStopOffset') }}</span>
              <el-input
                v-model="entry.nextOffset"
                size="small"
                placeholder="0%"
              />
            </label>
            <label class="svg-stop-field">
              <span>{{ t('asset.svgStopOpacity') }}</span>
              <el-input
                v-model="entry.nextOpacity"
                size="small"
                placeholder="1"
              />
            </label>
          </div>
        </div>
      </div>
      <div v-else class="svg-color-empty">
        {{ t('asset.noEditableSvgColors') }}
      </div>
      <template #footer>
        <el-button @click="svgEditorVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button
          type="primary"
          :loading="svgSaving"
          :disabled="!hasSvgEditableEntries"
          @click="saveEditedSvgAsset"
        >
          {{ t('asset.applySvgColors') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, PropType, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Loading, Star, Delete, Edit } from '@element-plus/icons-vue'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import type { AnalogAssetVO, AnalogAssetType } from '@/types/api/analog-asset'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { useUserStore } from '@/stores/user'
import { useI18n } from '@/i18n'
import ColorPicker from '@/components/color-picker/index.vue'

type SvgColorProperty = 'fill' | 'stroke' | 'stop-color'

interface SvgColorEntry {
  id: string
  property: SvgColorProperty
  originalValue: string
  nextColor: string
}

interface SvgStopEntry {
  id: string
  index: number
  nextOffset: string
  nextOpacity: string
}

type UploadQueueStatus = 'pending' | 'uploading' | 'success' | 'failed'

interface UploadQueueItem {
  id: string
  file: File
  status: UploadQueueStatus
}

const { t } = useI18n()
const analogAssetStore = useAnalogAssetStore()
const userStore = useUserStore()

const props = defineProps({
  /** 当前选中的URL */
  selectedUrl: {
    type: String,
    default: ''
  },
  /** 素材类型 */
  assetType: {
    type: String as PropType<AnalogAssetType>,
    required: true
  },
  /** 当前选中的素材ID（优先于selectedUrl） */
  selectedAssetId: {
    type: Number,
    default: null
  },
  /** 选择回调 */
  onSelect: {
    type: Function as PropType<(url: string, asset: AnalogAssetVO) => void>,
    required: true
  },
  /** 上传成功回调 */
  onUpload: {
    type: Function as PropType<(url: string, asset: AnalogAssetVO) => void>,
    required: true
  }
})

const uploadInput = ref<HTMLInputElement | null>(null)
const assets = ref<AnalogAssetVO[]>([])
const loading = ref(false)
const uploading = ref(false)
const hasMore = ref(true)
const pageNum = ref(1)
const pageSize = 48
const assetScope = ref<'mine' | 'all'>('mine')
const deletingId = ref<number | null>(null)
const assetDialogVisible = ref(false)
const uploadQueue = ref<UploadQueueItem[]>([])
const uploadSummaryMessage = ref('')
const uploadSummaryTone = ref<'success' | 'warning' | 'danger'>('success')
const hoverPreviewAsset = ref<AnalogAssetVO | null>(null)
const hoverPreviewStyle = ref<Record<string, string>>({})
const dragOver = ref(false)
const svgEditorVisible = ref(false)
const svgSaving = ref(false)
const editingSvgAsset = ref<AnalogAssetVO | null>(null)
const editingSvgText = ref('')
const svgColorEntries = ref<SvgColorEntry[]>([])
const svgStopEntries = ref<SvgStopEntry[]>([])
const svgColorProperties: SvgColorProperty[] = ['fill', 'stroke', 'stop-color']

const canViewAllAssets = computed(() => userStore.isMerchantUser || userStore.isAdminUser)
const currentUserId = computed(() => userStore.userInfo?.id ?? null)
const assetScopeOptions = computed(() => [
  { label: t('asset.scopeMine'), value: 'mine' },
  { label: t('asset.scopeAll'), value: 'all' },
])

const hasSvgEditableEntries = computed(() => svgColorEntries.value.length > 0 || svgStopEntries.value.length > 0)

const hoverPreviewUrl = computed(() => {
  if (!hoverPreviewAsset.value) return undefined
  return getAssetUrl(hoverPreviewAsset.value)
})

const currentPreviewUrl = computed(() => {
  if (props.selectedAssetId != null) {
    const selectedAsset = assets.value.find((asset) => asset.id === props.selectedAssetId)
    const selectedUrl = selectedAsset ? getAssetUrl(selectedAsset) : ''
    if (selectedUrl) return selectedUrl
  }
  return props.selectedUrl || ''
})

const completedUploadCount = computed(() =>
  uploadQueue.value.filter((item) => item.status === 'success' || item.status === 'failed').length
)

const uploadAccept = computed(() => {
  if (props.assetType === 'image') return '.svg,.png,.jpg,.jpeg,.webp'
  return '.svg'
})

const isAllowedUploadFile = (file: File): boolean => {
  if (props.assetType === 'image') {
    if (file.type?.startsWith('image/')) return true
    return /\.(svg|png|jpe?g|webp)$/i.test(file.name)
  }
  return /\.svg$/i.test(file.name)
}

const isSvgUrl = (value?: string): boolean => {
  const clean = String(value || '').split('?')[0].toLowerCase()
  return clean.endsWith('.svg')
}

const isEditableSvgAsset = (asset: AnalogAssetVO): boolean => {
  if (props.assetType !== 'image') return false
  return isSvgUrl(asset.file?.url) || isSvgUrl(asset.file?.name)
}

const openAssetDialog = () => {
  assetDialogVisible.value = true
}

const isAssetSelected = (asset: AnalogAssetVO): boolean => {
  const url = getAssetUrl(asset)
  return props.selectedAssetId != null ? asset.id === props.selectedAssetId : props.selectedUrl === url
}

const canRemoveAsset = (asset: AnalogAssetVO): boolean => {
  if (asset.isSystem) return false
  if (userStore.isAdminUser) return true
  return asset.userId != null && asset.userId === currentUserId.value
}

const uploadStatusLabel = (status: UploadQueueStatus): string => {
  if (status === 'pending') return t('asset.uploadPending')
  if (status === 'uploading') return t('common.uploading')
  if (status === 'success') return t('asset.uploadDone')
  return t('asset.uploadFailed')
}

/**
 * 获取素材展示URL
 * - windDirection：优先原始 SVG，避免固定尺寸 preview PNG 影响比例观感
 * - 其他类型：优先 previewUrl，兼顾加载性能
 */
const getAssetUrl = (asset: AnalogAssetVO): string | undefined => {
  if (props.assetType === 'windDirection') {
    return asset.file?.url || asset.file?.previewUrl
  }
  return asset.file?.previewUrl || asset.file?.url
}

/**
 * 加载素材列表
 */
const loadAssets = async (reset = false) => {
  if (loading.value) return
  
  if (reset) {
    pageNum.value = 1
    assets.value = []
    hasMore.value = true
  }

  loading.value = true
  try {
    const res = await analogAssetApi.page({
      pageNum: pageNum.value,
      pageSize,
      analogAssetType: props.assetType,
      isActive: true,
      orderBy: 'createdAt:desc',
      scope: canViewAllAssets.value ? assetScope.value : 'mine',
    })
    
    if (res.data) {
      const newAssets = res.data.list || []
      if (reset) {
        assets.value = newAssets
      } else {
        assets.value.push(...newAssets)
      }
      hasMore.value = assets.value.length < res.data.total
    }
  } catch (error) {
    console.error('加载素材失败:', error)
    ElMessage.error(t('asset.loadFailed'))
  } finally {
    loading.value = false
  }
}

/**
 * 加载更多
 */
const loadMore = () => {
  if (loading.value || !hasMore.value) return
  pageNum.value++
  loadAssets()
}

const handleAssetGridScroll = (event: Event) => {
  const target = event.currentTarget as HTMLElement | null
  if (!target || loading.value || !hasMore.value) return

  const preloadOffset = 120
  const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight
  if (distanceToBottom <= preloadOffset) {
    loadMore()
  }
}

/**
 * 刷新列表
 */
const refresh = () => {
  loadAssets(true)
}

const handleScopeChange = () => {
  loadAssets(true)
}

/**
 * 触发上传
 */
const triggerUpload = () => {
  uploadInput.value?.click()
}

const uploadFile = async (file: File | undefined, showMessage = false): Promise<boolean> => {
  if (!file) return false

  if (!isAllowedUploadFile(file)) {
    if (showMessage) {
      ElMessage.warning(props.assetType === 'image' ? t('asset.imageOnly') : t('asset.svgOnly'))
    }
    return false
  }

  try {
    const res = await analogAssetApi.upload(file, props.assetType)
    
    if (res.data) {
      assets.value.unshift(res.data)
      analogAssetStore.prependAsset(res.data)
      const url = getAssetUrl(res.data)
      if (url) {
        props.onUpload(url, res.data)
      }
      if (showMessage) ElMessage.success(t('asset.uploadSuccess'))
      return true
    }
    return false
  } catch (error) {
    console.error('上传失败:', error)
    if (showMessage) ElMessage.error(t('asset.uploadFailed'))
    return false
  }
}

const processUploadFiles = async (fileList: FileList | File[] | undefined | null) => {
  if (!fileList || uploading.value) return

  const files = Array.from(fileList)
  if (!files.length) return

  const validFiles: File[] = []
  let invalidCount = 0
  for (const file of files) {
    if (isAllowedUploadFile(file)) {
      validFiles.push(file)
    } else {
      invalidCount++
    }
  }

  if (invalidCount > 0) {
    ElMessage.warning(props.assetType === 'image' ? t('asset.imageOnly') : t('asset.svgOnly'))
  }
  if (!validFiles.length) return

  assetDialogVisible.value = true
  uploadSummaryMessage.value = ''
  uploadQueue.value = validFiles.map((file, index) => ({
    id: `${Date.now()}-${index}-${file.name}`,
    file,
    status: 'pending',
  }))

  uploading.value = true
  let successCount = 0
  for (const item of uploadQueue.value) {
    item.status = 'uploading'
    const ok = await uploadFile(item.file)
    item.status = ok ? 'success' : 'failed'
    if (ok) successCount++
  }
  uploading.value = false

  if (successCount === validFiles.length) {
    uploadSummaryTone.value = 'success'
    uploadSummaryMessage.value = t('asset.uploadSuccessCount', { count: successCount })
  } else if (successCount > 0) {
    uploadSummaryTone.value = 'warning'
    uploadSummaryMessage.value = t('asset.uploadPartialCount', { success: successCount, failed: validFiles.length - successCount })
  } else {
    uploadSummaryTone.value = 'danger'
    uploadSummaryMessage.value = t('asset.uploadFailedCount', { count: validFiles.length })
  }
  uploadQueue.value = []
}

/**
 * 处理上传
 */
const handleUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  await processUploadFiles(input.files)
  input.value = ''
}

const handleDragEnter = () => {
  dragOver.value = true
}

const handleDragOver = () => {
  dragOver.value = true
}

const handleDragLeave = () => {
  dragOver.value = false
}

const handleDrop = async (event: DragEvent) => {
  dragOver.value = false
  await processUploadFiles(event.dataTransfer?.files)
}

/**
 * 处理选择
 */
const handleSelect = (asset: AnalogAssetVO) => {
  const url = getAssetUrl(asset)
  if (url) {
    props.onSelect(url, asset)
  }
}

/**
 * 悬停预览
 */
const updatePreviewPosition = (target: HTMLElement) => {
  const rect = target.getBoundingClientRect()
  const previewSize = 200
  const gap = 10
  const viewportPadding = 12
  const centeredLeft = rect.left + rect.width / 2 - previewSize / 2
  const left = Math.min(
    Math.max(centeredLeft, viewportPadding),
    window.innerWidth - previewSize - viewportPadding
  )
  const top = rect.top - previewSize - gap >= viewportPadding
    ? rect.top - previewSize - gap
    : Math.min(rect.bottom + gap, window.innerHeight - previewSize - viewportPadding)

  hoverPreviewStyle.value = {
    left: `${left}px`,
    top: `${Math.max(top, viewportPadding)}px`,
  }
}

const handleMouseEnter = (asset: AnalogAssetVO, event: MouseEvent) => {
  hoverPreviewAsset.value = asset
  const target = event.currentTarget as HTMLElement | null
  if (target) updatePreviewPosition(target)
}

const handleMouseLeave = () => {
  hoverPreviewAsset.value = null
  hoverPreviewStyle.value = {}
}

const isEditableColorValue = (value: string | null): value is string => {
  const raw = String(value || '').trim()
  if (!raw) return false
  const lower = raw.toLowerCase()
  if (['none', 'transparent', 'currentcolor', 'inherit', 'initial', 'unset'].includes(lower)) return false
  if (lower.startsWith('url(') || lower.startsWith('var(')) return false
  return Boolean(toHexColor(raw))
}

const toHexColor = (value: string): string => {
  const raw = value.trim()
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase()
  const shortHex = raw.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i)
  if (shortHex) {
    return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`.toLowerCase()
  }
  const rgb = raw.match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i)
  if (rgb) {
    const parts = rgb.slice(1, 4).map((part) => Math.max(0, Math.min(255, Number(part))))
    return `#${parts.map((part) => part.toString(16).padStart(2, '0')).join('')}`
  }

  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = '#000000'
  ctx.fillStyle = raw
  return /^#[0-9a-f]{6}$/i.test(ctx.fillStyle) ? ctx.fillStyle.toLowerCase() : ''
}

const collectStyleColorEntries = (styleValue: string, entries: Map<string, SvgColorEntry>) => {
  const declarations = styleValue.split(';')
  for (const declaration of declarations) {
    const [rawName, ...rawValueParts] = declaration.split(':')
    const property = rawName?.trim() as SvgColorProperty
    if (!svgColorProperties.includes(property)) continue
    const value = rawValueParts.join(':').trim()
    if (!isEditableColorValue(value)) continue
    const key = `${property}:${value}`
    if (!entries.has(key)) {
      entries.set(key, {
        id: key,
        property,
        originalValue: value,
        nextColor: toHexColor(value),
      })
    }
  }
}

const parseSvgColorEntries = (svgText: string): SvgColorEntry[] => {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid SVG')
  }

  const entries = new Map<string, SvgColorEntry>()
  doc.querySelectorAll('*').forEach((node) => {
    for (const property of svgColorProperties) {
      const value = node.getAttribute(property)
      if (!isEditableColorValue(value)) continue
      const key = `${property}:${value}`
      if (!entries.has(key)) {
        entries.set(key, {
          id: key,
          property,
          originalValue: value,
          nextColor: toHexColor(value),
        })
      }
    }

    const styleValue = node.getAttribute('style')
    if (styleValue) collectStyleColorEntries(styleValue, entries)
  })

  return Array.from(entries.values())
}

const parseSvgStopEntries = (svgText: string): SvgStopEntry[] => {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid SVG')
  }

  return Array.from(doc.querySelectorAll('stop')).map((node, index) => ({
    id: `stop:${index}`,
    index,
    nextOffset: node.getAttribute('offset') || '',
    nextOpacity: node.getAttribute('stop-opacity') || '',
  }))
}

const updateStyleDeclaration = (styleValue: string, updates: SvgColorEntry[]): string => {
  return styleValue
    .split(';')
    .map((declaration) => {
      const [rawName, ...rawValueParts] = declaration.split(':')
      const property = rawName?.trim() as SvgColorProperty
      if (!svgColorProperties.includes(property)) return declaration
      const value = rawValueParts.join(':').trim()
      const update = updates.find((entry) => entry.property === property && entry.originalValue === value)
      if (!update) return declaration
      return `${rawName.trim()}: ${update.nextColor}`
    })
    .join(';')
}

const buildEditedSvgText = (): string => {
  const doc = new DOMParser().parseFromString(editingSvgText.value, 'image/svg+xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid SVG')
  }

  doc.querySelectorAll('*').forEach((node) => {
    for (const entry of svgColorEntries.value) {
      if (node.getAttribute(entry.property) === entry.originalValue) {
        node.setAttribute(entry.property, entry.nextColor)
      }
    }

    const styleValue = node.getAttribute('style')
    if (styleValue) {
      node.setAttribute('style', updateStyleDeclaration(styleValue, svgColorEntries.value))
    }
  })

  doc.querySelectorAll('stop').forEach((node, index) => {
    const entry = svgStopEntries.value[index]
    if (!entry) return

    const offset = entry.nextOffset.trim()
    if (offset) {
      node.setAttribute('offset', offset)
    } else {
      node.removeAttribute('offset')
    }

    const opacity = entry.nextOpacity.trim()
    if (opacity) {
      node.setAttribute('stop-opacity', opacity)
    } else {
      node.removeAttribute('stop-opacity')
    }
  })

  return new XMLSerializer().serializeToString(doc)
}

const svgPreviewUrl = computed(() => {
  if (!editingSvgText.value) return ''

  try {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildEditedSvgText())}`
  } catch {
    return ''
  }
})

const openSvgEditor = async (asset: AnalogAssetVO) => {
  const svgUrl = asset.file?.url
  if (!svgUrl) return

  handleMouseLeave()
  editingSvgAsset.value = asset
  svgEditorVisible.value = true
  svgColorEntries.value = []
  svgStopEntries.value = []
  editingSvgText.value = ''

  try {
    const response = await fetch(svgUrl, { credentials: 'same-origin' })
    if (!response.ok) throw new Error(`Failed to load SVG: ${response.status}`)
    const svgText = await response.text()
    editingSvgText.value = svgText
    svgColorEntries.value = parseSvgColorEntries(svgText)
    svgStopEntries.value = parseSvgStopEntries(svgText)
  } catch (error) {
    console.error('加载 SVG 失败:', error)
    ElMessage.error(t('asset.loadSvgFailed'))
    svgEditorVisible.value = false
  }
}

const saveEditedSvgAsset = async () => {
  if (!editingSvgAsset.value || !editingSvgText.value) return

  svgSaving.value = true
  try {
    const editedSvgText = buildEditedSvgText()
    const originalName = editingSvgAsset.value.file?.name || `asset-${editingSvgAsset.value.id}.svg`
    const baseName = originalName.replace(/\.svg$/i, '')
    const file = new File([editedSvgText], `${baseName}-recolor.svg`, { type: 'image/svg+xml' })
    const ok = await uploadFile(file, true)
    if (ok) {
      svgEditorVisible.value = false
      editingSvgAsset.value = null
      editingSvgText.value = ''
      svgColorEntries.value = []
      svgStopEntries.value = []
    }
  } catch (error) {
    console.error('保存 SVG 失败:', error)
    ElMessage.error(t('asset.saveSvgFailed'))
  } finally {
    svgSaving.value = false
  }
}

/**
 * 删除素材
 */
const handleRemove = async (asset: AnalogAssetVO) => {
  try {
    await ElMessageBox.confirm(t('asset.deleteConfirm'), t('common.tip'), {
      type: 'warning',
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel')
    })
  } catch {
    return
  }

  deletingId.value = asset.id
  try {
    const res = await analogAssetApi.remove(asset.id)
    if (res.data) {
      const idx = assets.value.findIndex(a => a.id === asset.id)
      if (idx !== -1) assets.value.splice(idx, 1)
      analogAssetStore.removeAsset(props.assetType, asset.id)
      ElMessage.success(t('common.deleteSuccess'))
    } else {
      ElMessage.error(t('asset.deleteFailed'))
    }
  } catch (e) {
    console.error('删除素材失败:', e)
    ElMessage.error(t('asset.deleteFailed'))
  } finally {
    deletingId.value = null
  }
}

// 初始化加载
onMounted(() => {
  loadAssets(true)
})

// 暴露刷新方法
defineExpose({
  refresh,
  loadAssets
})
</script>

<style scoped>
.asset-picker {
  display: flex;
  width: 100%;
}

.asset-picker.is-drag-over .asset-trigger {
  border-color: #0f6b68;
  background: var(--studio-primary-soft);
  box-shadow: 0 0 0 2px rgba(15, 107, 104, 0.12);
}

.asset-trigger {
  width: 100%;
  min-height: 72px;
  border: 1px dashed var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
  color: var(--studio-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  text-align: left;
  transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
}

.asset-trigger:hover {
  border-color: #0f6b68;
  background: var(--studio-primary-soft);
}

.asset-trigger-preview {
  width: 52px;
  height: 52px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-sm);
  background-color: #f7f7f7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.asset-trigger-preview.empty {
  border-style: dashed;
  color: var(--studio-text-muted);
}

.asset-trigger-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.asset-trigger-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.asset-trigger-copy strong {
  font-size: 13px;
  color: var(--studio-text);
}

.asset-trigger-copy small {
  font-size: 12px;
  color: var(--studio-text-muted);
  line-height: 1.35;
}

:deep(.asset-library-dialog .el-dialog__body) {
  padding: 18px 20px;
}

.asset-drop-zone {
  min-height: 92px;
  border: 1px dashed var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 14px;
  transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
}

.asset-drop-zone:hover,
.asset-drop-zone.is-drag-over {
  border-color: #0f6b68;
  background: var(--studio-primary-soft);
  box-shadow: 0 0 0 2px rgba(15, 107, 104, 0.12);
}

.asset-drop-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.asset-drop-copy strong {
  font-size: 14px;
  color: var(--studio-text);
}

.asset-drop-copy span {
  font-size: 12px;
  color: var(--studio-text-muted);
}

.asset-grid {
  max-height: 536px;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
  padding: 2px;
}

.upload-queue {
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface);
  margin-bottom: 14px;
  overflow: hidden;
}

.upload-queue-header,
.upload-queue-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.upload-queue-header {
  padding: 9px 12px;
  border-bottom: 1px solid var(--studio-border);
  font-size: 12px;
  color: var(--studio-text-muted);
}

.upload-queue-header strong {
  color: var(--studio-text);
}

.upload-queue-list {
  max-height: 160px;
  overflow: auto;
}

.upload-queue-item {
  min-height: 34px;
  padding: 7px 12px;
  font-size: 12px;
}

.upload-queue-item + .upload-queue-item {
  border-top: 1px solid var(--studio-border);
}

.upload-file-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--studio-text);
}

.upload-file-status {
  flex: 0 0 auto;
  color: var(--studio-text-muted);
}

.upload-queue-item.status-uploading .upload-file-status {
  color: #0f6b68;
}

.upload-queue-item.status-success .upload-file-status {
  color: #67c23a;
}

.upload-queue-item.status-failed .upload-file-status {
  color: #f56c6c;
}

.upload-complete-message {
  margin: -2px 0 12px;
  font-size: 12px;
  line-height: 1.4;
  color: #67c23a;
}

.upload-complete-message.tone-warning {
  color: #e6a23c;
}

.upload-complete-message.tone-danger {
  color: #f56c6c;
}

.asset-scope-tabs {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 12px;
}

.asset-scope-tabs :deep(.el-segmented) {
  --el-segmented-item-selected-bg-color: var(--studio-primary-soft);
  --el-segmented-item-selected-color: var(--studio-primary);
}

.asset-scroll-hint {
  margin-top: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 24px;
  color: var(--studio-text-muted);
  font-size: 12px;
}

.asset-scroll-hint span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.asset-scroll-more {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--studio-primary);
  font: inherit;
  cursor: pointer;
}

.asset-scroll-more:hover {
  text-decoration: underline;
}

.hint-loading-icon {
  color: #0f6b68;
  animation: spin 1s linear infinite;
}

.asset-item {
  width: 80px;
  height: 80px;
  border: 1px solid #c0c4cc;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  position: relative;
  background-color: #f7f7f7;
}

.asset-item:hover {
  border-color: #0f6b68;
  box-shadow: 0 2px 8px rgba(15, 107, 104, 0.2);
}

.asset-item.active {
  border-color: #0f6b68;
  background-color: var(--studio-primary-soft);
  border-width: 2px;
}

.asset-item.deleting {
  opacity: 0.6;
  pointer-events: none;
}

.asset-item img {
  width: 60px;
  height: 60px;
  object-fit: contain;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.5));
}

.upload-item {
  border-style: dashed;
  background-color: #fafafa;
}

.upload-item:hover {
  background-color: var(--studio-primary-soft);
}

.upload-item.is-drag-over {
  border-color: #0f6b68;
  background-color: var(--studio-primary-soft);
  box-shadow: 0 0 0 2px rgba(15, 107, 104, 0.12);
}

.upload-icon {
  font-size: 24px;
  color: #909399;
  margin-bottom: 4px;
}

.upload-item:hover .upload-icon,
.upload-item.is-drag-over .upload-icon {
  color: #0f6b68;
}

.upload-item span,
.action-item span,
.loading-item span {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.action-item {
  border-style: dashed;
  background-color: #fafafa;
}

.action-item:hover {
  background-color: var(--studio-primary-soft);
}

.action-icon {
  font-size: 20px;
  color: #909399;
  margin-bottom: 2px;
}

.action-item:hover .action-icon {
  color: #0f6b68;
}

.action-item:hover span {
  color: #0f6b68;
}

.loading-item {
  border-style: dashed;
  background-color: #fafafa;
  cursor: default;
}

.asset-large-preview {
  position: fixed;
  width: 200px;
  height: 200px;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  background-image:
    linear-gradient(45deg, #eee 25%, transparent 25%),
    linear-gradient(-45deg, #eee 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #eee 75%),
    linear-gradient(-45deg, transparent 75%, #eee 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  z-index: 13000;
}

.asset-large-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.loading-icon {
  font-size: 20px;
  color: #0f6b68;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.system-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 14px;
  color: #e6a23c;
}

.edit-icon {
  position: absolute;
  top: 4px;
  left: 4px;
  font-size: 16px;
  color: #0f6b68;
  background-color: rgba(255, 255, 255, 0.92);
  border-radius: 10px;
  padding: 2px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1;
}

.delete-icon {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 16px;
  color: #f56c6c;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  padding: 2px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1;
}

.asset-item:hover .delete-icon {
  opacity: 1;
}

.asset-item:hover .edit-icon {
  opacity: 1;
}

:deep(.svg-color-dialog) {
  display: flex;
  flex-direction: column;
  max-width: calc(100vw - 48px);
}

:deep(.svg-color-dialog .el-dialog__body) {
  padding: 20px 24px;
}

:deep(.svg-color-dialog .el-dialog__footer) {
  flex: 0 0 auto;
}

.svg-editor-preview {
  width: 100%;
  height: min(34vh, 320px);
  margin-bottom: 20px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background-image:
    linear-gradient(45deg, #eee 25%, transparent 25%),
    linear-gradient(-45deg, #eee 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #eee 75%),
    linear-gradient(-45deg, transparent 75%, #eee 75%);
  background-size: 10px 10px;
  background-position: 0 0, 0 5px, 5px -5px, -5px 0;
  background-color: #f7f7f7;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.svg-editor-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 14px;
}

.svg-editor-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.svg-editor-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.svg-editor-section-title {
  font-size: 12px;
  font-weight: 750;
  color: var(--studio-text-muted);
}

.svg-color-row,
.svg-stop-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
}

.svg-stop-row {
  align-items: flex-end;
}

.svg-color-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.svg-color-prop {
  font-size: 12px;
  font-weight: 750;
  color: var(--studio-text);
}

.svg-color-value {
  max-width: 280px;
  font-size: 12px;
  color: var(--studio-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.svg-color-picker {
  flex: 0 0 132px;
  width: 132px;
}

.svg-stop-name {
  flex: 0 0 64px;
  font-size: 12px;
  font-weight: 750;
  color: var(--studio-text);
  padding-bottom: 6px;
}

.svg-stop-field {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--studio-text-muted);
}

.svg-color-empty {
  padding: 24px 12px;
  text-align: center;
  color: var(--studio-text-muted);
}
</style>
