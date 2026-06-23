import { nanoid } from 'nanoid'
import FabricRadialText from '@/lib/radialText'
import type { FabricElement } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { usePropertiesStore } from '@/stores/properties'

export function createRadialText(config: TextElementConfig): FabricElement {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const propertiesStore = usePropertiesStore()
  const canvas = canvasStore.canvas

  if (!canvas) {
    throw new Error('Canvas is not initialized, cannot add radial text element')
  }

  const cx = config.left ?? 0
  const cy = config.top ?? 0
  const radius = typeof (config as any).radius === 'number' ? (config as any).radius : 100
  const angle = typeof (config as any).angle === 'number' ? (config as any).angle : 0
  const directionFlag = (config as any).direction === 'counterClockwise' ? -1 : 1

  const propertyKey = typeof (config as any).textProperty === 'string' ? (config as any).textProperty : ''
  const propertyValue = propertyKey
    ? propertiesStore?.allProperties?.[propertyKey]?.value
    : undefined
  const textTemplate =
    (typeof propertyValue === 'string' && propertyValue !== ''
      ? propertyValue
      : (config as any).textTemplate) || 'Radial Text'

  const radial = new FabricRadialText({
    text: textTemplate,
    cx,
    cy,
    radius,
    fontSize: Number(config.fontSize),
    fontFamily: config.fontFamily,
    startAngle: angle,
    direction: directionFlag,
    inner: false,
    charSpacing: 0,
    fill: config.fill,
  })

  const element = radial.render() as any

  element.id = config.id || nanoid()
  element.eleType = 'radialText'

  element.radius = radius
  element.startAngle = angle
  element.direction = (config as any).direction || 'clockwise'
  element.justification = (config as any).justification || 'center'

  element.fill = config.fill
  element.fontFamily = config.fontFamily
  element.fontSize = config.fontSize
  element.textTemplate = textTemplate
  element.text = textTemplate
  if ((config as any).textProperty) {
    element.textProperty = (config as any).textProperty
  }

  canvas.add(element as any)
  ;(element as any).elementId = (element as any).id
  layerStore.addLayer(element as any)
  canvas.renderAll()
  canvas.setActiveObject(element as any)

  return element as FabricElement
}

export function updateRadialText(
  element: FabricElement,
  patch: Partial<TextElementConfig> & {
    angle?: number
    radius?: number
    direction?: string
    justification?: string
  },
): void {
  const anyEl = element as any

  if (patch.left != null) anyEl.set('left', patch.left)
  if (patch.top != null) anyEl.set('top', patch.top)
  if (patch.fontSize != null) anyEl.set('fontSize', patch.fontSize)
  if (patch.fill != null) anyEl.set('fill', patch.fill)
  if (patch.fontFamily != null) anyEl.set('fontFamily', patch.fontFamily)
  if ((patch as any).angle != null) anyEl.startAngle = (patch as any).angle
  if ((patch as any).radius != null) anyEl.radius = (patch as any).radius
  if ((patch as any).direction != null) anyEl.direction = (patch as any).direction
  if ((patch as any).justification != null) anyEl.justification = (patch as any).justification
  if ((patch as any).textProperty != null) anyEl.textProperty = (patch as any).textProperty
  if ((patch as any).textTemplate != null) {
    const textTemplate = String((patch as any).textTemplate)
    if (typeof anyEl.updateRadialText === 'function') {
      const previousLeft = anyEl.left
      const previousTop = anyEl.top
      anyEl.updateRadialText(textTemplate)
      if ((patch as any).left == null && typeof previousLeft === 'number') anyEl.set('left', previousLeft)
      if ((patch as any).top == null && typeof previousTop === 'number') anyEl.set('top', previousTop)
    } else {
      anyEl.textTemplate = textTemplate
      anyEl.text = textTemplate
    }
  }

  if (typeof anyEl.updateRadialLayout === 'function') {
    anyEl.updateRadialLayout()
  } else {
    anyEl.setCoords?.()
  }

  anyEl.canvas?.renderAll()
}
