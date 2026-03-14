import type { FabricElement } from '@/types/element'
import type { IconElementConfig } from '@/types/elements'
import { FabricText, type TextProps } from 'fabric'
import { nanoid } from 'nanoid'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { usePropertiesStore } from '@/stores/properties'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useIconFontStrategyStore } from '@/stores/iconFontStrategyStore'
import type { MinimalFabricLike } from '@/types/layer'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'

export async function createIcon(config: IconElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()
  const iconFontStrategyStore = useIconFontStrategyStore()

  const canvas = canvasStore.canvas
  if (!canvas) {
    throw new Error('Canvas is not initialized, cannot add icon element')
  }

  type IconProps = TextProps & IconElementConfig
  const metric = usePropertiesStore().getMetricByOptions(config)
  const strategy = iconFontStrategyStore
  const resolvedFontFamily =
    strategy.currentIconFontSlug ||
    (config as any).iconFont ||
    (config as any).fontFamily ||
    'iconfont'

  const fallbackSize = Number((config as any).iconSize ?? (config as any).fontSize ?? 24)
  const resolvedFontSize =
    strategy.currentIconFontSize === -1
      ? (Number.isFinite(fallbackSize) && fallbackSize > 0 ? fallbackSize : 24)
      : strategy.currentIconFontSize

  const iconOptions: Partial<IconProps> = {
    id: config.id || nanoid(),
    eleType: 'icon',
    left: config.left,
    top: config.top,
    originX: config.originX as 'center' | 'left' | 'right',
    originY: 'center',
    fill: config.fill,
    fontSize: resolvedFontSize,
    fontFamily: String(resolvedFontFamily || 'iconfont'),
    metricSymbol: config.metricSymbol,
    dataProperty: config.dataProperty,
    goalProperty: config.goalProperty,
    selectable: true,
    hasControls: false,
    hasBorders: true,
  }

  const element = new FabricText(String((metric as any)?.icon ?? ''), iconOptions as TextProps & IconElementConfig)

  canvas.add(element as FabricText)
  layerStore.addLayer(element as unknown as MinimalFabricLike)
  canvas.setActiveObject(element as FabricText)
  canvas.renderAll()

  const id = (element as any).id ?? config.id ?? nanoid()
  elementDataStore.upsertElement({
    id: String(id),
    eleType: 'icon',
    left: (element as any).left ?? config.left ?? 0,
    top: (element as any).top ?? config.top ?? 0,
    fill: (element as any).fill ?? config.fill ?? '#ffffff',
    originX: ((element as any).originX as any) ?? config.originX ?? 'center',
    originY: ((element as any).originY as any) ?? 'center',
    fontFamily: (element as any).fontFamily ?? resolvedFontFamily,
    fontSize: Number((element as any).fontSize ?? resolvedFontSize),
    iconFont: (element as any).fontFamily ?? resolvedFontFamily,
    iconSize: Number((element as any).fontSize ?? resolvedFontSize),
    dataProperty: (element as any).dataProperty ?? config.dataProperty ?? null,
    goalProperty: (element as any).goalProperty ?? config.goalProperty ?? null,
    metricSymbol: (element as any).metricSymbol ?? config.metricSymbol ?? '',
    topBase: encodeTopBaseForElement(element as unknown as FabricElement),
  } as any)

  return element as unknown as FabricElement
}

export function updateIcon(
  element: FabricElement,
  config: Partial<IconElementConfig>,
): void {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  const elementDataStore = useElementDataStore()
  if (!canvas) return

  const objects = canvas.getObjects() as FabricText[]
  const obj = objects.find(
    (o) => (o as unknown as FabricElement).id === (element as any).id,
  )
  if (!obj) return

  const currentLeft = obj.left
  const currentTop = obj.top

  const updateProps: Partial<TextProps & IconElementConfig> = {
    fontSize: config.fontSize,
    fill: config.fill,
    fontFamily: config.iconFont ?? config.fontFamily,
    originX: config.originX,
    originY: config.originY,
    left: config.left,
    top: config.top,
    metricSymbol: config.metricSymbol,
    dataProperty: config.dataProperty,
    goalProperty: config.goalProperty,
  }

  Object.entries(updateProps).forEach(([key, value]) => {
    if (value !== undefined) {
      obj.set(key as keyof TextProps, value as never)
    }
  })

  if (config.left === undefined) obj.set('left', currentLeft)
  if (config.top === undefined) obj.set('top', currentTop)

  obj.setCoords()
  canvas.renderAll()

  const objId = (obj as any).id
  if (objId != null) {
    const encoded = {
      id: obj.id,
      eleType: 'icon' as const,
      left: obj.left,
      top: obj.top,
      fill: obj.fill,
      originX: obj.originX,
      originY: obj.originY,
      fontFamily: obj.fontFamily as string,
      fontSize: Number(obj.fontSize),
      iconFont: obj.fontFamily as string,
      iconSize: Number(obj.fontSize),
      dataProperty: (obj as any).dataProperty,
      goalProperty: (obj as any).goalProperty,
      metricSymbol: (obj as any).metricSymbol,
      topBase: encodeTopBaseForElement(obj as unknown as FabricElement),
    } satisfies IconElementConfig

    elementDataStore.patchElement(String(objId), encoded as any)
  }
}
