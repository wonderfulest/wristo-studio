import { Group, Rect } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { BarChartElementConfig } from '@/types/elements/charts'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { applyControlsToObject } from '@/utils/controlManager'
import { normalizeChartSize } from '@/elements/charts/chartSize'
import { barChartSchema } from './barChart.schema'
import { encodeBarChart } from './barChart.encoder'

function attachScaleHandler(group: any): void {
  if (group.__chartScaleHandlerBound) return
  group.__chartScaleHandlerBound = true
  let committing = false

  group.on('modified', () => {
    if (committing) return
    const scaleX = Number(group.scaleX ?? 1)
    const scaleY = Number(group.scaleY ?? 1)
    const hasScale = Math.abs(scaleX - 1) >= 0.001 || Math.abs(scaleY - 1) >= 0.001

    committing = true
    try {
      if (hasScale) {
        const size = normalizeChartSize(
          'barChart',
          Number(group.width ?? 0),
          Number(group.height ?? 0),
          scaleX,
          scaleY,
        )
        group.set({ scaleX: 1, scaleY: 1 })
        updateBarChart(group as FabricElement, size)
      }

      useElementDataStore().patchElement(String(group.id), encodeBarChart(group as FabricElement))
    } finally {
      committing = false
    }
  })
}

function resolveColors(colors: BarChartElementConfig['colors'] | undefined): [string, string, string, string, string] {
  const fallback: [string, string, string, string, string] = barChartSchema.defaultConfig.colors
  if (!colors) return fallback
  const list = Array.isArray(colors) ? colors : fallback
  const c0 = String(list[0] ?? fallback[0])
  const c1 = String(list[1] ?? fallback[1])
  const c2 = String(list[2] ?? fallback[2])
  const c3 = String(list[3] ?? fallback[3])
  const c4 = String(list[4] ?? fallback[4])
  return [c0, c1, c2, c3, c4]
}

function pickColorByThreshold(value: number, goal: number, colors: [string, string, string, string, string]): string {
  const safeGoal = Math.max(1, Number(goal) || 1)
  const t0 = 0
  const t1 = safeGoal * 0.5
  const t2 = safeGoal * 0.8
  const t3 = safeGoal
  const t4 = safeGoal * 1.2
  if (value <= t0) return colors[0]
  if (value <= t1) return colors[1]
  if (value <= t2) return colors[2]
  if (value <= t3) return colors[3]
  if (value <= t4) return colors[4]
  return colors[4]
}

function createBaseRect(group: any) {
  const width = Number(group.width) || 0
  const height = Number(group.height) || 0
  const rect: any = new Rect({
    width,
    height,
    fill: 'transparent',
    left: -width / 2,
    top: -height / 2,
    // 作为命中区域，允许选中，但不单独有控制点
    selectable: true,
    hasControls: false,
    evented: false,
  })
  group.add(rect)
}

function createBars(group: any, width: number, height: number, data: number[], goal: number, barWidth: number, colors: [string, string, string, string, string]) {
  const pointCount = data.length
  if (pointCount <= 0) return
  const stepX = width / pointCount

  const maxValue = Math.max(goal * 1.2, ...data.map((v) => Number(v) || 0), 1)

  for (let i = 0; i < pointCount; i++) {
    const raw = Number(data[i] ?? 0)
    const value = Number.isFinite(raw) ? raw : 0
    const xPos = -width / 2 + i * stepX + stepX / 2
    const scaled = Math.max(0, Math.min(1, value / maxValue))
    const barH = scaled * height
    // 柱子完全落在基准矩形内部：从底部 (-height/2 + height) 向上生长
    const barTop = -height / 2 + (height - barH)

    const bar: any = new Rect({
      left: xPos - barWidth / 2,
      top: barTop,
      width: barWidth,
      height: barH,
      fill: pickColorByThreshold(value, goal, colors),
      selectable: false,
      hasControls: false,
      evented: false,
    })
    group.add(bar)
  }
}

export async function createBarChart(config: BarChartElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const canvas = canvasStore.canvas
  if (!canvas) {
    throw new Error('Canvas is not initialized, cannot add barChart element')
  }

  const id = String((config as any)?.id ?? '') || nanoid()
  const schemaDefaults = barChartSchema.defaultConfig
  const width = config.width || schemaDefaults.width
  const height = config.height || schemaDefaults.height
  const colors = resolveColors(config.colors)
  const barWidth = Math.max(1, Number(config.barWidth ?? schemaDefaults.barWidth))

  const left = config.left ?? canvas.getWidth?.() ?? 227
  const top = config.top ?? canvas.getHeight?.() ?? 227

  const group: any = new Group([], {
    left,
    top,
    id,
    eleType: 'barChart',
    originX: config.originX ?? 'center',
    originY: config.originY ?? 'center',
    width,
    height,
    chartProperty: config.chartProperty,
    barWidth,
    colors,
    designerControlMode: 'resize8',
    selectable: true,
    hasControls: true,
    hasBorders: true,
    lockScalingX: false,
    lockScalingY: false,
    lockScalingFlip: true,
  } as any)

  createBaseRect(group)
  attachScaleHandler(group)
  applyControlsToObject(group)
  group.set({ left, top })
  group.setCoords()
  canvas.add(group)

  layerStore.addLayer(group as any)
  canvas.renderAll()
  canvas.discardActiveObject()
  canvas.setActiveObject(group)

  return group as FabricElement
}

export function updateBarChart(
  element: FabricElement,
  patch: Partial<BarChartElementConfig> = {},
): void {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return

  const group: any = canvas.getObjects().find((obj: any) => (obj as any).id === (element as any).id)
  if (!group || !group.getObjects) return

  const currentLeft = group.left
  const currentTop = group.top
  const currentWidth = group.width
  const currentHeight = group.height

  const updateProps: any = {
    left: (patch as any).left,
    top: (patch as any).top,
    width: (patch as any).width,
    height: (patch as any).height,
    originX: patch.originX,
    originY: patch.originY,
    barWidth: patch.barWidth,
    chartProperty: patch.chartProperty,
    colors: (patch as any).colors,
  }

  Object.keys(updateProps).forEach((key) => {
    const k = key as keyof typeof updateProps
    if (updateProps[k] !== undefined) {
      group.set(k as any, updateProps[k])
    }
  })

  if ((patch as any).__simData !== undefined) {
    ;(group as any).__simData = (patch as any).__simData
  }
  if ((patch as any).__simGoal !== undefined) {
    ;(group as any).__simGoal = (patch as any).__simGoal
  }
  if ((patch as any).__simPointCount !== undefined) {
    ;(group as any).__simPointCount = (patch as any).__simPointCount
  }

  const nextWidth = Number((patch as any).width ?? group.width ?? currentWidth)
  const nextHeight = Number((patch as any).height ?? group.height ?? currentHeight)
  const width = Number.isFinite(nextWidth) && nextWidth > 0 ? nextWidth : currentWidth
  const height = Number.isFinite(nextHeight) && nextHeight > 0 ? nextHeight : currentHeight

  group.remove(...group.getObjects())
  const injectedData = (patch as any).__simData ?? (group as any).__simData
  const data = (Array.isArray(injectedData) ? injectedData : []) as number[]
  const goal = Number((patch as any).__simGoal ?? (group as any).__simGoal ?? 100)
  const colors = resolveColors((patch as any).colors ?? group.colors)
  const barWidth = Math.max(1, Number(patch.barWidth ?? group.barWidth ?? 6))

  createBaseRect(group)
  createBars(group, width, height, data, goal, barWidth, colors)

  group.set({
    left: Number((patch as any).left ?? currentLeft),
    top: Number((patch as any).top ?? currentTop),
    width,
    height,
  })
  group.setCoords()
  applyControlsToObject(group)
  canvas.requestRenderAll?.()
}
