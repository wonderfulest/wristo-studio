import type { PathCommand } from 'opentype.js'
import type { BitmapFontRecipe } from './contracts'
import type { ParsedFontSource } from './fontSource'

export type GlyphRenderErrorCode = 'GLYPH_MISSING' | 'GLYPH_RENDER_EMPTY' | 'GLYPH_RENDER_FAILED'

export class GlyphRenderError extends Error {
  readonly code: GlyphRenderErrorCode
  readonly codepoint: number

  constructor(code: GlyphRenderErrorCode, codepoint: number) {
    super(`${code}: U+${codepoint.toString(16).toUpperCase().padStart(4, '0')}`)
    this.name = 'GlyphRenderError'
    this.code = code
    this.codepoint = codepoint
  }
}

export interface RenderedGlyph {
  codepoint: number
  width: number
  height: number
  xoffset: number
  yoffset: number
  xadvance: number
  alpha: Uint8Array
}

export interface RenderedGlyphSet {
  glyphs: RenderedGlyph[]
  lineHeight: number
  baseline: number
  diagnostics: { rendererPath: 'opentype-path'; rendererVersion: '1' }
}

interface WorkerFontEnvironment {
  FontFace?: typeof FontFace
  fonts?: { add(font: FontFace): void }
}

export interface RegisteredUploadedFontFace {
  family: string
  cssFont: string
  rendererPath: 'font-face'
}

export async function registerUploadedFontFace(
  source: ParsedFontSource,
  requestedWeight: number,
  environment: WorkerFontEnvironment = globalThis as WorkerFontEnvironment
): Promise<RegisteredUploadedFontFace | undefined> {
  if (!environment.FontFace || !environment.fonts) return undefined
  const family = `WristoUploaded-${source.bytes.byteLength}-${source.glyphCount}`
  const buffer = source.bytes.buffer.slice(source.bytes.byteOffset, source.bytes.byteOffset + source.bytes.byteLength) as ArrayBuffer
  const face = new environment.FontFace(family, buffer, { weight: String(source.sourceWeight) })
  await face.load()
  environment.fonts.add(face)
  return {
    family,
    cssFont: `${Math.round(requestedWeight)} 1px "${family}"`,
    rendererPath: 'font-face'
  }
}

interface Point {
  x: number
  y: number
}
type Contour = Point[]

function interpolateCurve(command: PathCommand, start: Point, steps = 12): Point[] {
  const points: Point[] = []
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps
    const inverse = 1 - t
    if (command.type === 'Q') {
      points.push({
        x: inverse * inverse * start.x + 2 * inverse * t * command.x1 + t * t * command.x,
        y: inverse * inverse * start.y + 2 * inverse * t * command.y1 + t * t * command.y
      })
    } else if (command.type === 'C') {
      points.push({
        x: inverse ** 3 * start.x + 3 * inverse * inverse * t * command.x1 + 3 * inverse * t * t * command.x2 + t ** 3 * command.x,
        y: inverse ** 3 * start.y + 3 * inverse * inverse * t * command.y1 + 3 * inverse * t * t * command.y2 + t ** 3 * command.y
      })
    }
  }
  return points
}

function flatten(commands: PathCommand[], shear: number, baseline: number): Contour[] {
  const contours: Contour[] = []
  let contour: Contour = []
  let current: Point = { x: 0, y: 0 }
  const transform = (point: Point): Point => ({
    x: point.x + shear * (baseline - point.y),
    y: point.y
  })
  const finish = () => {
    if (contour.length > 1) contours.push(contour)
    contour = []
  }

  for (const command of commands) {
    if (command.type === 'M') {
      finish()
      current = { x: command.x, y: command.y }
      contour.push(transform(current))
    } else if (command.type === 'L') {
      current = { x: command.x, y: command.y }
      contour.push(transform(current))
    } else if (command.type === 'Q' || command.type === 'C') {
      for (const point of interpolateCurve(command, current)) contour.push(transform(point))
      current = { x: command.x, y: command.y }
    } else if (command.type === 'Z') {
      if (contour.length && (contour[0].x !== contour.at(-1)?.x || contour[0].y !== contour.at(-1)?.y)) {
        contour.push(contour[0])
      }
      finish()
    }
  }
  finish()
  return contours
}

function inside(contours: Contour[], x: number, y: number): boolean {
  let crossings = 0
  for (const contour of contours) {
    for (let index = 0; index < contour.length - 1; index += 1) {
      const a = contour[index]
      const b = contour[index + 1]
      if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) crossings += 1
    }
  }
  return crossings % 2 === 1
}

function segmentDistance(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  const factor = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared))
  return Math.hypot(point.x - (start.x + factor * dx), point.y - (start.y + factor * dy))
}

function nearPath(contours: Contour[], point: Point, radius: number): boolean {
  if (radius <= 0) return false
  return contours.some((contour) => contour.slice(0, -1).some((start, index) => segmentDistance(point, start, contour[index + 1]) <= radius))
}

function rasterize(contours: Contour[], bounds: { left: number; top: number; width: number; height: number }, fill: boolean, strokeRadius: number): Uint8Array {
  const alpha = new Uint8Array(bounds.width * bounds.height)
  const samples = [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75]
  ]
  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      let covered = 0
      for (const [sx, sy] of samples) {
        const point = { x: bounds.left + x + sx, y: bounds.top + y + sy }
        const isInside = inside(contours, point.x, point.y)
        const onStroke = nearPath(contours, point, strokeRadius)
        if ((fill && isInside) || onStroke) covered += 1
      }
      alpha[y * bounds.width + x] = Math.round((covered / samples.length) * 255)
    }
  }
  return alpha
}

function cropAlpha(
  alpha: Uint8Array,
  bounds: { left: number; top: number; width: number; height: number }
): { alpha: Uint8Array; left: number; top: number; width: number; height: number } | undefined {
  let firstX = bounds.width
  let firstY = bounds.height
  let lastX = -1
  let lastY = -1
  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      if (alpha[y * bounds.width + x] === 0) continue
      firstX = Math.min(firstX, x)
      firstY = Math.min(firstY, y)
      lastX = Math.max(lastX, x)
      lastY = Math.max(lastY, y)
    }
  }
  if (lastX < 0) return undefined
  const width = lastX - firstX + 1
  const height = lastY - firstY + 1
  const cropped = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1) {
    cropped.set(alpha.subarray((firstY + y) * bounds.width + firstX, (firstY + y) * bounds.width + firstX + width), y * width)
  }
  return { alpha: cropped, left: bounds.left + firstX, top: bounds.top + firstY, width, height }
}

export function renderGlyphs(source: ParsedFontSource, codepoints: number[], size: number, recipe: BitmapFontRecipe): RenderedGlyphSet {
  const scale = size / source.unitsPerEm
  const baseline = Math.ceil(source.ascender * scale)
  const lineHeight = Math.ceil((source.ascender - source.descender) * scale)
  const shear = Math.tan((recipe.italicAngle * Math.PI) / 180)
  const outlineRadius = recipe.outlineMode === 'fill' ? 0 : recipe.outlineWidthEm * size
  const weightRadius = recipe.fontWeight > source.sourceWeight ? ((recipe.fontWeight - source.sourceWeight) / 500) * size * 0.04 : 0
  const strokeRadius = outlineRadius + weightRadius

  const glyphs = codepoints.map((codepoint): RenderedGlyph => {
    if (!source.supportedCodepoints.has(codepoint)) throw new GlyphRenderError('GLYPH_MISSING', codepoint)
    const glyph = source.font.charToGlyph(String.fromCodePoint(codepoint))
    if (glyph.index === 0 && codepoint !== 0) throw new GlyphRenderError('GLYPH_MISSING', codepoint)
    const xadvance = Math.max(1, Math.round((glyph.advanceWidth ?? source.unitsPerEm) * scale + weightRadius))
    const contours = flatten(glyph.getPath(0, baseline, size).commands, shear, baseline)
    if (contours.length === 0) {
      if (codepoint !== 0x20) throw new GlyphRenderError('GLYPH_RENDER_EMPTY', codepoint)
      return { codepoint, width: 0, height: 0, xoffset: 0, yoffset: 0, xadvance, alpha: new Uint8Array() }
    }

    const points = contours.flat()
    const margin = Math.ceil(strokeRadius) + 1
    const italicMargin = Math.ceil(Math.abs(shear) * 2)
    const left = Math.floor(Math.min(...points.map((point) => point.x))) - margin - (shear < 0 ? italicMargin : 0)
    const top = Math.floor(Math.min(...points.map((point) => point.y))) - margin
    const right = Math.ceil(Math.max(...points.map((point) => point.x))) + margin + (shear > 0 ? italicMargin : 0)
    const bottom = Math.ceil(Math.max(...points.map((point) => point.y))) + margin
    const bounds = { left, top, width: right - left, height: bottom - top }
    const fill = recipe.outlineMode !== 'outline-only'
    const cropped = cropAlpha(rasterize(contours, bounds, fill, strokeRadius), bounds)
    if (!cropped) throw new GlyphRenderError('GLYPH_RENDER_FAILED', codepoint)
    return {
      codepoint,
      width: cropped.width,
      height: cropped.height,
      xoffset: cropped.left,
      yoffset: cropped.top,
      xadvance,
      alpha: cropped.alpha
    }
  })

  return { glyphs, lineHeight, baseline, diagnostics: { rendererPath: 'opentype-path', rendererVersion: '1' } }
}
