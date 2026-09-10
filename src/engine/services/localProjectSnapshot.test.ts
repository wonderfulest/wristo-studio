import { describe, expect, it } from 'vitest'
import { captureProjectSnapshot, restoreProjectSnapshot } from './localProjectSnapshot'

describe('local project snapshot', () => {
  it('restores custom assets and fonts after the original object URLs are revoked', async () => {
    const asset = URL.createObjectURL(new Blob(['image'], { type: 'image/svg+xml' }))
    const font = URL.createObjectURL(new Blob(['font']))
    const config = { elements: [{ imageUrl: asset }], visualThemes: { imageUrl: asset } }
    const snapshot = await captureProjectSnapshot(config, [{ slug: 'custom', ttfFile: { url: font } }])
    URL.revokeObjectURL(asset)
    URL.revokeObjectURL(font)
    const restored = restoreProjectSnapshot(snapshot)
    expect(await (await fetch(restored.config.elements[0].imageUrl)).text()).toBe('image')
    expect(restored.config.visualThemes.imageUrl).toBe(restored.config.elements[0].imageUrl)
    expect(await (await fetch(restored.fonts[0].ttfFile.url)).text()).toBe('font')
    expect(config.elements[0].imageUrl).toBe(asset)
  })
  it('captures every asset before canvas disposal revokes URLs', async () => {
    const urls = ['one', 'two', 'three'].map((value) => URL.createObjectURL(new Blob([value])))
    const saving = captureProjectSnapshot({ images: urls }, [])
    urls.forEach((url) => URL.revokeObjectURL(url))
    const restored = restoreProjectSnapshot(await saving)
    expect(await Promise.all(restored.config.images.map(async (url) => (await fetch(url)).text())))
      .toEqual(['one', 'two', 'three'])
  })
  it('fails instead of saving an unrecoverable blob reference', async () => {
    await expect(captureProjectSnapshot({ imageUrl: 'blob:missing' }, [])).rejects.toThrow()
  })
})
