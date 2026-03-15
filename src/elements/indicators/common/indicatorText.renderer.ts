import { FabricText, type TextProps } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { IndicatorElementConfig } from '@/types/elements'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useIconFontStrategyStore } from '@/stores/iconFontStrategyStore'
import type { MinimalFabricLike } from '@/types/layer'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'

// 目前 indicators 仅支持这四种文本类指示器
export type IndicatorTextType = 'bluetooth' | 'alarms' | 'disturb' | 'notification'

export async function createIndicatorText(
  eleType: IndicatorTextType,
  glyph: string,
  config: IndicatorElementConfig,
): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()
  const iconFontStrategyStore = useIconFontStrategyStore()

  const canvas = canvasStore.canvas
  if (!canvas) {
    throw new Error('Canvas is not initialized, cannot add indicator element')
  }

  type IndicatorTextProps = TextProps & IndicatorElementConfig

  const strategy = iconFontStrategyStore
  if (strategy.currentIconFontSize === -1) {
    strategy.setIconFontSize(config.fontSize)
  } else {
    config.fontSize = strategy.currentIconFontSize
  }
  if (!strategy.currentIconFontSlug) {
    strategy.setIconFontSlug(config.fontFamily)
  } else {
    config.fontFamily = strategy.currentIconFontSlug
  }

  const id = config.id || nanoid()

  const textOptions: Partial<IndicatorTextProps> = {
    id,
    eleType,
    left: config.left,
    top: config.top,
    originX: config.originX as any,
    originY: config.originY as any,
    fill: config.fill,
    fontSize: config.fontSize,
    fontFamily: config.fontFamily,
    metricSymbol: (config as any).metricSymbol,
    selectable: true,
    hasControls: false,
    hasBorders: true,
  }

  const element = new FabricText(glyph, textOptions as TextProps & IndicatorElementConfig)

  canvas.add(element as FabricText)
  layerStore.addLayer(element as unknown as MinimalFabricLike)
  canvas.setActiveObject(element as FabricText)
  canvas.renderAll()

  const encoded: IndicatorElementConfig = {
    id: (element as any).id ?? id,
    eleType,
    left: (element as any).left ?? config.left ?? 0,
    top: (element as any).top ?? config.top ?? 0,
    originX: ((element as any).originX as any) ?? config.originX ?? 'center',
    originY: ((element as any).originY as any) ?? config.originY ?? 'center',
    fontFamily: (element as any).fontFamily ?? config.fontFamily,
    fontSize: Number((element as any).fontSize ?? config.fontSize),
    fill: ((element as any).fill as string) ?? (config.fill as string),
    metricSymbol: (element as any).metricSymbol,
    topBase: encodeTopBaseForElement(element as unknown as FabricElement),
  } as IndicatorElementConfig

  elementDataStore.upsertElement(encoded as any)

  return element as unknown as FabricElement
}

export async function updateIndicatorText(
  eleType: IndicatorTextType,
  element: FabricElement,
  patch: Partial<IndicatorElementConfig> = {},
): Promise<void> {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  const elementDataStore = useElementDataStore()
  const iconFontStrategyStore = useIconFontStrategyStore()
  if (!canvas) return

  const objects = canvas.getObjects() as FabricText[]
  const obj = objects.find((o) => (o as unknown as FabricElement).id === (element as any).id)
  if (!obj) return

  const currentLeft = obj.left
  const currentTop = obj.top

  const updateProps: Partial<TextProps & IndicatorElementConfig> = {
    fill: patch.fill,
    fontFamily: patch.fontFamily,
    left: patch.left,
    top: patch.top,
    originX: patch.originX,
    originY: patch.originY,
    metricSymbol: (patch as any).metricSymbol,
  }

  Object.entries(updateProps).forEach(([key, value]) => {
    if (value !== undefined) {
      obj.set(key as keyof TextProps, value as never)
    }
  })

  if (patch.fontSize !== undefined) {
    void iconFontStrategyStore.requestUpdateIconFontSize(obj as any, patch.fontSize)
  }

  if (patch.left === undefined) obj.set('left', currentLeft)
  if (patch.top === undefined) obj.set('top', currentTop)

  obj.setCoords()
  canvas.renderAll()

  const objId = (obj as any).id
  if (objId != null) {
    const encoded: IndicatorElementConfig = {
      id: (obj as any).id as any,
      eleType,
      left: obj.left as number,
      top: obj.top as number,
      originX: obj.originX as any,
      originY: obj.originY as any,
      fontFamily: obj.fontFamily as string,
      fontSize: Number(obj.fontSize),
      fill: obj.fill as any,
      metricSymbol: (obj as any).metricSymbol,
      topBase: encodeTopBaseForElement(obj as unknown as FabricElement),
    } as IndicatorElementConfig

    elementDataStore.patchElement(String(objId), encoded as any)
  }
}
