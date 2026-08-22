import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearBmFontDescriptorCache, loadBmFontDescriptor } from './bmFontDescriptorLoader'

const descriptor = `info face="demo" size=30
common lineHeight=30 base=24 scaleW=32 scaleH=32 pages=1 packed=0
page id=0 file="demo.png"
chars count=1
char id=48 x=0 y=0 width=10 height=10 xoffset=0 yoffset=0 xadvance=10 page=0 chnl=15`

describe('loadBmFontDescriptor', () => {
  afterEach(() => {
    clearBmFontDescriptorCache()
    vi.unstubAllGlobals()
  })

  it('shares one descriptor request across list and selected-font previews', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(descriptor) })
    vi.stubGlobal('fetch', fetchMock)

    const [first, second] = await Promise.all([
      loadBmFontDescriptor('/preview/demo.fnt'),
      loadBmFontDescriptor('/preview/demo.fnt'),
    ])

    expect(first).toBe(second)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not retain a failed request in the cache', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(descriptor) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadBmFontDescriptor('/preview/retry.fnt')).rejects.toThrow('503')
    await expect(loadBmFontDescriptor('/preview/retry.fnt')).resolves.toMatchObject({ scaleW: 32 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
