import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { WEATHER_FONT_SLOTS } from './weatherSourceSet'
import { buildWeatherBitmapFontPackage } from './weatherPackageBuilder'

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

describe('weather bitmap font package builder', () => {
  it('builds 38 BMFont sizes from twelve SVG sources without a TTF entry', async () => {
    const progress: number[] = []
    const atlasSizes: Array<{ width: number; height: number }> = []
    const sources = WEATHER_FONT_SLOTS.map((slot) => ({
      iconUnicode: slot.iconUnicode,
      fileName: `${slot.iconUnicode}-${slot.symbolCode}.svg`,
      svg: `<svg viewBox="0 0 24 24"><path d="M0 0h24v24z"/></svg>`
    }))

    const result = await buildWeatherBitmapFontPackage(
      {
        slug: 'my-weather',
        sources,
        recipe: { schemaVersion: 1, rendererVersion: '1', contentScale: 0.88, antialias: true }
      },
      {
        rasterize: async (_sources, size) => ({
          lineHeight: size,
          baseline: size,
          glyphs: WEATHER_FONT_SLOTS.map((slot) => ({
            codepoint: slot.codepoint,
            width: 2,
            height: 2,
            xoffset: 1,
            yoffset: 1,
            xadvance: size,
            alpha: new Uint8ClampedArray([255, 255, 255, 255])
          }))
        }),
        encodePng: async (atlas) => {
          atlasSizes.push({ width: atlas.width, height: atlas.height })
          return png
        },
        hash: async (bytes) => `${new Uint8Array(bytes instanceof ArrayBuffer ? bytes : bytes.buffer).byteLength}`.padStart(64, '0')
      },
      (item) => progress.push(item.completed)
    )

    expect(result.manifest.type).toBe('weather_font')
    expect(result.manifest.charset.codepoints).toEqual(WEATHER_FONT_SLOTS.map((slot) => slot.codepoint))
    expect(result.manifest.source.files).toHaveLength(12)
    expect(progress).toHaveLength(38)
    expect(progress.at(-1)).toBe(38)
    expect(atlasSizes).toHaveLength(38)
    expect(atlasSizes.every((atlas) => atlas.width >= atlas.height && atlas.width / atlas.height < 1.5)).toBe(true)

    const zip = await JSZip.loadAsync(result.zip)
    const paths = Object.keys(zip.files).filter((path) => !zip.files[path].dir)
    expect(paths).toHaveLength(90)
    expect(paths).toContain('sources/101d-clear_sky.svg')
    expect(paths.some((path) => /\.(ttf|otf)$/i.test(path))).toBe(false)

    const descriptor = await zip.file('48/my-weather-g.fnt')!.async('string')
    expect(descriptor).toContain('chars count=12')
    expect(descriptor).toContain(`char id=${Number.parseInt('101d', 16)}`)
  })
})
