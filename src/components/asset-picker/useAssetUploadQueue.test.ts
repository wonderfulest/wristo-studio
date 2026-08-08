// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import type { AnalogAssetVO } from '@/types/api/analog-asset'
import { useAssetUploadQueue } from './useAssetUploadQueue'

const file = (name: string) => new File(['<svg/>'], name, { type: 'image/svg+xml' })

describe('useAssetUploadQueue', () => {
  it('uploads files serially and continues after an individual failure', async () => {
    const order: string[] = []
    const upload = vi.fn(async (item: File) => {
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
      translate: (key) => key
    })

    await queue.processFiles([file('a.svg'), file('b.svg'), file('c.svg')])

    expect(order).toEqual(['a.svg', 'b.svg', 'c.svg'])
    expect(onAssetUploaded).toHaveBeenCalledTimes(2)
    expect(queue.uploadSummaryTone.value).toBe('warning')
    expect(queue.uploadQueue.value).toEqual([])
    expect(queue.uploading.value).toBe(false)
  })

  it('reports accept patterns by asset type', () => {
    expect(useAssetUploadQueue({ assetType: () => 'image' }).uploadAccept.value).toBe('.svg,.png,.jpg,.jpeg,.webp')
    expect(useAssetUploadQueue({ assetType: () => 'hour' }).uploadAccept.value).toBe('.svg,.png')
    expect(useAssetUploadQueue({ assetType: () => 'tick12' }).uploadAccept.value).toBe('.svg')
  })

  it('clears drag state after a drop', async () => {
    const queue = useAssetUploadQueue({ assetType: () => 'tick12', acceptFile: async () => false })
    queue.handleDragEnter()
    expect(queue.dragOver.value).toBe(true)
    await queue.handleDrop({ dataTransfer: { files: [file('a.svg')] } } as unknown as DragEvent)
    expect(queue.dragOver.value).toBe(false)
  })
})
