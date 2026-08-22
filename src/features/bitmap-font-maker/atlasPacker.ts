export const MAX_ATLAS_DIMENSION = 8192

export class AtlasPackingError extends Error {
  readonly code = 'ATLAS_TOO_LARGE' as const
  constructor() {
    super('ATLAS_TOO_LARGE')
    this.name = 'AtlasPackingError'
  }
}

export class AtlasInputError extends TypeError {
  readonly code = 'ATLAS_INVALID_INPUT' as const
  constructor(detail: string) {
    super(`ATLAS_INVALID_INPUT: ${detail}`)
    this.name = 'AtlasInputError'
  }
}

export interface AtlasGlyphRect {
  codepoint: number
  width: number
  height: number
}
export interface AtlasPlacement extends AtlasGlyphRect {
  x: number
  y: number
}
export interface PackedGlyphAtlas {
  width: number
  height: number
  placements: AtlasPlacement[]
}
export interface AtlasPackingOptions {
  padding: number
  powerOfTwo?: boolean
  preferSquare?: boolean
  maxDimension?: number
}

const nextPowerOfTwo = (value: number): number => 2 ** Math.ceil(Math.log2(Math.max(1, value)))

function packAtWidth(glyphs: AtlasGlyphRect[], width: number, padding: number, gap: number): PackedGlyphAtlas | undefined {
  const placements: AtlasPlacement[] = []
  let cursorX = padding
  let cursorY = padding
  let rowHeight = 0
  let usedWidth = 0
  for (const glyph of glyphs) {
    if (glyph.width + padding * 2 > width) return undefined
    if (cursorX > padding && cursorX + glyph.width + padding > width) {
      cursorX = padding
      cursorY += rowHeight + padding * 2 + gap
      rowHeight = 0
    }
    placements.push({ ...glyph, x: cursorX, y: cursorY })
    cursorX += glyph.width + padding * 2 + gap
    rowHeight = Math.max(rowHeight, glyph.height)
    usedWidth = Math.max(usedWidth, cursorX - gap - padding)
  }
  return { width: Math.max(1, usedWidth), height: Math.max(1, cursorY + rowHeight + padding), placements: placements.sort((a, b) => a.codepoint - b.codepoint) }
}

export function packGlyphAtlas(input: AtlasGlyphRect[], options: AtlasPackingOptions): PackedGlyphAtlas {
  const maxDimension = options.maxDimension ?? MAX_ATLAS_DIMENSION
  if (!Number.isSafeInteger(options.padding) || options.padding < 0) throw new AtlasInputError('padding')
  if (options.preferSquare !== undefined && typeof options.preferSquare !== 'boolean') throw new AtlasInputError('preferSquare')
  if (!Number.isSafeInteger(maxDimension) || maxDimension < 1 || maxDimension > MAX_ATLAS_DIMENSION) throw new AtlasInputError('maxDimension')
  const codepoints = new Set<number>()
  for (const glyph of input) {
    if (!Number.isSafeInteger(glyph.codepoint) || glyph.codepoint < 0 || glyph.codepoint > 0x10ffff || (glyph.codepoint >= 0xd800 && glyph.codepoint <= 0xdfff)) throw new AtlasInputError('codepoint')
    if (codepoints.has(glyph.codepoint)) throw new AtlasInputError('duplicate codepoint')
    codepoints.add(glyph.codepoint)
    if (!Number.isSafeInteger(glyph.width) || glyph.width < 0 || !Number.isSafeInteger(glyph.height) || glyph.height < 0) throw new AtlasInputError('glyph dimensions')
  }
  const padding = options.padding
  const gap = input.length > 1 ? 1 : 0
  const glyphs = [...input].sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height) || a.codepoint - b.codepoint)
  if (glyphs.some((glyph) => glyph.width + padding * 2 > maxDimension || glyph.height + padding * 2 > maxDimension)) throw new AtlasPackingError()
  if (glyphs.length === 0) return { width: 1, height: 1, placements: [] }
  const minimumWidth = Math.max(...glyphs.map((glyph) => glyph.width + padding * 2))
  const maximumWidth = Math.min(maxDimension, glyphs.reduce((sum, glyph) => sum + glyph.width + padding * 2, 0) + gap * (glyphs.length - 1))
  const widths = new Set<number>([minimumWidth, maximumWidth, Math.ceil(Math.sqrt(glyphs.reduce((sum, glyph) => sum + (glyph.width + padding * 2) * (glyph.height + padding * 2), 0)))])
  for (let width = nextPowerOfTwo(minimumWidth); width <= maximumWidth; width *= 2) widths.add(width)
  if (options.preferSquare) {
    let rowWidth = 0
    for (let index = 0; index < glyphs.length; index += 1) {
      rowWidth += glyphs[index].width + padding * 2 + (index > 0 ? gap : 0)
      widths.add(rowWidth)
    }
  }
  let best: PackedGlyphAtlas | undefined
  for (const width of [...widths].filter((value) => value >= minimumWidth && value <= maximumWidth).sort((a, b) => a - b)) {
    const packed = packAtWidth(glyphs, width, padding, gap)
    if (!packed || packed.height > maxDimension) continue
    if (!best) {
      best = packed
      continue
    }
    if (options.preferSquare) {
      const aspectPenalty = Math.abs(Math.log(packed.width / packed.height))
      const bestAspectPenalty = Math.abs(Math.log(best.width / best.height))
      const aspectDifference = aspectPenalty - bestAspectPenalty
      const landscapePenalty = packed.width < packed.height ? 1 : 0
      const bestLandscapePenalty = best.width < best.height ? 1 : 0
      if (
        aspectDifference < -Number.EPSILON ||
        (Math.abs(aspectDifference) <= Number.EPSILON && landscapePenalty < bestLandscapePenalty) ||
        (Math.abs(aspectDifference) <= Number.EPSILON && landscapePenalty === bestLandscapePenalty && packed.width * packed.height < best.width * best.height)
      ) {
        best = packed
      }
    } else if (packed.width * packed.height < best.width * best.height || (packed.width * packed.height === best.width * best.height && packed.width < best.width)) {
      best = packed
    }
  }
  if (!best) throw new AtlasPackingError()
  if (options.powerOfTwo) {
    best = { ...best, width: nextPowerOfTwo(best.width), height: nextPowerOfTwo(best.height) }
    if (best.width > maxDimension || best.height > maxDimension) throw new AtlasPackingError()
  }
  return best
}
