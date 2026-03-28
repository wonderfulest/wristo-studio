import { Group, Line, Circle, Rect } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { LineChartElementConfig } from '@/types/elements/charts'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'

const DEFAULTS = {
  // provide explicit width/height so renderer can fall back safely
  width: 150,
  height: 50,
  color: '#ffffff',
  lineWidth: 2,
  showPoints: false,
  pointColor: '#ffffff',
  pointRadius: 2,
}

function generateSampleData(count: number) {
  const data: Array<number | null> = []
  for (let i = 0; i < count; i++) {
    data.push(Math.random() > 0.1 ? Math.random() * 100 : null)
  }
  return data
}

function resolveSeries(group: any): Array<number | null> {
  const injected = (group as any).__simData
  if (Array.isArray(injected) && injected.length) {
    return injected.map((v: any) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    })
  }
  return generateSampleData(8)
}

function createBaseRect(group: any) {
  const { width, height } = group
  const rect: any = new Rect({
    left: -width / 2,
    top: -height / 2,
    width,
    height,
    fill: 'transparent',
    selectable: true,
    hasControls: false,
    evented: false,

  })
  group.add(rect)
}

function createPolyline(group: any) {
  const { width, height, color, lineWidth, showPoints, pointColor, pointRadius } = group
  const data = resolveSeries(group)
  const valid = data.filter((v: number | null) => v !== null) as number[]
  if (!valid.length) {
    return
  }
  const minY = Math.min(...valid) - 5
  const maxY = Math.max(...valid) + 5
  const rangeY = maxY - minY || 1

  const count = Math.max(2, data.length)
  const stepX = width / (count - 1)
  let prev: { x: number; y: number } | null = null

  for (let i = 0; i < count; i++) {
    const v = data[i]
    if (v === null) continue
    const x = -width / 2 + i * stepX
    const y = -height / 2 + (height - ((v - minY) * (height - 2)) / rangeY)

    if (prev) {
      const seg: any = new Line([prev.x, prev.y, x, y], {
        stroke: color,
        strokeWidth: lineWidth,
        selectable: true,
      })
      group.add(seg)
    }
    if (showPoints) {
      const dot: any = new Circle({
        left: x - pointRadius,
        top: y - pointRadius,
        radius: pointRadius,
        fill: pointColor,
        selectable: true,
      })
      group.add(dot)
    }
    prev = { x, y }
  }
}

export async function createLineChart(config: LineChartElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const canvas = canvasStore.canvas
  if (!canvas) {
    throw new Error('Canvas is not initialized, cannot add lineChart element')
  }

  const id = String((config as any)?.id ?? '') || nanoid()
  const width = config.width || DEFAULTS.width
  const height = config.height || DEFAULTS.height
  const left = config.left ?? canvas.getWidth?.() ?? 227
  const top = config.top ?? canvas.getHeight?.() ?? 227

  const group: any = new Group([], {
    id,
    eleType: 'lineChart',
    left,
    top,
    originX: config.originX ?? 'center',
    originY: config.originY ?? 'center',
    width,
    height,
    chartProperty: config.chartProperty,
    color: config.color ?? DEFAULTS.color,
    lineWidth: config.lineWidth ?? DEFAULTS.lineWidth,
    showPoints: config.showPoints ?? DEFAULTS.showPoints,
    pointColor: config.pointColor ?? DEFAULTS.pointColor,
    pointRadius: config.pointRadius ?? DEFAULTS.pointRadius,
    selectable: true,
    hasControls: false,
    hasBorders: true,
  } as any)

  createBaseRect(group)
  createPolyline(group)

  group.set({ left, top, originX: 'center', originY: 'center' })
  group.setCoords()
  canvas.add(group)
  layerStore.addLayer(group)
  canvas.discardActiveObject()
  canvas.setActiveObject(group)
  canvas.renderAll()
  return group as FabricElement
}

export function updateLineChart(
  element: FabricElement,
  patch: Partial<LineChartElementConfig> = {},
): void {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return

  const group: any = canvas.getObjects().find((obj: any) => (obj as any).id === (element as any).id)
  if (!group || !group.getObjects) return

  const current = { left: group.left, top: group.top, width: group.width, height: group.height }
  Object.keys(patch).forEach((key) => {
    const k = key as keyof LineChartElementConfig
    const v = patch[k]
    if (v !== undefined) group.set(k as any, v as any)
  })

  if ((patch as any).__simData !== undefined) {
    ;(group as any).__simData = (patch as any).__simData
  }

  group.remove(...group.getObjects())

  createBaseRect(group)
  createPolyline(group)

  group.set(current)
  group.setCoords()
  canvas.renderAll()
}
