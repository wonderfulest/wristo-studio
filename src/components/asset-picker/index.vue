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

    <el-drawer
      v-model="assetDialogVisible"
      :title="t('asset.libraryTitle')"
      append-to-body
      direction="rtl"
      :size="assetDrawerSize"
      :modal="false"
      :close-on-click-modal="false"
      class="asset-library-drawer"
    >
      <div class="asset-drawer-resize-handle" @mousedown.prevent="startAssetDrawerResize" />
      <div class="asset-library-toolbar">
        <div class="asset-toolbar-summary">
          <span v-if="batchDeleting">
            {{ t('asset.deletingProgress', { done: deleteProgressDone, total: deleteProgressTotal }) }}
          </span>
          <span v-else-if="batchManageMode">{{ t('asset.selectedCount', { count: selectedAssetIds.length }) }}</span>
        </div>
        <div class="asset-toolbar-actions">
          <el-button size="small" :type="uploadPanelVisible ? 'default' : 'primary'" @click="toggleUploadPanel">
            <el-icon><Plus /></el-icon>
            {{ uploadPanelVisible ? t('asset.hideUploadArea') : t('asset.showUploadArea') }}
          </el-button>
          <el-button
            v-if="canManageAssets"
            size="small"
            :disabled="batchDeleting"
            @click="toggleBatchManageMode"
          >
            {{ batchManageMode ? t('asset.finishManagement') : t('asset.manageAssets') }}
          </el-button>
          <el-button
            v-if="batchManageMode"
            size="small"
            :disabled="batchDeleting || !removableAssets.length"
            @click="selectAllLoadedAssets"
          >
            {{ t('asset.selectAllLoaded') }}
          </el-button>
          <el-button
            v-if="batchManageMode"
            size="small"
            :disabled="batchDeleting || !selectedAssetIds.length"
            @click="clearBatchSelection"
          >
            {{ t('asset.clearSelection') }}
          </el-button>
          <el-button
            v-if="batchManageMode"
            size="small"
            type="danger"
            :loading="batchDeleting"
            :disabled="!selectedAssetIds.length"
            @click="handleBatchRemove"
          >
            {{ t('asset.deleteSelected') }}
          </el-button>
        </div>
      </div>
      <div
        v-if="uploadPanelVisible"
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
      <el-progress
        v-if="batchDeleting"
        class="asset-delete-progress"
        :percentage="deleteProgressPercent"
        :stroke-width="6"
        :show-text="false"
      />

      <div class="asset-grid" :class="{ 'batch-manage': batchManageMode }" @scroll.passive="handleAssetGridScroll">
        <!-- 素材列表 -->
        <div
          v-for="asset in sortedAssets"
          :key="asset.id"
          class="asset-item"
          :class="{
            active: isAssetSelected(asset),
            deleting: isDeletingAsset(asset.id),
            'batch-selected': isBatchSelected(asset.id),
            'not-removable': batchManageMode && !canRemoveAsset(asset),
            'system-asset': asset.isSystem
          }"
          @click="handleSelect(asset, $event)"
          @mouseenter="handleMouseEnter(asset, $event)"
          @mouseleave="handleMouseLeave"
        >
          <el-checkbox
            v-if="batchManageMode"
            class="asset-batch-checkbox"
            :model-value="isBatchSelected(asset.id)"
            :disabled="!canRemoveAsset(asset)"
            @click.stop.prevent="handleBatchSelectionClick(asset, $event)"
          />
          <img v-if="getAssetUrl(asset)" :src="getAssetUrl(asset)" :alt="asset.file?.name" />
          <button
            v-if="!batchManageMode"
            type="button"
            class="favorite-button"
            :class="{ favorited: isFavoriteAsset(asset) }"
            :disabled="isFavoritingAsset(asset.id)"
            @click.stop="toggleFavoriteAsset(asset)"
            :title="isFavoriteAsset(asset) ? t('asset.removeFavorite') : t('asset.addFavorite')"
          >
            <el-icon>
              <Loading v-if="isFavoritingAsset(asset.id)" />
              <StarFilled v-else-if="isFavoriteAsset(asset)" />
              <Star v-else />
            </el-icon>
          </button>
          <el-icon
            v-if="isEditableSvgAsset(asset) && !batchManageMode"
            class="edit-icon"
            @click.stop="openSvgEditor(asset)"
            :title="t('asset.editSvgColors')"
          >
            <Edit />
          </el-icon>
          <el-icon
            v-if="canRemoveAsset(asset) && !isAssetSelected(asset) && !batchManageMode"
            class="delete-icon"
            @click.stop="handleRemove(asset)"
            :title="t('asset.deleteAsset')"
          >
            <Delete />
          </el-icon>
          <el-icon
            v-if="getOriginalAssetUrl(asset) && !batchManageMode"
            class="download-icon"
            @click.stop="handleDownloadAsset(asset)"
            :title="t('common.download')"
          >
            <Download />
          </el-icon>
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
    </el-drawer>

    <Teleport to="body">
      <div
        v-if="hoverPreviewUrl"
        class="asset-large-preview"
        :style="hoverPreviewStyle"
      >
        <img :src="hoverPreviewUrl" :alt="hoverPreviewAsset?.file?.name" />
      </div>
    </Teleport>

    <SvgEditorDialog
      v-model="svgEditorVisible"
      :initial-svg="editingSvgText"
      :saving="svgSaving"
      :title="t('asset.editSvgColors')"
      :placeholder="t('icon.svgPlaceholder')"
      :save-label="t('asset.applySvgColors')"
      :empty-color-message="t('asset.noEditableSvgColors')"
      :z-index="16000"
      @save="saveEditedSvgAsset"
      @closed="closeSvgEditor"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, PropType, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Loading, Star, StarFilled, Delete, Edit, Download } from '@element-plus/icons-vue'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import type { AnalogAssetVO, AnalogAssetType } from '@/types/api/analog-asset'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { useUserStore } from '@/stores/user'
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'
import { useI18n } from '@/i18n'
import { isAllowedAnalogAssetFile, isHandAssetType, svgFileContainsRasterImage } from '@/utils/assetUploadValidation'
import SvgEditorDialog from '@/components/svg-editor/SvgEditorDialog.vue'

type UploadQueueStatus = 'pending' | 'uploading' | 'success' | 'failed'

interface UploadQueueItem {
  id: string
  file: File
  status: UploadQueueStatus
}

const { t } = useI18n()
const analogAssetStore = useAnalogAssetStore()
const userStore = useUserStore()
const editorLayoutStore = useEditorLayoutStore()

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
const deletingIds = ref<Set<number>>(new Set())
const batchDeleting = ref(false)
const batchManageMode = ref(false)
const selectedAssetIds = ref<number[]>([])
const lastBatchSelectedAssetId = ref<number | null>(null)
const deleteProgressDone = ref(0)
const deleteProgressTotal = ref(0)
const assetDialogVisible = ref(false)
const assetDrawerResizeStartX = ref(0)
const assetDrawerResizeStartWidth = ref(430)
const assetDrawerResizing = ref(false)
const uploadPanelVisible = ref(false)
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
const favoritingAssetIds = ref<Set<number>>(new Set())

const canViewAllAssets = computed(() => userStore.isMerchantUser || userStore.isAdminUser)
const assetScopeOptions = computed(() => [
  { label: t('asset.scopeMine'), value: 'mine' },
  { label: t('asset.scopeAll'), value: 'all' },
])
const removableAssets = computed(() => assets.value.filter((asset) => canRemoveAsset(asset)))
const canManageAssets = computed(() => userStore.isAdminUser || removableAssets.value.length > 0)
const assetDrawerSize = computed(() => `${editorLayoutStore.getWidth('assetLibraryDrawer')}px`)
const sortedAssets = computed(() => {
  return [...assets.value].sort((a, b) => {
    const aFavoriteWeight = Number(a.favoriteWeight || 0)
    const bFavoriteWeight = Number(b.favoriteWeight || 0)
    if (aFavoriteWeight !== bFavoriteWeight) return bFavoriteWeight - aFavoriteWeight
    return 0
  })
})
const deleteProgressPercent = computed(() => {
  if (!deleteProgressTotal.value) return 0
  return Math.round((deleteProgressDone.value / deleteProgressTotal.value) * 100)
})

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
  if (isHandAssetType(props.assetType)) return '.svg,.png'
  return '.svg'
})

const editableSvgAssetTypes: AnalogAssetType[] = ['image', 'hour', 'minute', 'second']

const isAllowedUploadFile = (file: File): boolean => isAllowedAnalogAssetFile(file, props.assetType)

const getUploadFileTypeMessage = (): string => {
  if (props.assetType === 'image') return t('asset.imageOnly')
  if (isHandAssetType(props.assetType)) return t('asset.handSvgPngOnly')
  return t('asset.svgOnly')
}

const isUploadFileAccepted = async (file: File, showMessage = false): Promise<boolean> => {
  if (!isAllowedUploadFile(file)) {
    if (showMessage) {
      ElMessage.warning(getUploadFileTypeMessage())
    }
    return false
  }

  if (await svgFileContainsRasterImage(file)) {
    if (showMessage) ElMessage.warning(t('asset.svgVectorOnly'))
    return false
  }

  return true
}

const isSvgUrl = (value?: string): boolean => {
  const clean = String(value || '').split('?')[0].toLowerCase()
  return clean.endsWith('.svg')
}

const isEditableSvgAsset = (asset: AnalogAssetVO): boolean => {
  if (!editableSvgAssetTypes.includes(props.assetType)) return false
  return isSvgUrl(asset.file?.url) || isSvgUrl(asset.file?.name)
}

const openAssetDialog = () => {
  editorLayoutStore.setWidth(
    'assetLibraryDrawer',
    clampAssetDrawerWidth(editorLayoutStore.getWidth('assetLibraryDrawer'))
  )
  assetDialogVisible.value = true
}

const toggleUploadPanel = () => {
  uploadPanelVisible.value = !uploadPanelVisible.value
}

const clampAssetDrawerWidth = (width: number): number => {
  if (typeof window === 'undefined') return Math.max(360, Math.min(1040, width))
  const viewportWidth = window.innerWidth
  const minWidth = Math.min(360, Math.max(280, viewportWidth - 32))
  const maxWidth = Math.max(minWidth, Math.min(1040, viewportWidth - 48))
  return Math.round(Math.max(minWidth, Math.min(maxWidth, width)))
}

const stopAssetDrawerResize = () => {
  if (!assetDrawerResizing.value) return
  assetDrawerResizing.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('mousemove', handleAssetDrawerResize)
  window.removeEventListener('mouseup', stopAssetDrawerResize)
}

const handleAssetDrawerResize = (event: MouseEvent) => {
  if (!assetDrawerResizing.value) return
  const delta = assetDrawerResizeStartX.value - event.clientX
  editorLayoutStore.setWidth(
    'assetLibraryDrawer',
    clampAssetDrawerWidth(assetDrawerResizeStartWidth.value + delta)
  )
}

const startAssetDrawerResize = (event: MouseEvent) => {
  assetDrawerResizing.value = true
  assetDrawerResizeStartX.value = event.clientX
  assetDrawerResizeStartWidth.value = editorLayoutStore.getWidth('assetLibraryDrawer')
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', handleAssetDrawerResize)
  window.addEventListener('mouseup', stopAssetDrawerResize)
}

const isAssetSelected = (asset: AnalogAssetVO): boolean => {
  const url = getAssetUrl(asset)
  return props.selectedAssetId != null ? asset.id === props.selectedAssetId : props.selectedUrl === url
}

const isFavoriteAsset = (asset: AnalogAssetVO): boolean => {
  return Number(asset.favoriteWeight || 0) > 0
}

const isFavoritingAsset = (id: number): boolean => favoritingAssetIds.value.has(id)

const updateAssetInList = (updatedAsset: AnalogAssetVO) => {
  const index = assets.value.findIndex((asset) => asset.id === updatedAsset.id)
  if (index >= 0) {
    assets.value[index] = {
      ...assets.value[index],
      ...updatedAsset,
      file: updatedAsset.file || assets.value[index].file,
    }
  }
}

const setFavoritingAsset = (id: number, active: boolean) => {
  const next = new Set(favoritingAssetIds.value)
  if (active) next.add(id)
  else next.delete(id)
  favoritingAssetIds.value = next
}

const toggleFavoriteAsset = async (asset: AnalogAssetVO) => {
  if (isFavoritingAsset(asset.id)) return

  const nextFavorite = !isFavoriteAsset(asset)
  const previousWeight = asset.favoriteWeight
  asset.favoriteWeight = nextFavorite ? Math.floor(Date.now() / 1000) : null
  setFavoritingAsset(asset.id, true)

  try {
    const res = await analogAssetApi.setFavorite(asset.id, nextFavorite)
    if (res.data) {
      updateAssetInList(res.data)
    }
  } catch (error) {
    console.error('保存素材收藏失败:', error)
    asset.favoriteWeight = previousWeight
    ElMessage.error(t('asset.favoriteFailed'))
  } finally {
    setFavoritingAsset(asset.id, false)
  }
}

const canRemoveAsset = (asset: AnalogAssetVO): boolean => {
  if (asset.isSystem) return false
  if (userStore.isAdminUser) return true
  const currentUserId = userStore.userInfo?.id
  return currentUserId != null && Number(asset.userId) === Number(currentUserId)
}

const isDeletingAsset = (id: number): boolean => deletingIds.value.has(id)

const isBatchSelected = (id: number): boolean => selectedAssetIds.value.includes(id)

const setDeletingIds = (ids: number[]) => {
  deletingIds.value = new Set(ids)
}

const toggleBatchManageMode = () => {
  batchManageMode.value = !batchManageMode.value
  if (!batchManageMode.value) {
    clearBatchSelection()
  }
}

const clearBatchSelection = () => {
  selectedAssetIds.value = []
  lastBatchSelectedAssetId.value = null
}

const toggleBatchSelection = (asset: AnalogAssetVO) => {
  if (!canRemoveAsset(asset)) return
  if (isBatchSelected(asset.id)) {
    selectedAssetIds.value = selectedAssetIds.value.filter((id) => id !== asset.id)
  } else {
    selectedAssetIds.value = [...selectedAssetIds.value, asset.id]
  }
  lastBatchSelectedAssetId.value = asset.id
}

const selectBatchRange = (asset: AnalogAssetVO) => {
  if (!canRemoveAsset(asset)) return

  const anchorId = lastBatchSelectedAssetId.value
  if (anchorId == null) {
    toggleBatchSelection(asset)
    return
  }

  const visibleAssets = sortedAssets.value
  const currentIndex = visibleAssets.findIndex((item) => item.id === asset.id)
  const anchorIndex = visibleAssets.findIndex((item) => item.id === anchorId)
  if (currentIndex < 0 || anchorIndex < 0) {
    toggleBatchSelection(asset)
    return
  }

  const [start, end] = currentIndex < anchorIndex
    ? [currentIndex, anchorIndex]
    : [anchorIndex, currentIndex]
  const rangeIds = visibleAssets
    .slice(start, end + 1)
    .filter((item) => canRemoveAsset(item))
    .map((item) => item.id)
  selectedAssetIds.value = Array.from(new Set([...selectedAssetIds.value, ...rangeIds]))
}

const handleBatchSelectionClick = (asset: AnalogAssetVO, event?: MouseEvent) => {
  if (event?.shiftKey) {
    selectBatchRange(asset)
    return
  }
  toggleBatchSelection(asset)
}

const selectAllLoadedAssets = () => {
  selectedAssetIds.value = removableAssets.value.map((asset) => asset.id)
}

const removeDeletedAssetsFromList = (ids: number[]) => {
  const idSet = new Set(ids)
  assets.value = assets.value.filter((asset) => !idSet.has(asset.id))
  if (lastBatchSelectedAssetId.value != null && idSet.has(lastBatchSelectedAssetId.value)) {
    lastBatchSelectedAssetId.value = null
  }
  for (const id of ids) {
    analogAssetStore.removeAsset(props.assetType, id)
  }
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

const getOriginalAssetUrl = (asset: AnalogAssetVO): string | undefined => {
  return asset.file?.url
}

const getAssetDownloadName = (asset: AnalogAssetVO): string => {
  const name = asset.file?.name?.trim()
  return name || `asset-${asset.id}`
}

const triggerAssetDownload = (url: string, filename: string, openInNewTab = false) => {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  if (openInNewTab) {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  }
  document.body.appendChild(link)
  link.click()
  link.remove()
}

const handleDownloadAsset = async (asset: AnalogAssetVO) => {
  const url = getOriginalAssetUrl(asset)
  if (!url) return

  const filename = getAssetDownloadName(asset)

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`)
    }

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    triggerAssetDownload(objectUrl, filename)
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
  } catch (error) {
    console.warn('下载素材源文件失败，尝试打开原始链接:', error)
    triggerAssetDownload(url, filename, true)
  }
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
  clearBatchSelection()
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

  if (!(await isUploadFileAccepted(file, showMessage))) {
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
  let rasterSvgCount = 0
  for (const file of files) {
    if (!isAllowedUploadFile(file)) {
      invalidCount++
      continue
    }
    if (await svgFileContainsRasterImage(file)) {
      rasterSvgCount++
      continue
    }
    validFiles.push(file)
  }

  if (invalidCount > 0) {
    ElMessage.warning(getUploadFileTypeMessage())
  }
  if (rasterSvgCount > 0) {
    ElMessage.warning(t('asset.svgVectorOnly'))
  }
  if (!validFiles.length) return

  assetDialogVisible.value = true
  uploadPanelVisible.value = true
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
const handleSelect = (asset: AnalogAssetVO, event?: MouseEvent) => {
  if (batchManageMode.value) {
    handleBatchSelectionClick(asset, event)
    return
  }

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

const closeSvgEditor = () => {
  svgEditorVisible.value = false
  editingSvgAsset.value = null
  editingSvgText.value = ''
}

const openSvgEditor = async (asset: AnalogAssetVO) => {
  const svgUrl = asset.file?.url
  if (!svgUrl) return

  handleMouseLeave()
  editingSvgAsset.value = asset
  svgEditorVisible.value = true
  editingSvgText.value = ''

  try {
    const response = await fetch(svgUrl, { credentials: 'same-origin' })
    if (!response.ok) throw new Error(`Failed to load SVG: ${response.status}`)
    const svgText = await response.text()
    editingSvgText.value = svgText
  } catch (error) {
    console.error('加载 SVG 失败:', error)
    ElMessage.error(t('asset.loadSvgFailed'))
    closeSvgEditor()
  }
}

const saveEditedSvgAsset = async (svgText: string) => {
  if (!editingSvgAsset.value || !svgText) return

  svgSaving.value = true
  try {
    const originalName = editingSvgAsset.value.file?.name || `asset-${editingSvgAsset.value.id}.svg`
    const baseName = originalName.replace(/\.svg$/i, '')
    const file = new File([svgText], `${baseName}-recolor-${Date.now()}.svg`, { type: 'image/svg+xml' })
    const ok = await uploadFile(file, true)
    if (ok) {
      closeSvgEditor()
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

  setDeletingIds([asset.id])
  try {
    const res = await analogAssetApi.remove(asset.id)
    if (res.data) {
      removeDeletedAssetsFromList([asset.id])
      selectedAssetIds.value = selectedAssetIds.value.filter((id) => id !== asset.id)
      ElMessage.success(t('common.deleteSuccess'))
    } else {
      ElMessage.error(t('asset.deleteFailed'))
    }
  } catch (e) {
    console.error('删除素材失败:', e)
    ElMessage.error(t('asset.deleteFailed'))
  } finally {
    setDeletingIds([])
  }
}

const handleBatchRemove = async () => {
  const ids = [...selectedAssetIds.value]
  if (!ids.length || batchDeleting.value) return

  try {
    await ElMessageBox.confirm(
      t('asset.batchDeleteConfirm', { count: ids.length }),
      t('common.tip'),
      {
        type: 'warning',
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel')
      }
    )
  } catch {
    return
  }

  batchDeleting.value = true
  deleteProgressDone.value = 0
  deleteProgressTotal.value = ids.length
  const removedIds: number[] = []
  const failedIds: number[] = []
  try {
    for (const id of ids) {
      setDeletingIds([id])
      try {
        const res = await analogAssetApi.remove(id)
        if (res.data) {
          removedIds.push(id)
          removeDeletedAssetsFromList([id])
          selectedAssetIds.value = selectedAssetIds.value.filter((selectedId) => selectedId !== id)
        } else {
          failedIds.push(id)
        }
      } catch (e) {
        failedIds.push(id)
        console.error('批量删除素材失败:', e)
      } finally {
        deleteProgressDone.value += 1
      }
    }

    if (removedIds.length && !failedIds.length) {
      clearBatchSelection()
      ElMessage.success(t('asset.deleteCompleteCount', { count: removedIds.length }))
    } else if (removedIds.length) {
      ElMessage.warning(t('asset.deletePartialCount', { success: removedIds.length, failed: failedIds.length }))
    } else {
      ElMessage.error(t('asset.deleteFailed'))
    }
  } catch (e) {
    console.error('批量删除素材失败:', e)
    ElMessage.error(t('asset.deleteFailed'))
  } finally {
    batchDeleting.value = false
    setDeletingIds([])
    deleteProgressDone.value = 0
    deleteProgressTotal.value = 0
  }
}

// 初始化加载
onMounted(() => {
  loadAssets(true)
})

onBeforeUnmount(() => {
  stopAssetDrawerResize()
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

:deep(.asset-library-drawer) {
  --el-drawer-padding-primary: 0;
  border-left: 1px solid var(--studio-border);
  box-shadow: -8px 0 24px rgba(15, 23, 42, 0.12);
}

:deep(.asset-library-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--studio-border);
}

:deep(.asset-library-drawer .el-drawer__title) {
  font-size: 14px;
  font-weight: 600;
  color: var(--studio-text);
}

:deep(.asset-library-drawer .el-drawer__body) {
  padding: 12px 16px 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.asset-drawer-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 8px;
  cursor: col-resize;
  z-index: 4;
}

.asset-drawer-resize-handle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 3px;
  width: 2px;
  height: 42px;
  border-radius: 999px;
  background: var(--studio-border);
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.16s, background-color 0.16s;
}

.asset-drawer-resize-handle:hover::after {
  opacity: 1;
  background: var(--studio-primary);
}

.asset-drop-zone {
  min-height: 252px;
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

.asset-library-toolbar {
  min-height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: -4px 0 10px;
}

.asset-toolbar-summary {
  min-width: 0;
  color: var(--studio-text-muted);
  font-size: 12px;
  line-height: 1.35;
}

.asset-toolbar-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: auto;
}

.asset-toolbar-actions :deep(.el-button) {
  min-height: 28px;
  padding: 4px 9px;
}

.asset-toolbar-actions :deep(.el-button + .el-button) {
  margin-left: 0;
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
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow: auto;
  overscroll-behavior: contain;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  align-content: start;
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

.asset-delete-progress {
  margin: -4px 0 12px;
}

.asset-delete-progress :deep(.el-progress-bar__outer) {
  background-color: rgba(245, 108, 108, 0.12);
}

.asset-delete-progress :deep(.el-progress-bar__inner) {
  background-color: #f56c6c;
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
  width: 100%;
  aspect-ratio: 1;
  min-height: 76px;
  height: auto;
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

.asset-grid.batch-manage .asset-item {
  cursor: pointer;
}

.asset-grid.batch-manage .asset-item.active {
  border-width: 1px;
}

.asset-item.batch-selected {
  border-color: #f56c6c;
  background-color: rgba(245, 108, 108, 0.08);
  box-shadow: 0 0 0 2px rgba(245, 108, 108, 0.16);
}

.asset-item.not-removable {
  cursor: not-allowed;
}

.asset-item.deleting {
  opacity: 0.6;
  pointer-events: none;
}

.asset-batch-checkbox {
  position: absolute;
  top: 4px;
  left: 4px;
  z-index: 2;
}

.asset-item img {
  width: 70%;
  height: 70%;
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

.asset-item.system-asset {
  border-style: dashed;
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

.favorite-button {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: 0;
  padding: 0;
  background: transparent;
  color: #8a8f98;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s, transform 0.2s;
  z-index: 2;
}

.favorite-button .el-icon {
  font-size: 17px;
}

.favorite-button:hover,
.favorite-button.favorited {
  color: #e6a23c;
}

.favorite-button:hover {
  transform: scale(1.08);
}

.favorite-button:disabled {
  cursor: wait;
}

.favorite-button:disabled .el-icon {
  animation: spin 1s linear infinite;
}

.favorite-button.favorited {
  opacity: 1;
}

.delete-icon {
  position: absolute;
  left: 4px;
  bottom: 4px;
  font-size: 16px;
  color: #f56c6c;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  padding: 2px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1;
}

.download-icon {
  position: absolute;
  right: 4px;
  bottom: 4px;
  font-size: 16px;
  color: #0f6b68;
  background-color: rgba(255, 255, 255, 0.92);
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

.asset-item:hover .download-icon {
  opacity: 1;
}

.asset-item:hover .favorite-button {
  opacity: 1;
}
</style>
