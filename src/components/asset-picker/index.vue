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
      :ref="setUploadInput"
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
import { ElMessage } from 'element-plus'
import { Plus, Loading, Star, StarFilled, Delete, Edit, Download } from '@element-plus/icons-vue'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import type { AnalogAssetVO, AnalogAssetType } from '@/types/api/analog-asset'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { useUserStore } from '@/stores/user'
import { useI18n } from '@/i18n'
import SvgEditorDialog from '@/components/svg-editor/SvgEditorDialog.vue'
import emitter from '@/utils/eventBus'
import { isEditableSvgAssetSource } from './assetEditability'
import { useAssetDrawerResize } from './useAssetDrawerResize'
import { useAssetLibrary } from './useAssetLibrary'
import { useAssetBatchManagement } from './useAssetBatchManagement'
import { useAssetUploadQueue } from './useAssetUploadQueue'

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

const assetDialogVisible = ref(false)
const settingsPopupId = `asset-picker_${Date.now()}_${Math.random().toString(36).slice(2)}`
const uploadPanelVisible = ref(false)
const hoverPreviewAsset = ref<AnalogAssetVO | null>(null)
const hoverPreviewStyle = ref<Record<string, string>>({})
const svgEditorVisible = ref(false)
const svgSaving = ref(false)
const editingSvgAsset = ref<AnalogAssetVO | null>(null)
const editingSvgText = ref('')

const canViewAllAssets = computed(() => userStore.isMerchantUser || userStore.isAdminUser)
const assetScopeOptions = computed(() => [
  { label: t('asset.scopeMine'), value: 'mine' },
  { label: t('asset.scopeAll'), value: 'all' },
])
const {
  assets,
  loading,
  hasMore,
  assetScope,
  sortedAssets,
  getAssetUrl,
  getOriginalAssetUrl,
  prependAsset,
  removeAssets: removeAssetsFromLibrary,
  loadAssets,
  loadMore,
  handleGridScroll: handleAssetGridScroll,
  refresh,
  isFavoriteAsset,
  isFavoritingAsset,
  toggleFavoriteAsset,
  downloadAsset: handleDownloadAsset,
} = useAssetLibrary({
  assetType: () => props.assetType,
  canViewAll: () => canViewAllAssets.value,
  translate: t,
})
const {
  batchDeleting,
  batchManageMode,
  selectedAssetIds,
  deleteProgressDone,
  deleteProgressTotal,
  deleteProgressPercent,
  removableAssets,
  canRemoveAsset,
  isDeletingAsset,
  isBatchSelected,
  clearSelection: clearBatchSelection,
  toggleManageMode: toggleBatchManageMode,
  handleSelectionClick: handleBatchSelectionClick,
  selectAllLoaded: selectAllLoadedAssets,
  handleRemove,
  handleBatchRemove,
} = useAssetBatchManagement({
  sortedAssets,
  isAdmin: () => userStore.isAdminUser,
  currentUserId: () => userStore.userInfo?.id,
  remove: analogAssetApi.remove,
  removeAssets: removeAssetsFromLibrary,
  translate: t,
})
const canManageAssets = computed(() => userStore.isAdminUser || removableAssets.value.length > 0)
const {
  uploading,
  uploadQueue,
  uploadSummaryMessage,
  uploadSummaryTone,
  dragOver,
  uploadAccept,
  completedUploadCount,
  uploadStatusLabel,
  uploadFile,
  triggerUpload,
  setUploadInput,
  handleUpload,
  handleDragEnter,
  handleDragOver,
  handleDragLeave,
  handleDrop,
} = useAssetUploadQueue({
  assetType: () => props.assetType,
  getAssetUrl,
  onAssetUploaded: (asset, url) => {
    prependAsset(asset)
    analogAssetStore.prependAsset(asset)
    props.onUpload(url, asset)
  },
  onOpenQueue: () => {
    emitter.emit('settings-popup-open', settingsPopupId)
    assetDialogVisible.value = true
    uploadPanelVisible.value = true
  },
  translate: t,
})
const {
  drawerSize: assetDrawerSize,
  normalizeWidth: normalizeAssetDrawerWidth,
  startResize: startAssetDrawerResize,
  dispose: disposeAssetDrawerResize,
} = useAssetDrawerResize()

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

const isEditableSvgAsset = (asset: AnalogAssetVO): boolean =>
  isEditableSvgAssetSource(props.assetType, asset.file?.url, asset.file?.name)

const openAssetDialog = () => {
  emitter.emit('settings-popup-open', settingsPopupId)
  normalizeAssetDrawerWidth()
  assetDialogVisible.value = true
}

const toggleUploadPanel = () => {
  uploadPanelVisible.value = !uploadPanelVisible.value
}

const isAssetSelected = (asset: AnalogAssetVO): boolean => {
  const url = getAssetUrl(asset)
  return props.selectedAssetId != null ? asset.id === props.selectedAssetId : props.selectedUrl === url
}

const handleScopeChange = () => {
  clearBatchSelection()
  void loadAssets(true)
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


const handleSettingsPopupOpen = (id: unknown) => {
  if (String(id) === settingsPopupId) return
  assetDialogVisible.value = false
  hoverPreviewAsset.value = null
}

// 初始化加载
onMounted(() => {
  loadAssets(true)
  emitter.on('settings-popup-open', handleSettingsPopupOpen)
})

onBeforeUnmount(() => {
  disposeAssetDrawerResize()
  emitter.off('settings-popup-open', handleSettingsPopupOpen)
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
