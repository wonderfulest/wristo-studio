import { Line, Circle } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { LineElementConfig } from '@/types/elements'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'

export async function createLine(config: LineElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()

  const canvas = canvasStore.canvas
  if (!canvas) {
    throw new Error('画布未初始化，无法添加直线元素')
  }

  const stroke = config.stroke
  const strokeWidth = Number(config.strokeWidth)

  let x1 = Math.round(config.x1)
  let y1 = Math.round(config.y1)
  let x2 = Math.round(config.x2)
  let y2 = Math.round(config.y2)

  const lineOptions: any = {
    id: nanoid(),
    eleType: 'line',
    stroke,
    strokeWidth,
    strokeLineCap: (config as any).strokeLineCap || 'butt',
    strokeLineJoin: (config as any).strokeLineJoin || 'bevel',
    strokeUniform: true,
    opacity: config.opacity,
    visible: true,
    selectable: false,
    hasControls: false,
    hasBorders: true,
  }

  const line = new Line([x1, y1, x2, y2], lineOptions as any)

  const startHandle = new Circle({
    left: x1,
    top: y1,
    radius: 6,
    fill: 'transparent',
    stroke,
    strokeWidth,
    originX: 'center',
    originY: 'center',
    opacity: 0,
    selectable: true,
    hasBorders: false,
    hasControls: false,
    hoverCursor: 'pointer',
  }) as any

  const endHandle = new Circle({
    left: x2,
    top: y2,
    radius: 6,
    fill: 'transparent',
    stroke,
    strokeWidth,
    originX: 'center',
    originY: 'center',
    opacity: 0,
    selectable: true,
    hasBorders: false,
    hasControls: false,
    hoverCursor: 'pointer',
  }) as any

  ;(line as any)._startHandle = startHandle
  ;(line as any)._endHandle = endHandle

  const updateLineFromHandles = () => {
    x1 = startHandle.left ?? x1
    y1 = startHandle.top ?? y1
    x2 = endHandle.left ?? x2
    y2 = endHandle.top ?? y2

    line.set({
      x1,
      y1,
      x2,
      y2,
    })
    canvas.requestRenderAll()
  }

  startHandle.on('mouseover', () => {
    startHandle.set('opacity', 1)
    canvas.requestRenderAll()
  })

  startHandle.on('mouseout', () => {
    const actives = canvas.getActiveObjects ? canvas.getActiveObjects() : []
    const isActive = Array.isArray(actives) && actives.includes(line as any)
    if (!isActive) {
      startHandle.set('opacity', 0)
      canvas.requestRenderAll()
    }
  })

  endHandle.on('mouseover', () => {
    endHandle.set('opacity', 1)
    canvas.requestRenderAll()
  })

  endHandle.on('mouseout', () => {
    const actives = canvas.getActiveObjects ? canvas.getActiveObjects() : []
    const isActive = Array.isArray(actives) && actives.includes(line as any)
    if (!isActive) {
      endHandle.set('opacity', 0)
      canvas.requestRenderAll()
    }
  })

  startHandle.on('moving', () => {
    startHandle.set('opacity', 1)
    startHandle.set({
      left: Math.max(0, Math.min(startHandle.left ?? 0, canvas.getWidth() ?? 0)),
      top: Math.max(0, Math.min(startHandle.top ?? 0, canvas.getHeight() ?? 0)),
    })
    updateLineFromHandles()
  })

  endHandle.on('moving', () => {
    endHandle.set('opacity', 1)
    endHandle.set({
      left: Math.max(0, Math.min(endHandle.left ?? 0, canvas.getWidth() ?? 0)),
      top: Math.max(0, Math.min(endHandle.top ?? 0, canvas.getHeight() ?? 0)),
    })
    updateLineFromHandles()
  })

  startHandle.on('mouseup', () => {
    canvas.requestRenderAll()
  })

  endHandle.on('mouseup', () => {
    canvas.requestRenderAll()
  })

  let lastLeft = (line as any).left ?? 0
  let lastTop = (line as any).top ?? 0
  line.on('moving', () => {
    const currentLeft = (line as any).left ?? 0
    const currentTop = (line as any).top ?? 0
    const dx = currentLeft - lastLeft
    const dy = currentTop - lastTop

    if (dx !== 0 || dy !== 0) {
      startHandle.set({
        left: (startHandle.left ?? 0) + dx,
        top: (startHandle.top ?? 0) + dy,
      })
      startHandle.setCoords()

      endHandle.set({
        left: (endHandle.left ?? 0) + dx,
        top: (endHandle.top ?? 0) + dy,
      })
      endHandle.setCoords()
    }

    lastLeft = currentLeft
    lastTop = currentTop

    canvas.requestRenderAll()
  })

  canvas.add(line as any, startHandle, endHandle)
  layerStore.addLayer(line as any)
  canvas.requestRenderAll()
  canvas.setActiveObject(line as any)

  return line as any
}

export function updateLine(element: FabricElement, patch: Partial<LineElementConfig> = {}): void {
  const line = element as any
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas

  if (!canvas || !line) return

  if (patch.stroke !== undefined) line.set('stroke', patch.stroke)
  if (patch.strokeWidth !== undefined) line.set('strokeWidth', Number(patch.strokeWidth))
  if (patch.opacity !== undefined) line.set('opacity', Number(patch.opacity))

  if (patch.x1 !== undefined) line.set('x1', Math.round(Number(patch.x1)))
  if (patch.y1 !== undefined) line.set('y1', Math.round(Number(patch.y1)))
  if (patch.x2 !== undefined) line.set('x2', Math.round(Number(patch.x2)))
  if (patch.y2 !== undefined) line.set('y2', Math.round(Number(patch.y2)))

  if ((patch as any).strokeLineCap !== undefined)
    line.set('strokeLineCap', (patch as any).strokeLineCap)
  if ((patch as any).strokeLineJoin !== undefined)
    line.set('strokeLineJoin', (patch as any).strokeLineJoin)

  const startHandle = (line as any)._startHandle
  const endHandle = (line as any)._endHandle

  if (startHandle) {
    startHandle.set({ left: line.x1, top: line.y1 })
    startHandle.setCoords()
  }

  if (endHandle) {
    endHandle.set({ left: line.x2, top: line.y2 })
    endHandle.setCoords()
  }

  line.setCoords()
  canvas.requestRenderAll?.()
}
