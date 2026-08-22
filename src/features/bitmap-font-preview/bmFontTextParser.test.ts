import { describe, expect, it } from 'vitest'
import { parseBmFontText } from './bmFontTextParser'

const descriptor = `info face="demo" size=30
common lineHeight=32 base=25 scaleW=128 scaleH=64 pages=1 packed=0
page id=0 file="demo-g_0.png"
chars count=2
char id=48 x=1 y=2 width=10 height=12 xoffset=-1 yoffset=3 xadvance=11 page=0 chnl=15
char id=49 x=13 y=2 width=8 height=12 xoffset=0 yoffset=3 xadvance=9 page=0 chnl=15
kernings count=1
kerning first=48 second=49 amount=-2`

describe('parseBmFontText', () => {
  it('parses atlas metrics, glyph offsets and kerning used by the pixel preview', () => {
    const parsed = parseBmFontText(descriptor)

    expect(parsed).toMatchObject({ lineHeight: 32, base: 25, scaleW: 128, scaleH: 64, pageFile: 'demo-g_0.png' })
    expect(parsed.glyphs.get(48)).toEqual({ id: 48, x: 1, y: 2, width: 10, height: 12, xoffset: -1, yoffset: 3, xadvance: 11, page: 0 })
    expect(parsed.kernings.get('48:49')).toBe(-2)
  })

  it('rejects descriptors that cannot be rendered by the single-atlas preview', () => {
    expect(() => parseBmFontText(descriptor.replace('pages=1', 'pages=2'))).toThrow('single-page')
    expect(() => parseBmFontText(descriptor.replace('scaleW=128', 'scaleW=0'))).toThrow('atlas size')
    expect(() => parseBmFontText(descriptor.replace('page=0 chnl=15', 'page=1 chnl=15'))).toThrow('page 0')
  })
})
