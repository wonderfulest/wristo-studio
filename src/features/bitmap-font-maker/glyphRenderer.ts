import type { PathCommand } from 'opentype.js'
import type { BitmapFontRecipe } from './contracts'
import { BITMAP_FONT_SIZES } from './contracts'
import type { ParsedFontSource } from './fontSource'

export type GlyphRenderErrorCode = 'GLYPH_MISSING' | 'GLYPH_RENDER_EMPTY' | 'GLYPH_RENDER_FAILED' | 'GLYPH_RENDER_INVALID_INPUT' | 'GLYPH_RENDER_TOO_LARGE' | 'GLYPH_OUTLINE_REQUIRED'

export class GlyphRenderError extends Error {
  readonly code: GlyphRenderErrorCode
  readonly codepoint: number

  constructor(code: GlyphRenderErrorCode, codepoint = 0) {
    super(`${code}: U+${codepoint.toString(16).toUpperCase().padStart(4, '0')}`)
    this.name = 'GlyphRenderError'
    this.code = code
    this.codepoint = codepoint
  }
}

const ALLOWED_SIZES = new Set<number>(BITMAP_FONT_SIZES)
const MAX_GLYPH_DIMENSION = 8192
const MAX_GLYPH_AREA = MAX_GLYPH_DIMENSION * MAX_GLYPH_DIMENSION

function validateRasterRequest(source: ParsedFontSource, size: number, recipe: BitmapFontRecipe): void {
  if (!Number.isSafeInteger(size) || !ALLOWED_SIZES.has(size)) throw new GlyphRenderError('GLYPH_RENDER_INVALID_INPUT')
  if (!Number.isFinite(source.unitsPerEm) || source.unitsPerEm <= 0 || !Number.isFinite(source.ascender) || !Number.isFinite(source.descender)) throw new GlyphRenderError('GLYPH_RENDER_INVALID_INPUT')
  const baseline = Math.ceil(source.ascender * (size / source.unitsPerEm))
  const lineHeight = Math.ceil((source.ascender - source.descender) * (size / source.unitsPerEm))
  if (!Number.isSafeInteger(baseline) || !Number.isSafeInteger(lineHeight) || lineHeight <= 0) throw new GlyphRenderError('GLYPH_RENDER_INVALID_INPUT')
  const syntheticWeight = recipe.fontWeight > source.sourceWeight
  if (recipe.outlineMode === 'outline-only' && recipe.outlineWidthEm === 0 && !syntheticWeight) throw new GlyphRenderError('GLYPH_OUTLINE_REQUIRED')
}

function validateGlyphAllocation(width: number, height: number, codepoint: number): void {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 0 || height < 0) throw new GlyphRenderError('GLYPH_RENDER_INVALID_INPUT', codepoint)
  if (width > MAX_GLYPH_DIMENSION || height > MAX_GLYPH_DIMENSION || width * height > MAX_GLYPH_AREA) throw new GlyphRenderError('GLYPH_RENDER_TOO_LARGE', codepoint)
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
  diagnostics: { rendererPath: 'opentype-path' | 'font-face-canvas'; rendererVersion: '1' }
}

interface FontFaceLike {
  load(): Promise<FontFaceLike>
}

interface CanvasTextMetricsLike {
  width: number
  actualBoundingBoxLeft: number
  actualBoundingBoxRight: number
  actualBoundingBoxAscent: number
  actualBoundingBoxDescent: number
}

interface WorkerCanvasContext {
  font: string
  textBaseline: string
  lineJoin: string
  lineWidth: number
  measureText(text: string): CanvasTextMetricsLike
  fillText(text: string, x: number, y: number): void
  strokeText(text: string, x: number, y: number): void
  getImageData(x: number, y: number, width: number, height: number): { data: Uint8ClampedArray }
}

interface WorkerFontEnvironment {
  FontFace?: new (family: string, source: ArrayBuffer, descriptors: { weight: string }) => FontFaceLike
  fonts?: { add(font: FontFaceLike): void; delete?(font: FontFaceLike): boolean }
  OffscreenCanvas?: new (width: number, height: number) => { getContext(type: '2d', options?: { willReadFrequently: boolean }): WorkerCanvasContext | null }
}

export interface RegisteredUploadedFontFace {
  family: string
  cssFont: string
  rendererPath: 'font-face'
  dispose(): void
}

function sourceBytesHash(bytes: Uint8Array): string {
  let hash = 0xcbf29ce484222325n
  for (const byte of bytes) {
    hash ^= BigInt(byte)
    hash = BigInt.asUintN(64, hash * 0x100000001b3n)
  }
  return hash.toString(16).padStart(16, '0')
}

export async function registerUploadedFontFace(
  source: ParsedFontSource,
  requestedWeight: number,
  environment: WorkerFontEnvironment = globalThis as unknown as WorkerFontEnvironment
): Promise<RegisteredUploadedFontFace | undefined> {
  if (!environment.FontFace || !environment.fonts?.delete) return undefined
  const family = `WristoUploaded-${sourceBytesHash(source.bytes)}`
  const buffer = source.bytes.buffer.slice(source.bytes.byteOffset, source.bytes.byteOffset + source.bytes.byteLength) as ArrayBuffer
  const face = new environment.FontFace(family, buffer, { weight: String(source.sourceWeight) })
  try {
    await face.load()
    environment.fonts.add(face)
  } catch (error) {
    environment.fonts.delete(face)
    throw error
  }
  let disposed = false
  return {
    family,
    cssFont: `${Math.round(requestedWeight)} 1px "${family}"`,
    rendererPath: 'font-face',
    dispose: () => {
      if (disposed) return
      disposed = true
      environment.fonts?.delete?.(face)
    }
  }
}

export interface RasterPoint {
  x: number
  y: number
}
type Point = RasterPoint
type Contour = Point[]

type CurveCommand = Extract<PathCommand, { type: 'Q' | 'C' }>

function curveSteps(command: CurveCommand, start: Point): number {
  const points =
    command.type === 'C'
      ? [start, { x: command.x1, y: command.y1 }, { x: command.x2, y: command.y2 }, { x: command.x, y: command.y }]
      : [start, { x: command.x1, y: command.y1 }, { x: command.x, y: command.y }]
  let controlLength = 0
  for (let index = 1; index < points.length; index += 1) controlLength += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y)
  return Math.max(4, Math.min(64, Math.ceil(controlLength / 2)))
}

function interpolateCurve(command: CurveCommand, start: Point): Point[] {
  const points: Point[] = []
  const steps = curveSteps(command, start)
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

function flatten(commands: PathCommand[], shear: number, horizontalScale: number, baseline: number): Contour[] {
  const contours: Contour[] = []
  let contour: Contour = []
  let current: Point = { x: 0, y: 0 }
  const transform = (point: Point): Point => ({
    x: (point.x + shear * (baseline - point.y)) * horizontalScale,
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

interface Segment {
  ax: number
  ay: number
  bx: number
  by: number
  minX: number
  maxX: number
  minY: number
  maxY: number
}

function buildSegments(contours: ReadonlyArray<ReadonlyArray<RasterPoint>>): Segment[] {
  const segments: Segment[] = []
  for (const contour of contours) {
    for (let index = 0; index < contour.length - 1; index += 1) {
      const start = contour[index]
      const end = contour[index + 1]
      segments.push({
        ax: start.x,
        ay: start.y,
        bx: end.x,
        by: end.y,
        minX: Math.min(start.x, end.x),
        maxX: Math.max(start.x, end.x),
        minY: Math.min(start.y, end.y),
        maxY: Math.max(start.y, end.y)
      })
    }
  }
  return segments
}

function segmentDistanceSquared(x: number, y: number, segment: Segment): number {
  const dx = segment.bx - segment.ax
  const dy = segment.by - segment.ay
  const lengthSquared = dx * dx + dy * dy
  const factor = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - segment.ax) * dx + (y - segment.ay) * dy) / lengthSquared))
  const distanceX = x - (segment.ax + factor * dx)
  const distanceY = y - (segment.ay + factor * dy)
  return distanceX * distanceX + distanceY * distanceY
}

function rowBuckets(segments: Segment[], bounds: { top: number; height: number }, expansion: number): Segment[][] {
  const rows = Array.from({ length: bounds.height }, () => [] as Segment[])
  for (const segment of segments) {
    const first = Math.max(0, Math.floor(segment.minY - expansion - bounds.top))
    const last = Math.min(bounds.height - 1, Math.floor(segment.maxY + expansion - bounds.top))
    for (let row = first; row <= last; row += 1) rows[row].push(segment)
  }
  return rows
}

function nonZeroInside(segments: Segment[], x: number, y: number): boolean {
  let winding = 0
  for (const segment of segments) {
    const cross = (segment.bx - segment.ax) * (y - segment.ay) - (x - segment.ax) * (segment.by - segment.ay)
    if (segment.ay <= y && segment.by > y && cross > 0) winding += 1
    else if (segment.ay > y && segment.by <= y && cross < 0) winding -= 1
  }
  return winding !== 0
}

function nearPath(segments: Segment[], x: number, y: number, radius: number): boolean {
  if (radius <= 0) return false
  const squaredRadius = radius * radius
  for (const segment of segments) {
    if (x < segment.minX - radius || x > segment.maxX + radius || y < segment.minY - radius || y > segment.maxY + radius) continue
    if (segmentDistanceSquared(x, y, segment) <= squaredRadius) return true
  }
  return false
}

export function rasterizeFallbackContours(
  contours: ReadonlyArray<ReadonlyArray<RasterPoint>>,
  bounds: { left: number; top: number; width: number; height: number },
  fill: boolean,
  strokeRadius: number,
  insetRadius = 0
): Uint8Array {
  if (!Number.isSafeInteger(bounds.left) || !Number.isSafeInteger(bounds.top)) throw new GlyphRenderError('GLYPH_RENDER_INVALID_INPUT')
  validateGlyphAllocation(bounds.width, bounds.height, 0)
  const alpha = new Uint8Array(bounds.width * bounds.height)
  const segments = buildSegments(contours)
  const fillRows = fill ? rowBuckets(segments, bounds, 0) : []
  const strokeRows = strokeRadius > 0 ? rowBuckets(segments, bounds, strokeRadius) : []
  const insetRows = insetRadius > 0 ? rowBuckets(segments, bounds, insetRadius) : []
  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      let covered = 0
      for (let sample = 0; sample < 4; sample += 1) {
        const sampleX = bounds.left + x + (sample % 2 === 0 ? 0.25 : 0.75)
        const sampleY = bounds.top + y + (sample < 2 ? 0.25 : 0.75)
        const isInside = fill && nonZeroInside(fillRows[y], sampleX, sampleY)
        const onStroke = strokeRadius > 0 && nearPath(strokeRows[y], sampleX, sampleY, strokeRadius)
        const removedByInset = insetRadius > 0 && nearPath(insetRows[y], sampleX, sampleY, insetRadius)
        if ((fill && isInside && !removedByInset) || onStroke) covered += 1
      }
      alpha[y * bounds.width + x] = Math.round((covered / 4) * 255)
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

function alphaFromRgba(rgba: Uint8ClampedArray): Uint8Array {
  const alpha = new Uint8Array(rgba.length / 4)
  for (let sourceIndex = 3, alphaIndex = 0; sourceIndex < rgba.length; sourceIndex += 4, alphaIndex += 1) {
    alpha[alphaIndex] = rgba[sourceIndex]
  }
  return alpha
}

function renderGlyphsWithWorkerCanvas(
  source: ParsedFontSource,
  codepoints: number[],
  size: number,
  recipe: BitmapFontRecipe,
  environment: WorkerFontEnvironment,
  registration: RegisteredUploadedFontFace
): RenderedGlyphSet {
  validateRasterRequest(source, size, recipe)
  const CanvasConstructor = environment.OffscreenCanvas!

  const scale = size / source.unitsPerEm
  const baseline = Math.ceil(source.ascender * scale)
  const lineHeight = Math.ceil((source.ascender - source.descender) * scale)
  const outlineRadius = recipe.outlineMode === 'fill' ? 0 : recipe.outlineWidthEm * size
  const italic = recipe.italicAngle === 0 ? 'normal' : `oblique ${recipe.italicAngle}deg`
  const cssFont = `${italic} ${Math.round(recipe.fontWeight)} ${size}px "${registration.family}"`

  {
    const measureContext = new CanvasConstructor(1, 1).getContext('2d', { willReadFrequently: true })
    if (!measureContext) throw new Error('GLYPH_RENDER_FAILED: Canvas 2D context unavailable')
    measureContext.font = cssFont
    measureContext.textBaseline = 'alphabetic'

    const glyphs = codepoints.map((codepoint): RenderedGlyph => {
      if (!source.supportedCodepoints.has(codepoint)) throw new GlyphRenderError('GLYPH_MISSING', codepoint)
      const text = String.fromCodePoint(codepoint)
      const metrics = measureContext.measureText(text)
      const xadvance = Math.max(1, Math.round(metrics.width))
      if (codepoint === 0x20) return { codepoint, width: 0, height: 0, xoffset: 0, yoffset: 0, xadvance, alpha: new Uint8Array() }

      const padding = Math.ceil(outlineRadius) + 2
      const width = Math.max(1, Math.ceil(metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight) + padding * 2)
      const height = Math.max(1, Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) + padding * 2)
      validateGlyphAllocation(width, height, codepoint)
      const originX = padding + Math.ceil(metrics.actualBoundingBoxLeft)
      const originY = padding + Math.ceil(metrics.actualBoundingBoxAscent)
      const context = new CanvasConstructor(width, height).getContext('2d', { willReadFrequently: true })
      if (!context) throw new GlyphRenderError('GLYPH_RENDER_FAILED', codepoint)
      context.font = cssFont
      context.textBaseline = 'alphabetic'
      context.lineJoin = 'round'
      context.lineWidth = outlineRadius * 2
      if (recipe.outlineMode !== 'fill' && outlineRadius > 0) context.strokeText(text, originX, originY)
      if (recipe.outlineMode !== 'outline-only') context.fillText(text, originX, originY)

      const bounds = { left: 0, top: 0, width, height }
      const cropped = cropAlpha(alphaFromRgba(context.getImageData(0, 0, width, height).data), bounds)
      if (!cropped) throw new GlyphRenderError('GLYPH_RENDER_EMPTY', codepoint)
      return {
        codepoint,
        width: cropped.width,
        height: cropped.height,
        xoffset: cropped.left - originX,
        yoffset: cropped.top - originY + baseline,
        xadvance,
        alpha: cropped.alpha
      }
    })
    return { glyphs, lineHeight, baseline, diagnostics: { rendererPath: 'font-face-canvas', rendererVersion: '1' } }
  }
}

export interface GlyphRendererSession {
  readonly rendererPath: 'opentype-path' | 'font-face-canvas'
  render(size: number, recipe: BitmapFontRecipe, codepoints: number[]): RenderedGlyphSet
  dispose(): void
}

export async function createGlyphRendererSession(source: ParsedFontSource, environment: WorkerFontEnvironment = globalThis as unknown as WorkerFontEnvironment): Promise<GlyphRendererSession> {
  let registration: RegisteredUploadedFontFace | undefined
  if (environment.FontFace && environment.fonts?.delete && environment.OffscreenCanvas) {
    try {
      registration = await registerUploadedFontFace(source, source.sourceWeight, environment)
    } catch {
      registration = undefined
    }
  }
  let disposed = false
  return {
    rendererPath: registration ? 'font-face-canvas' : 'opentype-path',
    render: (size, recipe, codepoints) => {
      if (disposed) throw new GlyphRenderError('GLYPH_RENDER_INVALID_INPUT')
      const needsDeterministicTransform = recipe.fontWeight !== source.sourceWeight || recipe.italicAngle !== 0 || (recipe.horizontalScale ?? 1) !== 1
      return registration && !needsDeterministicTransform
        ? renderGlyphsWithWorkerCanvas(source, codepoints, size, recipe, environment, registration)
        : renderGlyphs(source, codepoints, size, recipe)
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      registration?.dispose()
    }
  }
}

/** Convenience wrapper for one render. Batch generation should reuse createGlyphRendererSession. */
export async function renderGlyphsPreferWorkerCanvas(
  source: ParsedFontSource,
  codepoints: number[],
  size: number,
  recipe: BitmapFontRecipe,
  environment: WorkerFontEnvironment = globalThis as unknown as WorkerFontEnvironment
): Promise<RenderedGlyphSet> {
  const session = await createGlyphRendererSession(source, environment)
  try {
    return session.render(size, recipe, codepoints)
  } finally {
    session.dispose()
  }
}

export function renderGlyphs(source: ParsedFontSource, codepoints: number[], size: number, recipe: BitmapFontRecipe): RenderedGlyphSet {
  validateRasterRequest(source, size, recipe)
  const scale = size / source.unitsPerEm
  const baseline = Math.ceil(source.ascender * scale)
  const lineHeight = Math.ceil((source.ascender - source.descender) * scale)
  // Font outlines use a y-up coordinate system while CSS skewX is evaluated in
  // the screen's y-down coordinate system, so negate the angle to keep both previews aligned.
  const shear = Math.tan((-recipe.italicAngle * Math.PI) / 180)
  const horizontalScale = recipe.horizontalScale ?? 1
  const outlineRadius = recipe.outlineMode === 'fill' ? 0 : recipe.outlineWidthEm * size
  const weightRadius = ((recipe.fontWeight - source.sourceWeight) / 500) * size * 0.04
  const strokeRadius = Math.max(0, outlineRadius + Math.max(0, weightRadius))
  const insetRadius = recipe.outlineMode === 'fill' ? Math.max(0, -weightRadius) : 0

  const glyphs = codepoints.map((codepoint): RenderedGlyph => {
    if (!source.supportedCodepoints.has(codepoint)) throw new GlyphRenderError('GLYPH_MISSING', codepoint)
    const glyph = source.font.charToGlyph(String.fromCodePoint(codepoint))
    if (glyph.index === 0 && codepoint !== 0) throw new GlyphRenderError('GLYPH_MISSING', codepoint)
    const xadvance = Math.max(1, Math.round(((glyph.advanceWidth ?? source.unitsPerEm) * scale + weightRadius) * horizontalScale))
    const contours = flatten(glyph.getPath(0, baseline, size).commands, shear, horizontalScale, baseline)
    if (contours.length === 0) {
      if (codepoint !== 0x20) throw new GlyphRenderError('GLYPH_RENDER_EMPTY', codepoint)
      return { codepoint, width: 0, height: 0, xoffset: 0, yoffset: 0, xadvance, alpha: new Uint8Array() }
    }

    let minimumX = Number.POSITIVE_INFINITY
    let minimumY = Number.POSITIVE_INFINITY
    let maximumX = Number.NEGATIVE_INFINITY
    let maximumY = Number.NEGATIVE_INFINITY
    for (const contour of contours) {
      for (const point of contour) {
        minimumX = Math.min(minimumX, point.x)
        minimumY = Math.min(minimumY, point.y)
        maximumX = Math.max(maximumX, point.x)
        maximumY = Math.max(maximumY, point.y)
      }
    }
    const margin = Math.ceil(strokeRadius) + 1
    const italicMargin = Math.ceil(Math.abs(shear) * 2)
    const left = Math.floor(minimumX) - margin - (shear < 0 ? italicMargin : 0)
    const top = Math.floor(minimumY) - margin
    const right = Math.ceil(maximumX) + margin + (shear > 0 ? italicMargin : 0)
    const bottom = Math.ceil(maximumY) + margin
    const bounds = { left, top, width: right - left, height: bottom - top }
    validateGlyphAllocation(bounds.width, bounds.height, codepoint)
    const fill = recipe.outlineMode !== 'outline-only'
    let cropped = cropAlpha(rasterizeFallbackContours(contours, bounds, fill, strokeRadius, insetRadius), bounds)
    // Point-sampled fills can miss a valid contour that is thinner than one
    // pixel (notably `_` at the smallest generated sizes). Preserve a faint
    // one-pixel trace instead of rejecting the entire font build.
    if (!cropped && fill) {
      cropped = cropAlpha(rasterizeFallbackContours(contours, bounds, false, 0.5), bounds)
    }
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
