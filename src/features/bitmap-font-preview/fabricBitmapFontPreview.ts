import { loadBmFontDescriptor } from './bmFontDescriptorLoader'
import { kerningKey, type BmFontDescriptor } from './bmFontTextParser'

export interface FabricBitmapFontPreviewAssets {
  descriptorUrl: string
  atlasUrl: string
  sourceSize: number
  color?: string
  fallback?: Omit<FabricBitmapFontPreviewAssets, 'fallback'>
}

export interface FabricBitmapFontPreviewDependencies {
  loadDescriptor?: (url: string) => Promise<BmFontDescriptor>
  loadAtlas?: (url: string) => Promise<CanvasImageSource>
}

export interface FabricBitmapFontPreviewOptions {
  fallbackToText?: boolean
}

interface PreviewState {
  originalRender: (context: CanvasRenderingContext2D) => void
  generation: number
  assetsKey?: string
  descriptor?: BmFontDescriptor
  atlas?: CanvasImageSource
  sourceSize?: number
  color?: string
  fallbackToText: boolean
}

const previewState = Symbol('fabricBitmapFontPreview')
const atlasCache = new Map<string, Promise<CanvasImageSource>>()

const loadAtlasImage = (url: string): Promise<CanvasImageSource> => {
  const cached = atlasCache.get(url)
  if (cached) return cached
  const pending = fetch(url, { credentials: 'omit' }).then(async response => {
    if (!response.ok) throw new Error(`BMFont atlas request failed: ${response.status}`)
    const objectUrl = URL.createObjectURL(await response.blob())
    try {
      const image = new Image()
      image.src = objectUrl
      await image.decode()
      return image
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  })
  atlasCache.set(url, pending)
  pending.catch(() => atlasCache.delete(url))
  return pending
}

const lineWidth = (descriptor: BmFontDescriptor, text: string): number => {
  let cursor = 0
  let previous: number | null = null
  for (const character of text) {
    const codepoint = character.codePointAt(0)!
    const glyph = descriptor.glyphs.get(codepoint)
    if (!glyph) return -1
    if (previous != null) cursor += descriptor.kernings.get(kerningKey(previous, codepoint)) || 0
    cursor += glyph.xadvance
    previous = codepoint
  }
  return cursor
}

const renderDensity = (object: any, sourceSize: number): number => {
  const total = object?.getTotalObjectScaling?.()
  const totalDensity = Math.max(
    1,
    Math.abs(Number(total?.x) || 1),
    Math.abs(Number(total?.y) || 1),
  )
  const fontSize = Math.max(1, Number(object?.fontSize) || sourceSize)
  return Math.max(1, Math.min(totalDensity, sourceSize / fontSize))
}

const renderBitmapText = (object: any, state: PreviewState, context: CanvasRenderingContext2D): boolean => {
  const descriptor = state.descriptor
  const atlas = state.atlas
  const sourceSize = state.sourceSize
  if (!descriptor || !atlas || !sourceSize) return false
  const lines = String(object.text ?? '').split('\n')
  const widths = lines.map(line => lineWidth(descriptor, line))
  if (widths.some(width => width < 0)) return false
  const scale = Math.max(1, Number(object.fontSize) || sourceSize) / sourceSize
  const lineHeight = descriptor.lineHeight * scale
  const totalHeight = Math.max(lineHeight, lines.length * lineHeight)
  const maxWidth = Math.max(1, ...widths) * scale
  const renderWidth = Math.max(1, Math.ceil(maxWidth))
  const renderHeight = Math.max(1, Math.ceil(totalHeight))
  const density = renderDensity(object, sourceSize)
  const renderCanvas = document.createElement('canvas')
  renderCanvas.width = Math.max(1, Math.ceil(renderWidth * density))
  renderCanvas.height = Math.max(1, Math.ceil(renderHeight * density))
  const densityX = renderCanvas.width / renderWidth
  const densityY = renderCanvas.height / renderHeight
  const renderContext = renderCanvas.getContext('2d')
  if (!renderContext) return false

  lines.forEach((line, lineIndex) => {
    let cursor = (renderWidth - widths[lineIndex] * scale) / 2
    let previous: number | null = null
    for (const character of line) {
      const codepoint = character.codePointAt(0)!
      const glyph = descriptor.glyphs.get(codepoint)!
      if (previous != null) cursor += (descriptor.kernings.get(kerningKey(previous, codepoint)) || 0) * scale
      renderContext.drawImage(
        atlas,
        glyph.x, glyph.y, glyph.width, glyph.height,
        (cursor + glyph.xoffset * scale) * densityX,
        ((renderHeight - totalHeight) / 2 + lineIndex * lineHeight + glyph.yoffset * scale) * densityY,
        glyph.width * scale * densityX,
        glyph.height * scale * densityY,
      )
      cursor += glyph.xadvance * scale
      previous = codepoint
    }
  })
  renderContext.globalCompositeOperation = 'source-in'
  renderContext.fillStyle = state.color || (typeof object.fill === 'string' ? object.fill : '#FFFFFF')
  renderContext.fillRect(0, 0, renderCanvas.width, renderCanvas.height)
  context.drawImage(renderCanvas, -renderWidth / 2, -renderHeight / 2, renderWidth, renderHeight)
  return true
}

export async function applyFabricBitmapFontPreview(
  object: any,
  assets?: FabricBitmapFontPreviewAssets,
  dependencies: FabricBitmapFontPreviewDependencies = {},
  options: FabricBitmapFontPreviewOptions = {},
): Promise<void> {
  if (!object || typeof object._renderText !== 'function') return
  let state = object[previewState] as PreviewState | undefined
  if (!state) {
    state = {
      originalRender: object._renderText.bind(object),
      generation: 0,
      fallbackToText: options.fallbackToText !== false,
    }
    Object.defineProperty(object, previewState, { configurable: true, value: state })
    object._renderText = (context: CanvasRenderingContext2D) => {
      if (!renderBitmapText(object, state!, context) && state!.fallbackToText) state!.originalRender(context)
    }
  }
  state.fallbackToText = options.fallbackToText !== false
  if (!assets) {
    state.generation += 1
    state.assetsKey = undefined
    state.descriptor = undefined
    state.atlas = undefined
    state.sourceSize = undefined
    if (state.fallbackToText) {
      object._renderText = state.originalRender
      delete object[previewState]
    }
    object.dirty = true
    object.canvas?.requestRenderAll?.()
    return
  }
  const assetsKey = [
    assets.descriptorUrl,
    assets.atlasUrl,
    assets.sourceSize,
    assets.fallback?.descriptorUrl,
    assets.fallback?.atlasUrl,
    assets.fallback?.sourceSize,
  ].join('\0')
  state.color = assets.color
  if (state.assetsKey === assetsKey && state.descriptor && state.atlas) return
  const generation = ++state.generation
  state.assetsKey = undefined
  state.descriptor = undefined
  state.atlas = undefined
  state.sourceSize = undefined
  object.dirty = true
  object.canvas?.requestRenderAll?.()
  const loadDescriptor = dependencies.loadDescriptor ?? loadBmFontDescriptor
  const loadAtlas = dependencies.loadAtlas ?? loadAtlasImage
  const loadAssets = async (candidate: Omit<FabricBitmapFontPreviewAssets, 'fallback'>) => {
    const [descriptor, atlas] = await Promise.all([
      loadDescriptor(candidate.descriptorUrl),
      loadAtlas(candidate.atlasUrl),
    ])
    return { descriptor, atlas, sourceSize: candidate.sourceSize }
  }
  let loaded: Awaited<ReturnType<typeof loadAssets>>
  try {
    loaded = await loadAssets(assets)
  } catch (error) {
    if (!assets.fallback) throw error
    loaded = await loadAssets(assets.fallback)
  }
  if (generation !== state.generation) return
  state.assetsKey = assetsKey
  state.descriptor = loaded.descriptor
  state.atlas = loaded.atlas
  state.sourceSize = loaded.sourceSize
  object.dirty = true
  object.canvas?.requestRenderAll?.()
}
