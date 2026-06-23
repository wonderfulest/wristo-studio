import { FabricText } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { usePropertiesStore } from '@/stores/properties'
import { resolveDataTextTemplate } from '@/utils/dataSimulator'

export function createAngledText(config: TextElementConfig): FabricElement {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const propertiesStore = usePropertiesStore()
  const canvas = canvasStore.canvas

  if (!canvas) {
    throw new Error('Canvas is not initialized, cannot add angled text element')
  }

  const propertyKey = typeof (config as any).textProperty === 'string' ? (config as any).textProperty : ''
  const propertyValue = propertyKey
    ? propertiesStore?.allProperties?.[propertyKey]?.value
    : undefined
  const textTemplate =
    (typeof propertyValue === 'string' && propertyValue !== ''
      ? propertyValue
      : ((config as any).textTemplate as string)) || 'Angled Text'

  const element = new FabricText(resolveDataTextTemplate(textTemplate) || 'Angled Text', {
    id: config.id || nanoid(),
    eleType: 'angledText',
    left: config.left,
    top: config.top,
    fontSize: Number(config.fontSize) || 36,
    fill: config.fill || '#FFFFFF',
    fontFamily: config.fontFamily,
    selectable: true,
    hasControls: true,
    hasBorders: true,
    originX: config.originX || 'center',
    originY: config.originY || 'center',
    angle: typeof (config as any).angle === 'number' ? (config as any).angle : -45,
    textTemplate,
    textProperty: (config as any).textProperty,
  } as any)

  canvas.add(element as any)
  ;(element as any).elementId = (element as any).id
  layerStore.addLayer(element as any)
  canvas.renderAll()
  canvas.setActiveObject(element as any)

  return element as FabricElement
}

export function updateAngledText(
  element: FabricElement,
  patch: Partial<TextElementConfig> & { angle?: number; textTemplate?: string },
): void {
  const anyEl = element as any

  if (patch.left != null) anyEl.set('left', patch.left)
  if (patch.top != null) anyEl.set('top', patch.top)
  if (patch.fontSize != null) anyEl.set('fontSize', patch.fontSize)
  if (patch.fill != null) anyEl.set('fill', patch.fill)
  if (patch.fontFamily != null) anyEl.set('fontFamily', patch.fontFamily)
  if (patch.originX != null) anyEl.set('originX', patch.originX)
  if ((patch as any).textProperty != null) anyEl.textProperty = (patch as any).textProperty
  if (patch.textTemplate != null) {
    anyEl.textTemplate = patch.textTemplate
    anyEl.set('text', resolveDataTextTemplate(patch.textTemplate))
  }
  if ((patch as any).angle != null) anyEl.set('angle', (patch as any).angle)

  anyEl.setCoords?.()
  anyEl.canvas?.renderAll()
}
