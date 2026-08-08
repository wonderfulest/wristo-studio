import { computed, ref, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { AnalogAssetVO } from '@/types/api/analog-asset'

type Translate = (key: string, params?: Record<string, string | number>) => string

export interface UseAssetBatchManagementOptions {
  sortedAssets: Ref<AnalogAssetVO[]>
  isAdmin: () => boolean
  currentUserId: () => number | undefined
  remove: (id: number) => Promise<{ data?: boolean | null }>
  removeAssets: (ids: number[]) => void
  confirm?: (...args: unknown[]) => Promise<unknown>
  translate?: Translate
}

export function useAssetBatchManagement(options: UseAssetBatchManagementOptions) {
  const t: Translate = options.translate ?? ((key) => key)
  const confirm = options.confirm ?? ((...args) => ElMessageBox.confirm(...(args as Parameters<typeof ElMessageBox.confirm>)))
  const deletingIds = ref<Set<number>>(new Set())
  const batchDeleting = ref(false)
  const batchManageMode = ref(false)
  const selectedAssetIds = ref<number[]>([])
  const lastSelectedId = ref<number | null>(null)
  const deleteProgressDone = ref(0)
  const deleteProgressTotal = ref(0)
  const deleteProgressPercent = computed(() => (deleteProgressTotal.value ? Math.round((deleteProgressDone.value / deleteProgressTotal.value) * 100) : 0))

  const canRemoveAsset = (asset: AnalogAssetVO): boolean => {
    if (asset.isSystem) return false
    if (options.isAdmin()) return true
    const currentUserId = options.currentUserId()
    return currentUserId != null && Number(asset.userId) === Number(currentUserId)
  }
  const removableAssets = computed(() => options.sortedAssets.value.filter(canRemoveAsset))
  const isDeletingAsset = (id: number): boolean => deletingIds.value.has(id)
  const isBatchSelected = (id: number): boolean => selectedAssetIds.value.includes(id)
  const setDeletingIds = (ids: number[]): void => {
    deletingIds.value = new Set(ids)
  }
  const clearSelection = (): void => {
    selectedAssetIds.value = []
    lastSelectedId.value = null
  }
  const toggleManageMode = (): void => {
    batchManageMode.value = !batchManageMode.value
    if (!batchManageMode.value) clearSelection()
  }
  const toggleSelection = (asset: AnalogAssetVO): void => {
    if (!canRemoveAsset(asset)) return
    selectedAssetIds.value = isBatchSelected(asset.id) ? selectedAssetIds.value.filter((id) => id !== asset.id) : [...selectedAssetIds.value, asset.id]
    lastSelectedId.value = asset.id
  }
  const selectRange = (asset: AnalogAssetVO): void => {
    if (!canRemoveAsset(asset)) return
    const anchor = lastSelectedId.value
    if (anchor == null) return toggleSelection(asset)
    const currentIndex = options.sortedAssets.value.findIndex((item) => item.id === asset.id)
    const anchorIndex = options.sortedAssets.value.findIndex((item) => item.id === anchor)
    if (currentIndex < 0 || anchorIndex < 0) return toggleSelection(asset)
    const start = Math.min(currentIndex, anchorIndex)
    const end = Math.max(currentIndex, anchorIndex)
    const rangeIds = options.sortedAssets.value
      .slice(start, end + 1)
      .filter(canRemoveAsset)
      .map((item) => item.id)
    selectedAssetIds.value = Array.from(new Set([...selectedAssetIds.value, ...rangeIds]))
  }
  const handleSelectionClick = (asset: AnalogAssetVO, event?: MouseEvent): void => {
    if (event?.shiftKey) selectRange(asset)
    else toggleSelection(asset)
  }
  const selectAllLoaded = (): void => {
    selectedAssetIds.value = removableAssets.value.map((asset) => asset.id)
  }
  const pruneSelection = (ids: number[]): void => {
    const removed = new Set(ids)
    selectedAssetIds.value = selectedAssetIds.value.filter((id) => !removed.has(id))
    if (lastSelectedId.value != null && removed.has(lastSelectedId.value)) lastSelectedId.value = null
  }

  const handleRemove = async (asset: AnalogAssetVO): Promise<void> => {
    try {
      await confirm(t('asset.deleteConfirm'), t('common.tip'), {
        type: 'warning',
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel')
      })
    } catch {
      return
    }
    setDeletingIds([asset.id])
    try {
      const res = await options.remove(asset.id)
      if (res.data) {
        options.removeAssets([asset.id])
        pruneSelection([asset.id])
        ElMessage.success(t('common.deleteSuccess'))
      } else ElMessage.error(t('asset.deleteFailed'))
    } catch {
      ElMessage.error(t('asset.deleteFailed'))
    } finally {
      setDeletingIds([])
    }
  }

  const handleBatchRemove = async (): Promise<void> => {
    const ids = [...selectedAssetIds.value]
    if (!ids.length || batchDeleting.value) return
    try {
      await confirm(t('asset.batchDeleteConfirm', { count: ids.length }), t('common.tip'), {
        type: 'warning',
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel')
      })
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
          const res = await options.remove(id)
          if (res.data) {
            removedIds.push(id)
            options.removeAssets([id])
            pruneSelection([id])
          } else failedIds.push(id)
        } catch {
          failedIds.push(id)
        } finally {
          deleteProgressDone.value += 1
        }
      }
      if (removedIds.length && !failedIds.length) {
        clearSelection()
        ElMessage.success(t('asset.deleteCompleteCount', { count: removedIds.length }))
      } else if (removedIds.length) {
        ElMessage.warning(t('asset.deletePartialCount', { success: removedIds.length, failed: failedIds.length }))
      } else ElMessage.error(t('asset.deleteFailed'))
    } finally {
      batchDeleting.value = false
      setDeletingIds([])
      deleteProgressDone.value = 0
      deleteProgressTotal.value = 0
    }
  }

  return {
    deletingIds,
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
    clearSelection,
    toggleManageMode,
    toggleSelection,
    selectRange,
    handleSelectionClick,
    selectAllLoaded,
    pruneSelection,
    handleRemove,
    handleBatchRemove
  }
}
