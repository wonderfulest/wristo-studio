import { beforeEach, describe, expect, it, vi } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@/config/axios', () => ({ default: { post } }))

import { isBitmapFontSlugConflict, publishBitmapFontBuild, publishSvgIconBitmapFontBuild, publishWeatherBitmapFontBuild } from './bitmapFontBuild'

describe('bitmap font publish client', () => {
  beforeEach(() => post.mockReset())

  it('posts the exact multipart contract without serializing source bytes as JSON', async () => {
    post.mockResolvedValue({ code: 0, data: { id: 7, slug: 'precision-numerals' } })
    const sourceFont = new File([new Uint8Array([1, 2])], 'Source.otf', { type: 'font/otf' })
    const packageFile = new File([new Uint8Array([3, 4])], 'precision-numerals.zip', { type: 'application/zip' })
    const manifest = { schemaVersion: 1, slug: 'precision-numerals' } as any
    const recipe = {
      schemaVersion: 1,
      rendererVersion: '1',
      fontWeight: 900,
      italicAngle: -3,
      outlineWidthEm: 0.07,
      outlineMode: 'fill',
      lineJoin: 'round',
      antialias: true,
    } as any
    const metadata = {
      fullName: 'Precision Numerals',
      slug: 'precision-numerals',
      type: 'number_font',
      language: 'en',
      styleTags: ['outline', 'sport'],
      searchKeywords: '',
      redistributionRightsAttested: true,
      rightsAttestationVersion: 'v1'
    } as import('./bitmapFontBuild').BitmapFontPublishMetadata

    await publishBitmapFontBuild({ sourceFont, packageFile, manifest, recipe, metadata })

    expect(post).toHaveBeenCalledTimes(1)
    const [url, form, config] = post.mock.calls[0]
    expect(url).toBe('/dsn/fonts/bitmap-build/publish')
    expect(config).toMatchObject({ headers: { 'Content-Type': 'multipart/form-data' } })
    expect([...form.keys()]).toEqual(['sourceFont', 'package', 'manifest', 'recipe', 'metadata'])
    expect(form.get('sourceFont')).toBe(sourceFont)
    expect(form.get('package')).toBe(packageFile)
    await expect((form.get('manifest') as Blob).text()).resolves.toBe(JSON.stringify(manifest))
    await expect((form.get('recipe') as Blob).text()).resolves.toBe('{"antialias":true,"fontWeight":900,"italicAngle":-3,"lineJoin":"round","outlineMode":"fill","outlineWidthEm":0.07,"rendererVersion":"1","schemaVersion":1}')
    await expect((form.get('metadata') as Blob).text()).resolves.toBe(JSON.stringify(metadata))
  })

  it('sends the original font id as one-shot overwrite authorization', async () => {
    post.mockResolvedValue({ code: 0, data: { id: 42, slug: 'precision-numerals' } })
    const input = {
      sourceFont: new File([new Uint8Array([1])], 'Source.otf', { type: 'font/otf' }),
      packageFile: new File([new Uint8Array([2])], 'precision-numerals.zip', { type: 'application/zip' }),
      manifest: { schemaVersion: 1, slug: 'precision-numerals' } as any,
      recipe: { schemaVersion: 1, rendererVersion: '1' } as any,
      metadata: { fullName: 'Precision Numerals', slug: 'precision-numerals', type: 'number_font', language: 'en' } as any,
      fontId: 42,
      overwrite: true,
    }

    await publishBitmapFontBuild(input)

    const [url, form] = post.mock.calls[0]
    expect(url).toBe('/dsn/fonts/bitmap-build/publish?overwrite=true&fontId=42')
    expect([...form.keys()]).toEqual(['sourceFont', 'package', 'manifest', 'recipe', 'metadata'])
  })

  it('recognizes HTTP and wrapped business-code slug conflicts', () => {
    expect(isBitmapFontSlugConflict({ response: { status: 409 } })).toBe(true)
    expect(isBitmapFontSlugConflict({ code: 411 })).toBe(true)
    expect(isBitmapFontSlugConflict({ data: { code: 411 } })).toBe(true)
    expect(isBitmapFontSlugConflict({ response: { status: 200, data: { code: 411 } } })).toBe(true)
    expect(isBitmapFontSlugConflict({ response: { data: { data: { code: 411 } } } })).toBe(true)
    expect(isBitmapFontSlugConflict({ response: { data: { code: 'FONT_SLUG_CONFLICT' } } })).toBe(true)
    expect(isBitmapFontSlugConflict({ response: { data: { code: 500 } } })).toBe(false)
  })

  it('publishes a weather package without a sourceFont multipart part', async () => {
    post.mockResolvedValue({ code: 0, data: { id: 9, slug: 'my-weather' } })
    const packageFile = new File([new Uint8Array([3, 4])], 'my-weather.zip', { type: 'application/zip' })
    const manifest = { schemaVersion: 1, slug: 'my-weather', type: 'weather_font' } as any
    const recipe = { schemaVersion: 1, rendererVersion: '1', contentScale: 0.88, antialias: true } as any
    const metadata = {
      fullName: 'My Weather',
      slug: 'my-weather',
      type: 'weather_font',
      language: 'en',
      styleTags: [],
      searchKeywords: '',
      redistributionRightsAttested: true,
      rightsAttestationVersion: 'v1'
    } as any

    await publishWeatherBitmapFontBuild({ glyphId: 42, packageFile, manifest, recipe, metadata })

    const [url, form] = post.mock.calls[0]
    expect(url).toBe('/dsn/fonts/bitmap-build/weather/publish')
    expect([...form.keys()]).toEqual(['glyphId', 'package', 'manifest', 'recipe', 'metadata'])
    expect(form.get('glyphId')).toBe('42')
    expect(form.has('sourceFont')).toBe(false)
    await expect((form.get('recipe') as Blob).text()).resolves.toBe('{"antialias":true,"contentScale":0.88,"rendererVersion":"1","schemaVersion":1}')
  })

  it('publishes an ordinary SVG icon package without a sourceFont multipart part', async () => {
    post.mockResolvedValue({ code: 0, data: { id: 10, slug: 'icon-font-20260822-a3f2' } })
    const packageFile = new File([new Uint8Array([3, 4])], 'icon-font-20260822-a3f2.zip', { type: 'application/zip' })
    const manifest = { schemaVersion: 1, slug: 'icon-font-20260822-a3f2', type: 'icon_font' } as any
    const recipe = { schemaVersion: 1, rendererVersion: '1', contentScale: 0.88, antialias: true } as any
    const metadata = {
      fullName: 'icon-font-20260822-a3f2',
      slug: 'icon-font-20260822-a3f2',
      type: 'icon_font',
      language: 'en',
      redistributionRightsAttested: true,
      rightsAttestationVersion: 'v1',
    } as any

    await publishSvgIconBitmapFontBuild({ glyphId: 43, packageFile, manifest, recipe, metadata })

    const [url, form] = post.mock.calls[0]
    expect(url).toBe('/dsn/fonts/bitmap-build/svg-icon/publish')
    expect([...form.keys()]).toEqual(['glyphId', 'package', 'manifest', 'recipe', 'metadata'])
    expect(form.get('glyphId')).toBe('43')
    expect(form.has('sourceFont')).toBe(false)
  })

  it('adds one-shot overwrite authorization only to the confirmed retry', async () => {
    post.mockResolvedValue({ code: 0, data: { id: 9, slug: 'my-weather' } })
    const input = {
      glyphId: 42,
      packageFile: new File([new Uint8Array([3, 4])], 'my-weather.zip', { type: 'application/zip' }),
      manifest: { schemaVersion: 1, slug: 'my-weather', type: 'weather_font' } as any,
      recipe: { schemaVersion: 1, rendererVersion: '1', contentScale: 0.88, antialias: true } as any,
      metadata: { fullName: 'My Weather', slug: 'my-weather', type: 'weather_font', language: 'en' } as any,
      overwrite: true
    }

    await publishWeatherBitmapFontBuild(input)

    expect(post.mock.calls[0][0]).toBe('/dsn/fonts/bitmap-build/weather/publish?overwrite=true')
    expect([...post.mock.calls[0][1].keys()]).toEqual(['glyphId', 'package', 'manifest', 'recipe', 'metadata'])
    expect(post.mock.calls[0][2].suppressBusinessErrorCodes).toEqual([411])
  })
})
