import type { WeatherBitmapFontRecipe, WeatherRenderedGlyph, WeatherRenderedGlyphSet, WeatherSvgSource } from './weatherPackageBuilder'

export interface AlphaBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface WeatherGlyphGeometry {
  width: number
  height: number
  xoffset: number
  yoffset: number
  xadvance: number
}

export function findAlphaBounds(alpha: Uint8ClampedArray, width: number, height: number): AlphaBounds | undefined {
  if (alpha.length !== width * height) throw new Error('WEATHER_ALPHA_DIMENSIONS_INVALID')
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (alpha[y * width + x] === 0) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  if (maxX < minX || maxY < minY) return undefined
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

export function fitWeatherGlyphBounds(bounds: AlphaBounds | undefined, size: number, contentScale: number): WeatherGlyphGeometry {
  if (!bounds) {
    const center = Math.floor(size / 2)
    return { width: 0, height: 0, xoffset: center, yoffset: center, xadvance: size }
  }
  const maximum = Math.max(1, Math.floor(size * contentScale))
  const ratio = Math.min(maximum / bounds.width, maximum / bounds.height)
  const width = Math.max(1, Math.round(bounds.width * ratio))
  const height = Math.max(1, Math.round(bounds.height * ratio))
  return {
    width,
    height,
    xoffset: Math.floor((size - width) / 2),
    yoffset: Math.floor((size - height) / 2),
    xadvance: size
  }
}

interface RasterCanvas {
  width: number
  height: number
  getContext(type: '2d'): any
}

export interface WeatherSvgRasterEnvironment {
  createCanvas(width: number, height: number): RasterCanvas
  createBitmap(blob: Blob): Promise<{ width: number; height: number; close?(): void }>
  resizeAlpha(source: NonNullable<WeatherSvgSource['raster']>, bounds: AlphaBounds, width: number, height: number): Uint8ClampedArray
}

const preparedCanvasCache = new WeakMap<NonNullable<WeatherSvgSource['raster']>, OffscreenCanvas>()

const defaultEnvironment: WeatherSvgRasterEnvironment = {
  createCanvas: (width, height) => new OffscreenCanvas(width, height),
  createBitmap: (blob) => createImageBitmap(blob),
  resizeAlpha: (source, bounds, width, height) => {
    let sample = preparedCanvasCache.get(source)
    if (!sample) {
      sample = new OffscreenCanvas(source.width, source.height)
      const context = sample.getContext('2d')
      if (!context) throw new Error('BROWSER_UNSUPPORTED')
      const pixels = context.createImageData(source.width, source.height)
      for (let index = 0; index < source.alpha.length; index += 1) {
        pixels.data[index * 4] = 255
        pixels.data[index * 4 + 1] = 255
        pixels.data[index * 4 + 2] = 255
        pixels.data[index * 4 + 3] = source.alpha[index]
      }
      context.putImageData(pixels, 0, 0)
      preparedCanvasCache.set(source, sample)
    }
    const target = new OffscreenCanvas(width, height)
    const context = target.getContext('2d')
    if (!context) throw new Error('BROWSER_UNSUPPORTED')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(sample, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, width, height)
    return extractAlpha(context.getImageData(0, 0, width, height).data)
  }
}

export function prepareWeatherRasterSvg(svg: string): string {
  const documentRoot = svg
    .trim()
    .replace(/^<\?xml\s[^?]*\?>\s*/i, '')
    .replace(/^<!DOCTYPE\s+svg\b[^>]*>\s*/i, '')
  return documentRoot.replace(/<svg\b([^>]*)>/i, (_match, attributes: string) => {
    const cleaned = attributes
      .replace(/\swidth\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
      .replace(/\sheight\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
      .replace(/\spreserveAspectRatio\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    return `<svg${cleaned} width="1024" height="1024" preserveAspectRatio="xMidYMid meet">`
  })
}

function extractAlpha(data: Uint8ClampedArray): Uint8ClampedArray {
  const alpha = new Uint8ClampedArray(data.length / 4)
  for (let index = 0; index < alpha.length; index += 1) alpha[index] = data[index * 4 + 3]
  return alpha
}

async function rasterizeSource(source: WeatherSvgSource, size: number, recipe: WeatherBitmapFontRecipe, environment: WeatherSvgRasterEnvironment): Promise<WeatherRenderedGlyph> {
  const sampleSize = 1024
  if (source.raster) {
    if (source.raster.width <= 0 || source.raster.height <= 0 || source.raster.alpha.length !== source.raster.width * source.raster.height) {
      throw new Error('WEATHER_RASTER_DIMENSIONS_INVALID')
    }
    const bounds = findAlphaBounds(source.raster.alpha, source.raster.width, source.raster.height)
    const geometry = fitWeatherGlyphBounds(bounds, size, recipe.contentScale)
    const alpha = bounds && geometry.width > 0 && geometry.height > 0 ? environment.resizeAlpha(source.raster, bounds, geometry.width, geometry.height) : new Uint8ClampedArray(0)
    return {
      codepoint: Number.parseInt(source.iconUnicode, 16),
      ...geometry,
      alpha
    }
  }

  const bitmap = await environment.createBitmap(new Blob([prepareWeatherRasterSvg(source.svg)], { type: 'image/svg+xml' }))
  try {
    const sample = environment.createCanvas(sampleSize, sampleSize)
    const sampleContext = sample.getContext('2d')
    if (!sampleContext) throw new Error('BROWSER_UNSUPPORTED')
    sampleContext.clearRect(0, 0, sampleSize, sampleSize)
    sampleContext.drawImage(bitmap, 0, 0, sampleSize, sampleSize)
    const samplePixels = sampleContext.getImageData(0, 0, sampleSize, sampleSize)
    const sourceAlpha = extractAlpha(samplePixels.data)
    const bounds = findAlphaBounds(sourceAlpha, sampleSize, sampleSize)
    const geometry = fitWeatherGlyphBounds(bounds, size, recipe.contentScale)
    let alpha: Uint8ClampedArray = new Uint8ClampedArray(0)
    if (bounds && geometry.width > 0 && geometry.height > 0) {
      const target = environment.createCanvas(geometry.width, geometry.height)
      const targetContext = target.getContext('2d')
      if (!targetContext) throw new Error('BROWSER_UNSUPPORTED')
      targetContext.imageSmoothingEnabled = true
      targetContext.imageSmoothingQuality = 'high'
      targetContext.clearRect(0, 0, geometry.width, geometry.height)
      targetContext.drawImage(sample, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, geometry.width, geometry.height)
      alpha = extractAlpha(targetContext.getImageData(0, 0, geometry.width, geometry.height).data)
    }
    return {
      codepoint: Number.parseInt(source.iconUnicode, 16),
      ...geometry,
      alpha
    }
  } finally {
    bitmap.close?.()
  }
}

export async function rasterizeWeatherSvgSources(
  sources: WeatherSvgSource[],
  size: number,
  recipe: WeatherBitmapFontRecipe,
  environment: WeatherSvgRasterEnvironment = defaultEnvironment
): Promise<WeatherRenderedGlyphSet> {
  const glyphs: WeatherRenderedGlyph[] = []
  for (const source of sources) glyphs.push(await rasterizeSource(source, size, recipe, environment))
  return { glyphs, lineHeight: size, baseline: size }
}
