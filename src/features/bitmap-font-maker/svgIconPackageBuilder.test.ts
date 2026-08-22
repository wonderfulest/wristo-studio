import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { buildSvgIconBitmapFontPackage, type SvgIconFontSlot } from './svgIconPackageBuilder'

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
const slots: SvgIconFontSlot[] = [
  { iconUnicode: '0030', codepoint: 0x30, symbolCode: 'heart_rate', label: 'Heart rate' },
  { iconUnicode: '0031', codepoint: 0x31, symbolCode: 'steps', label: 'Steps' },
]

describe('SVG icon bitmap font package builder', () => {
  it('builds a complete ordinary icon font package without a TTF entry', async () => {
    const progress: number[] = []
    const result = await buildSvgIconBitmapFontPackage(
      {
        slug: 'icon-font-20260822-a3f2',
        type: 'icon_font',
        charsetProfile: 'wristo-icon-v1',
        slots,
        sources: slots.map((slot) => ({
          iconUnicode: slot.iconUnicode,
          fileName: `${slot.iconUnicode}-${slot.symbolCode}.svg`,
          svg: '<svg viewBox="0 0 24 24"><path d="M0 0h24v24z"/></svg>',
        })),
        recipe: { schemaVersion: 1, rendererVersion: '1', contentScale: 0.88, antialias: true },
      },
      {
        rasterize: async (_sources, size) => ({
          lineHeight: size,
          baseline: size,
          glyphs: slots.map((slot) => ({
            codepoint: slot.codepoint,
            width: 2,
            height: 2,
            xoffset: 1,
            yoffset: 1,
            xadvance: size,
            alpha: new Uint8ClampedArray([255, 255, 255, 255]),
          })),
        }),
        encodePng: async () => png,
        hash: async (bytes) => `${new Uint8Array(bytes instanceof ArrayBuffer ? bytes : bytes.buffer).byteLength}`.padStart(64, '0'),
      },
      (item) => progress.push(item.completed),
    )

    expect(result.manifest).toMatchObject({
      slug: 'icon-font-20260822-a3f2',
      type: 'icon_font',
      charset: { profile: 'wristo-icon-v1', codepoints: [0x30, 0x31] },
    })
    expect(progress).toHaveLength(38)
    expect(progress.at(-1)).toBe(38)

    const zip = await JSZip.loadAsync(result.zip)
    const paths = Object.keys(zip.files).filter((path) => !zip.files[path].dir)
    expect(paths).toHaveLength(80)
    expect(paths).toContain('sources/0030-heart_rate.svg')
    expect(paths.some((path) => /\.(ttf|otf)$/i.test(path))).toBe(false)
    expect(await zip.file('48/icon-font-20260822-a3f2-g.fnt')!.async('string')).toContain('chars count=2')
  })

  it('rejects a package when any required ordinary icon source is missing', async () => {
    await expect(buildSvgIconBitmapFontPackage({
      slug: 'icon-font-20260822-a3f2',
      type: 'icon_font',
      charsetProfile: 'wristo-icon-v1',
      slots,
      sources: [{ iconUnicode: '0030', fileName: '0030-heart_rate.svg', svg: '<svg></svg>' }],
      recipe: { schemaVersion: 1, rendererVersion: '1', contentScale: 0.88, antialias: true },
    })).rejects.toThrow('SVG_ICON_SOURCE_SET_INCOMPLETE')
  })
})
