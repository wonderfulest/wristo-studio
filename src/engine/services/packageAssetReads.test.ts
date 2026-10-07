import { describe, expect, it, vi } from 'vitest'
import { createPackageAssetReads, hashPackageBlob } from './packageAssetReads'

describe('package asset reads', () => {
  it('shares duplicate reads only within one archive and retries failures', async () => {
    const blob = new Blob(['asset'])
    const fetcher = vi.fn().mockResolvedValue(blob)
    const reads = createPackageAssetReads(fetcher)
    expect(await Promise.all([reads.read('a'), reads.read('a')])).toEqual([blob, blob])
    expect(fetcher).toHaveBeenCalledTimes(1)
    await createPackageAssetReads(fetcher).read('a')
    expect(fetcher).toHaveBeenCalledTimes(2)
    fetcher.mockRejectedValueOnce(new Error('offline'))
    await expect(reads.read('b')).rejects.toThrow('offline')
    await expect(reads.read('b')).resolves.toBe(blob)
  })

  it('prefetches no more than four reads and leaves errors for normal validation', async () => {
    let active = 0; let maximum = 0
    const reads = createPackageAssetReads(async source => {
      active++; maximum = Math.max(maximum, active)
      await new Promise(resolve => setTimeout(resolve, 1))
      active--
      if (source === 'bad') throw new Error('bad asset')
      return new Blob([source])
    })
    await reads.prefetch(['a', 'b', 'c', 'd', 'e', 'bad'])
    expect(maximum).toBe(4)
    await expect(reads.read('bad')).rejects.toThrow('bad asset')
  })

  it('reuses hashes for immutable blobs', async () => {
    const blob = new Blob(['asset'])
    const spy = vi.spyOn(blob, 'arrayBuffer')
    expect(await hashPackageBlob(blob)).toBe(await hashPackageBlob(blob))
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
