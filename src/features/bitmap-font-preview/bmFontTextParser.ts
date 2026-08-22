export interface BmFontGlyph {
  id: number
  x: number
  y: number
  width: number
  height: number
  xoffset: number
  yoffset: number
  xadvance: number
  page: number
}

export interface BmFontDescriptor {
  lineHeight: number
  base: number
  scaleW: number
  scaleH: number
  pageFile: string
  glyphs: Map<number, BmFontGlyph>
  kernings: Map<string, number>
}

const fieldsFor = (line: string) => {
  const fields = new Map<string, string>()
  const pattern = /(\w+)=("[^"]*"|[^\s]+)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(line)) !== null) {
    const raw = match[2]
    fields.set(match[1], raw.startsWith('"') ? raw.slice(1, -1) : raw)
  }
  return fields
}

const integer = (fields: Map<string, string>, name: string) => {
  const raw = fields.get(name)
  if (raw == null || !/^-?\d+$/.test(raw)) throw new Error(`Invalid BMFont ${name}`)
  const value = Number(raw)
  if (!Number.isSafeInteger(value)) throw new Error(`Invalid BMFont ${name}`)
  return value
}

export const kerningKey = (first: number, second: number) => `${first}:${second}`

export function parseBmFontText(text: string): BmFontDescriptor {
  if (!text || text.length > 1024 * 1024) throw new Error('Invalid BMFont descriptor size')
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const commonLine = lines.find(line => line.startsWith('common '))
  const pageLine = lines.find(line => line.startsWith('page '))
  if (!commonLine || !pageLine) throw new Error('Invalid BMFont descriptor')

  const common = fieldsFor(commonLine)
  const lineHeight = integer(common, 'lineHeight')
  const base = integer(common, 'base')
  const scaleW = integer(common, 'scaleW')
  const scaleH = integer(common, 'scaleH')
  const pages = integer(common, 'pages')
  if (pages !== 1) throw new Error('BMFont preview supports a single-page atlas')
  if (lineHeight <= 0 || base < 0 || scaleW <= 0 || scaleH <= 0) throw new Error('Invalid BMFont atlas size')

  const page = fieldsFor(pageLine)
  if (integer(page, 'id') !== 0) throw new Error('BMFont preview requires page 0')
  const pageFile = page.get('file') || ''
  if (!pageFile) throw new Error('Invalid BMFont page file')

  const glyphs = new Map<number, BmFontGlyph>()
  for (const line of lines.filter(value => value.startsWith('char '))) {
    const fields = fieldsFor(line)
    const glyph: BmFontGlyph = {
      id: integer(fields, 'id'),
      x: integer(fields, 'x'),
      y: integer(fields, 'y'),
      width: integer(fields, 'width'),
      height: integer(fields, 'height'),
      xoffset: integer(fields, 'xoffset'),
      yoffset: integer(fields, 'yoffset'),
      xadvance: integer(fields, 'xadvance'),
      page: integer(fields, 'page'),
    }
    if (glyph.page !== 0) throw new Error('BMFont glyph must use page 0')
    if (glyph.id < 0 || glyph.width < 0 || glyph.height < 0 || glyph.x < 0 || glyph.y < 0
      || glyph.x + glyph.width > scaleW || glyph.y + glyph.height > scaleH) {
      throw new Error('Invalid BMFont glyph bounds')
    }
    if (glyphs.has(glyph.id)) throw new Error('Duplicate BMFont glyph')
    glyphs.set(glyph.id, glyph)
  }
  if (!glyphs.size) throw new Error('BMFont descriptor has no glyphs')

  const kernings = new Map<string, number>()
  for (const line of lines.filter(value => value.startsWith('kerning '))) {
    const fields = fieldsFor(line)
    const first = integer(fields, 'first')
    const second = integer(fields, 'second')
    kernings.set(kerningKey(first, second), integer(fields, 'amount'))
  }

  return { lineHeight, base, scaleW, scaleH, pageFile, glyphs, kernings }
}
