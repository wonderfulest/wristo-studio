import { beforeEach, describe, expect, it, vi } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@/config/axios', () => ({ default: { post } }))

import { publishBitmapFontBuild } from './bitmapFontBuild'

describe('bitmap font publish client', () => {
  beforeEach(() => post.mockReset())

  it('posts the exact multipart contract without serializing source bytes as JSON', async () => {
    post.mockResolvedValue({ code: 0, data: { id: 7, slug: 'precision-numerals' } })
    const sourceFont = new File([new Uint8Array([1, 2])], 'Source.otf', { type: 'font/otf' })
    const packageFile = new File([new Uint8Array([3, 4])], 'precision-numerals.zip', { type: 'application/zip' })
    const manifest = { schemaVersion: 1, slug: 'precision-numerals' } as any
    const recipe = { schemaVersion: 1, rendererVersion: '1' } as any
    const metadata = { fullName: 'Precision Numerals', slug: 'precision-numerals', type: 'number_font', language: 'en' } as any

    await publishBitmapFontBuild({ sourceFont, packageFile, manifest, recipe, metadata })

    expect(post).toHaveBeenCalledTimes(1)
    const [url, form, config] = post.mock.calls[0]
    expect(url).toBe('/dsn/fonts/bitmap-build/publish')
    expect(config).toMatchObject({ headers: { 'Content-Type': 'multipart/form-data' } })
    expect([...form.keys()]).toEqual(['sourceFont', 'package', 'manifest', 'recipe', 'metadata'])
    expect(form.get('sourceFont')).toBe(sourceFont)
    expect(form.get('package')).toBe(packageFile)
    await expect((form.get('manifest') as Blob).text()).resolves.toBe(JSON.stringify(manifest))
    await expect((form.get('recipe') as Blob).text()).resolves.toBe(JSON.stringify(recipe))
    await expect((form.get('metadata') as Blob).text()).resolves.toBe(JSON.stringify(metadata))
  })
})
