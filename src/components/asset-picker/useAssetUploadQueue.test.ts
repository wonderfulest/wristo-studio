// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import type { AnalogAssetVO } from '@/types/api/analog-asset'
import { useAssetUploadQueue } from './useAssetUploadQueue'

const file = (name: string) => new File(['<svg/>'], name, { type: 'image/svg+xml' })

const createStorage = (): Storage => {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  }
}

describe('useAssetUploadQueue', () => {
  it('uploads files immediately as private and asks about sharing after success', async () => {
    const order: string[] = []
    const onOpenQueue = vi.fn()
    const upload = vi.fn(async (item: File, _type: string, isShared: boolean) => {
      expect(isShared).toBe(false)
      order.push(item.name)
      if (item.name === 'b.svg') throw new Error('failed')
      return { data: { id: order.length, file: { url: `/${item.name}` } } as AnalogAssetVO }
    })
    const onAssetUploaded = vi.fn()
    const queue = useAssetUploadQueue({
      assetType: () => 'tick12',
      upload,
      acceptFile: async () => true,
      prepareFile: async (item) => item,
      getAssetUrl: (asset) => asset.file?.url,
      onAssetUploaded,
      ...({ onOpenQueue } as Record<string, unknown>),
      storage: createStorage(),
      translate: (key) => key
    })

    await queue.processFiles([file('a.svg'), file('b.svg'), file('c.svg')])

    expect(order).toEqual(['a.svg', 'b.svg', 'c.svg'])
    expect(onAssetUploaded).toHaveBeenCalledTimes(2)
    expect(queue.uploadSummaryTone.value).toBe('warning')
    expect(queue.uploadQueue.value).toEqual([])
    expect(queue.uploading.value).toBe(false)
    expect(queue.pendingSharingAssets.value.map((asset) => asset.id)).toEqual([1, 3])
    expect(queue.sharingDecisionVisible.value).toBe(true)
    expect(onOpenQueue).not.toHaveBeenCalled()
  })

  it('shares the successful batch and persists the choice only when remember is selected', async () => {
    const storage = createStorage()
    const updateSharing = vi.fn(async () => undefined)
    const queue = useAssetUploadQueue({
      assetType: () => 'tick12',
      upload: async (item) => ({ data: { id: item.name === 'a.svg' ? 11 : 12, file: { url: `/${item.name}` } } as AnalogAssetVO }),
      updateSharing,
      acceptFile: async () => true,
      prepareFile: async (item) => item,
      storage,
    })

    await queue.processFiles([file('a.svg'), file('b.svg')])
    queue.rememberSharingChoice.value = true
    await queue.chooseSharing(true)

    expect(updateSharing).toHaveBeenCalledWith([11, 12], true)
    expect(queue.sharingDecisionVisible.value).toBe(false)
    expect(queue.rememberedShareUploads.value).toBe(true)

    const nextUpload = vi.fn(async () => ({ data: { id: 13, file: { url: '/c.svg' } } as AnalogAssetVO }))
    const nextQueue = useAssetUploadQueue({
      assetType: () => 'tick12',
      upload: nextUpload,
      acceptFile: async () => true,
      prepareFile: async (item) => item,
      storage,
    })
    await nextQueue.processFiles([file('c.svg')])

    expect(nextUpload).toHaveBeenCalledWith(expect.any(File), 'tick12', true)
    expect(nextQueue.sharingDecisionVisible.value).toBe(false)
  })

  it('asks again after a private choice that was not remembered', async () => {
    const updateSharing = vi.fn(async () => undefined)
    const queue = useAssetUploadQueue({
      assetType: () => 'tick12',
      upload: async () => ({ data: { id: 21, file: { url: '/a.svg' } } as AnalogAssetVO }),
      updateSharing,
      acceptFile: async () => true,
      prepareFile: async (item) => item,
      storage: createStorage(),
    })

    await queue.processFiles([file('a.svg')])
    await queue.chooseSharing(false)
    await queue.processFiles([file('b.svg')])

    expect(updateSharing).not.toHaveBeenCalled()
    expect(queue.rememberedShareUploads.value).toBe(null)
    expect(queue.sharingDecisionVisible.value).toBe(true)
  })

  it('can reset a remembered sharing preference', async () => {
    const storage = createStorage()
    const queue = useAssetUploadQueue({ assetType: () => 'tick12', storage })
    queue.rememberSharingChoice.value = true
    queue.pendingSharingAssets.value = [{ id: 31 } as AnalogAssetVO]
    await queue.chooseSharing(false)

    expect(queue.rememberedShareUploads.value).toBe(false)
    expect(useAssetUploadQueue({ assetType: () => 'tick12', storage }).rememberedShareUploads.value).toBe(false)

    queue.resetSharingPreference()

    expect(queue.rememberedShareUploads.value).toBe(null)
    expect(useAssetUploadQueue({ assetType: () => 'tick12', storage }).rememberedShareUploads.value).toBe(null)
  })

  it('reports accept patterns by asset type', () => {
    expect(useAssetUploadQueue({ assetType: () => 'image' }).uploadAccept.value).toBe('.svg,.png,.jpg,.jpeg,.webp')
    expect(useAssetUploadQueue({ assetType: () => 'mask' }).uploadAccept.value).toBe('.svg,.png,.jpg,.jpeg,.webp')
    expect(useAssetUploadQueue({ assetType: () => 'hour' }).uploadAccept.value).toBe('.svg,.png')
    expect(useAssetUploadQueue({ assetType: () => 'tick12' }).uploadAccept.value).toBe('.svg,.png')
    expect(useAssetUploadQueue({ assetType: () => 'tick60' }).uploadAccept.value).toBe('.svg,.png')
    expect(useAssetUploadQueue({ assetType: () => 'romans' }).uploadAccept.value).toBe('.svg,.png')
  })

  it('clears drag state after a drop', async () => {
    const queue = useAssetUploadQueue({ assetType: () => 'tick12', acceptFile: async () => false })
    queue.handleDragEnter()
    expect(queue.dragOver.value).toBe(true)
    await queue.handleDrop({ dataTransfer: { files: [file('a.svg')] } } as unknown as DragEvent)
    expect(queue.dragOver.value).toBe(false)
  })
})
