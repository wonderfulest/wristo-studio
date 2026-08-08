// @vitest-environment jsdom
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { AnalogAssetVO } from '@/types/api/analog-asset'
import { useAssetBatchManagement } from './useAssetBatchManagement'

const asset = (id: number, userId = 1, isSystem = false) => ({ id, userId, isSystem }) as AnalogAssetVO

describe('useAssetBatchManagement', () => {
  it('allows admins or owners to remove non-system assets', () => {
    const owner = useAssetBatchManagement({ sortedAssets: ref([]), isAdmin: () => false, currentUserId: () => 1, remove: vi.fn(), removeAssets: vi.fn() })
    expect(owner.canRemoveAsset(asset(1, 1))).toBe(true)
    expect(owner.canRemoveAsset(asset(2, 2))).toBe(false)
    expect(owner.canRemoveAsset(asset(3, 1, true))).toBe(false)
  })

  it('selects a removable range from the last anchor', () => {
    const sortedAssets = ref([asset(1), asset(2, 2), asset(3)])
    const batch = useAssetBatchManagement({ sortedAssets, isAdmin: () => false, currentUserId: () => 1, remove: vi.fn(), removeAssets: vi.fn() })
    batch.toggleSelection(sortedAssets.value[0])
    batch.selectRange(sortedAssets.value[2])
    expect(batch.selectedAssetIds.value).toEqual([1, 3])
  })

  it('removes successes and preserves failed selections', async () => {
    const removeAssets = vi.fn()
    const remove = vi.fn().mockResolvedValueOnce({ data: true }).mockRejectedValueOnce(new Error('failed'))
    const batch = useAssetBatchManagement({
      sortedAssets: ref([asset(1), asset(2)]),
      isAdmin: () => true,
      currentUserId: () => 1,
      remove,
      removeAssets,
      confirm: vi.fn().mockResolvedValue(undefined)
    })
    batch.selectedAssetIds.value = [1, 2]

    await batch.handleBatchRemove()

    expect(removeAssets).toHaveBeenCalledWith([1])
    expect(batch.selectedAssetIds.value).toEqual([2])
    expect(batch.batchDeleting.value).toBe(false)
    expect(batch.deleteProgressTotal.value).toBe(0)
  })
})
