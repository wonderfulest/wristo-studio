import { describe, expect, it, vi } from 'vitest'
import { persistAndSaveDesignConfig, persistBlobAssetUrls } from './persistBlobAssetUrls'

describe('persistBlobAssetUrls', () => {
  it('replaces nested blob URLs without mutating the input and uploads duplicates once', async () => {
    const source = {
      imageUrl: 'blob:https://studio.wristo.io/one',
      elements: [{ pointer: { imageUrl: 'blob:https://studio.wristo.io/one' } }],
      untouched: ['https://cdn.wristo.io/a.png', 'data:image/png;base64,AA==', '/relative/a.png'],
    }
    const fetchBlob = vi.fn(async () => new Blob(['<svg/>'], { type: 'image/svg+xml' }))
    const uploadedFiles: File[] = []
    const uploadFile = vi.fn(async (file: File) => {
      uploadedFiles.push(file)
      return 'https://cdn.wristo.io/design-assets/one.svg'
    })

    const result = await persistBlobAssetUrls(source, { fetchBlob, uploadFile })

    expect(result).not.toBe(source)
    expect(source.imageUrl).toBe('blob:https://studio.wristo.io/one')
    expect(result.imageUrl).toBe('https://cdn.wristo.io/design-assets/one.svg')
    expect(result.elements[0].pointer.imageUrl).toBe('https://cdn.wristo.io/design-assets/one.svg')
    expect(result.untouched).toEqual(source.untouched)
    expect(fetchBlob).toHaveBeenCalledTimes(1)
    expect(uploadFile).toHaveBeenCalledTimes(1)
    expect(uploadedFiles[0]).toBeInstanceOf(File)
    expect(uploadedFiles[0]?.name).toBe('design-asset.svg')
  })

  it('reports the first configuration path when reading a blob fails', async () => {
    await expect(persistBlobAssetUrls(
      { elements: [{ imageUrl: 'blob:https://studio.wristo.io/missing' }] },
      {
        fetchBlob: async () => { throw new Error('blob is unavailable') },
        uploadFile: async () => 'https://cdn.wristo.io/unreachable.png',
      },
    )).rejects.toThrow('$.elements[0].imageUrl: blob is unavailable')
  })

  it('rejects the whole operation when any unique blob upload fails', async () => {
    const uploadFile = vi.fn()
      .mockResolvedValueOnce('https://cdn.wristo.io/one.png')
      .mockRejectedValueOnce(new Error('S3 unavailable'))

    await expect(persistBlobAssetUrls(
      { elements: [{ imageUrl: 'blob:one' }, { imageUrl: 'blob:two' }] },
      {
        fetchBlob: async () => new Blob(['x'], { type: 'image/png' }),
        uploadFile,
      },
    )).rejects.toThrow('$.elements[1].imageUrl: S3 unavailable')
  })

  it.each(['', 'blob:https://studio.wristo.io/still-local'])(
    'rejects an invalid upload result %j',
    async (url) => {
      await expect(persistBlobAssetUrls(
        { imageUrl: 'blob:one' },
        {
          fetchBlob: async () => new Blob(['x'], { type: 'application/octet-stream' }),
          uploadFile: async () => url,
        },
      )).rejects.toThrow('$.imageUrl: upload returned an invalid URL')
    },
  )

  it('returns primitives, null, and ordinary nested values unchanged', async () => {
    const source = { value: null, enabled: true, count: 3, values: ['hello', { url: 'https://cdn/a' }] }
    const uploadFile = vi.fn()

    await expect(persistBlobAssetUrls(source, { uploadFile })).resolves.toEqual(source)
    expect(uploadFile).not.toHaveBeenCalled()
    await expect(persistBlobAssetUrls('plain value', { uploadFile })).resolves.toBe('plain value')
  })
})

describe('persistAndSaveDesignConfig', () => {
  it('saves only the persisted configuration and returns it for bundle generation', async () => {
    const persisted = { elements: [{ imageUrl: 'https://cdn.wristo.io/design-assets/a.png' }] }
    const persist = vi.fn(async () => persisted)
    const save = vi.fn(async () => undefined)

    const result = await persistAndSaveDesignConfig(
      { elements: [{ imageUrl: 'blob:a' }] },
      save,
      persist,
    )

    expect(save).toHaveBeenCalledWith(persisted)
    expect(result).toBe(persisted)
    expect(JSON.stringify(save.mock.calls[0])).not.toContain('blob:')
  })

  it('does not call save when persistence fails', async () => {
    const save = vi.fn(async () => undefined)
    const persist = vi.fn(async () => { throw new Error('S3 unavailable') })

    await expect(persistAndSaveDesignConfig({ imageUrl: 'blob:a' }, save, persist))
      .rejects.toThrow('S3 unavailable')
    expect(save).not.toHaveBeenCalled()
  })
})
