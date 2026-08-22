import { Group as FabricGroup, Image as FabricImage, Rect as FabricRect, Text as FabricText, filters, type FabricObject, type GroupProps, type ImageProps, type RectProps, type TextProps } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { WeatherElementConfig } from '@/types/elements/data'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { applyControlsToObject } from '@/utils/controlManager'
import type { MinimalFabricLike } from '@/types/layer'
import type { ElementRenderContext } from '@/engine/runtime/elementRenderContext'
import { assertElementRenderCurrent } from '@/engine/runtime/elementRenderContext'
import { resolveIconGlyphText } from '@/utils/iconGlyph'
import { getWeatherGlyphHorizontalOffset, normalizeWeatherIconCode } from './weatherCodes'
import { weatherSchema } from './weather.schema'

type WeatherGroupLike = FabricGroup & {
  id?: string
  eleType?: string
  iconUnicode?: string
  fontFamily?: string
  fill?: string
  fontSize?: number
  previewSource?: string
  triggerLayout?: (options?: { bubbles?: boolean }) => void
}

const createGlyphBounds = (fontSize: number): FabricRect => {
  const bounds = new FabricRect({
    originX: 'center', originY: 'center', left: 0, top: 0,
    width: fontSize, height: fontSize, fill: 'rgba(0,0,0,0)', strokeWidth: 0,
    selectable: false, evented: false,
  } as RectProps)
  ;(bounds as FabricRect & { role?: string }).role = 'glyphBounds'
  return bounds
}

const createGlyph = (iconUnicode: string, fontFamily: string, fontSize: number, fill: string): FabricText => {
  const glyph = new FabricText(resolveIconGlyphText(iconUnicode), {
    originX: 'center', originY: 'center',
    left: fontSize * getWeatherGlyphHorizontalOffset(iconUnicode), top: 0,
    fill, fontFamily, fontSize, objectCaching: false,
    selectable: false, hasControls: false, hasBorders: false,
  } as TextProps)
  ;(glyph as FabricText & { role?: string }).role = 'glyph'
  return glyph
}

const createGlyphPreview = async (
  iconUnicode: string,
  fontFamily: string,
  fontSize: number,
  fill: string,
  previewSource?: string,
): Promise<FabricObject> => {
  if (!previewSource) return createGlyph(iconUnicode, fontFamily, fontSize, fill) as unknown as FabricObject
  try {
    const image = await FabricImage.fromURL(previewSource, { crossOrigin: 'anonymous' })
    const width = Math.max(1, Number(image.width || 1))
    const height = Math.max(1, Number(image.height || 1))
    const scale = fontSize / Math.max(width, height)
    image.filters = [new filters.BlendColor({ color: fill, mode: 'tint', alpha: 1 })]
    image.applyFilters()
    image.set({
      originX: 'center', originY: 'center', left: 0, top: 0,
      scaleX: scale, scaleY: scale, objectCaching: false,
      selectable: false, evented: false,
    } as unknown as ImageProps)
    ;(image as FabricImage & { role?: string; weatherPreviewSource?: string }).role = 'glyph'
    ;(image as FabricImage & { weatherPreviewSource?: string }).weatherPreviewSource = previewSource
    return image as unknown as FabricObject
  } catch {
    return createGlyph(iconUnicode, fontFamily, fontSize, fill) as unknown as FabricObject
  }
}

export async function createWeather(
  config: WeatherElementConfig,
  renderContext?: ElementRenderContext,
): Promise<FabricElement> {
  assertElementRenderCurrent(renderContext)
  const canvas = useCanvasStore().canvas
  if (!canvas) throw new Error('Canvas is not initialized, cannot add weather element')

  const canvasWidth = (canvas as any).width ?? (canvas as any).getWidth?.() ?? 0
  const canvasHeight = (canvas as any).height ?? (canvas as any).getHeight?.() ?? 0
  const fontFamily = config.fontFamily || weatherSchema.defaultConfig.fontFamily
  const fontSize = config.fontSize ?? weatherSchema.defaultConfig.fontSize
  const fill = config.fill || weatherSchema.defaultConfig.fill
  const iconUnicode = normalizeWeatherIconCode(config.iconUnicode)
  const group = new FabricGroup([
    createGlyphBounds(fontSize) as unknown as FabricObject,
    await createGlyphPreview(iconUnicode, fontFamily, fontSize, fill, config.previewSource),
  ], {
    left: config.left ?? (canvasWidth ? canvasWidth / 2 : 0),
    top: config.top ?? (canvasHeight ? canvasHeight / 2 : 0),
    originX: 'center', originY: 'center', selectable: true,
    hasControls: false, hasBorders: true, lockRotation: true,
    objectCaching: false, visible: true,
  } as GroupProps) as WeatherGroupLike

  group.id = config.id || nanoid()
  group.eleType = 'weather'
  group.iconUnicode = iconUnicode
  group.fontFamily = fontFamily
  group.fontSize = fontSize
  group.fill = fill
  group.previewSource = config.previewSource

  assertElementRenderCurrent(renderContext)
  applyControlsToObject(group as unknown as FabricObject)
  canvas.add(group as unknown as FabricObject)
  useLayerStore().addLayer(group as unknown as MinimalFabricLike)
  canvas.setActiveObject(group as unknown as FabricObject)
  canvas.renderAll()
  return group as unknown as FabricElement
}

export async function updateWeather(element: FabricElement, config: Partial<WeatherElementConfig>): Promise<void> {
  const canvas = useCanvasStore().canvas
  if (!canvas) return
  const group = (canvas.getObjects() as Array<FabricObject & FabricElement>)
    .find(object => object.id === element.id) as WeatherGroupLike | undefined
  if (!group) return

  const position = config.left === undefined && config.top === undefined
    ? { left: group.left, top: group.top }
    : null
  if (config.left !== undefined) group.set('left', config.left as never)
  if (config.top !== undefined) group.set('top', config.top as never)

  const iconUnicode = normalizeWeatherIconCode(config.iconUnicode ?? group.iconUnicode)
  const fontFamily = config.fontFamily ?? group.fontFamily ?? weatherSchema.defaultConfig.fontFamily
  const fontSize = Number(config.fontSize ?? group.fontSize ?? weatherSchema.defaultConfig.fontSize)
  const fill = String(config.fill ?? group.fill ?? weatherSchema.defaultConfig.fill)
  const previewSource = config.previewSource ?? group.previewSource
  group.iconUnicode = iconUnicode
  group.fontFamily = fontFamily
  group.fontSize = fontSize
  group.fill = fill
  group.previewSource = previewSource

  const children = group.getObjects() as FabricObject[]
  const glyph = children.find(child => (child as any).role === 'glyph')
  let bounds = children.find(child => (child as any).role === 'glyphBounds') as FabricRect | undefined
  if (!bounds) {
    bounds = createGlyphBounds(fontSize)
    group.add(bounds as unknown as FabricObject)
  }

  if (!previewSource && glyph instanceof FabricText) {
    glyph.set({
      text: resolveIconGlyphText(iconUnicode), fontFamily, fontSize, fill,
      left: fontSize * getWeatherGlyphHorizontalOffset(iconUnicode), top: 0,
    } as unknown as TextProps)
    glyph.initDimensions?.()
  } else {
    const nextGlyph = await createGlyphPreview(iconUnicode, fontFamily, fontSize, fill, previewSource)
    const glyphLeft = Number(nextGlyph.left ?? 0)
    if (glyph) group.remove(glyph)
    group.add(nextGlyph)
    nextGlyph.set({ left: glyphLeft, top: 0 })
  }
  bounds.set({ width: fontSize, height: fontSize, left: 0, top: 0 } as unknown as RectProps)
  group.set({
    width: fontSize,
    height: fontSize,
    hasControls: false,
    hasBorders: true,
    lockRotation: true,
  } as unknown as GroupProps)
  if (position) group.set(position as unknown as GroupProps)
  group.setCoords?.()
  canvas.requestRenderAll?.()
}
