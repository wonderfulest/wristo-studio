import { FabricText } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
// import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { getDataValueByName } from '@/utils/dataSimulator'
import {usePropertiesStore} from '@/stores/properties'
export function createText(config: TextElementConfig): FabricElement {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const propertiesStore = usePropertiesStore()

  const canvas = canvasStore.canvas

  if (!canvas) {
    throw new Error('Canvas is not initialized, cannot add text element')
  }

  const propertyKey = typeof config.textProperty === 'string' ? config.textProperty : ''
  const propertyValue = propertyKey
    ? propertiesStore?.allProperties?.[propertyKey]?.value
    : undefined
  const template =
    (typeof propertyValue === 'string' && propertyValue !== ''
      ? propertyValue
      : config.textTemplate ?? '') || 'New Text'

  const resolvedText = (template || '').replace(/\{\{([^}]+)\}\}/g, (_m, p1) => {
    const key = String(p1 || '').trim()
    return key ? getDataValueByName(key) : ''
  })

  const element = new FabricText(resolvedText || 'New Text', {
    id: config.id || nanoid(),
    eleType: 'text',
    left: config.left,
    top: config.top,
    fontSize: Number(config.fontSize) || 36,
    fill: config.fill || '#FFFFFF',
    fontFamily: config.fontFamily,
    selectable: true,
    hasControls: false,
    hasBorders: true,
    originX: config.originX || 'center',
    originY: config.originY || 'center',
    textProperty: config.textProperty,
    textTemplate: template,
  } as any)

  canvas.add(element as any)
  ;(element as any).elementId = (element as any).id
  layerStore.addLayer(element as any)
  canvas.renderAll()
  canvas.setActiveObject(element as any)

  return element as FabricElement
}

export function updateText(element: FabricElement, patch: Partial<TextElementConfig>): void {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  const anyEl = element as any

  if (!canvas || !anyEl) return

  if (patch.left != null) anyEl.set('left', patch.left)
  if (patch.top != null) anyEl.set('top', patch.top)
  if (patch.fontSize != null) anyEl.set('fontSize', patch.fontSize)
  if (patch.fill != null) anyEl.set('fill', patch.fill)
  if (patch.fontFamily != null) anyEl.set('fontFamily', patch.fontFamily)
  if (patch.originX != null) anyEl.set('originX', patch.originX)
  if (patch.textProperty != null) anyEl.textProperty = patch.textProperty
  if (patch.textTemplate != null) anyEl.textTemplate = patch.textTemplate

  anyEl.setCoords?.()
  canvas.renderAll()

  // 可选：后续可以在这里同步 elementDataStore/topBase
  // 目前保持与旧实现一致，仅直接更新 Fabric 对象
}
