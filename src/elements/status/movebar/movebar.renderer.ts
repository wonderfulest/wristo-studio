import { nanoid } from 'nanoid'
import { Group, Polygon } from 'fabric'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import * as elementManager from '@/engine/managers/elementManager'
import type { FabricElement } from '@/types/element'
import type { MoveBarElementConfig } from '@/types/elements/status'

const DEFAULT_COLORS = {
  active: '#00FF00',
  inactive: '#555555',
}

function getBarWidth(totalWidth: number, separator: number) {
  const numBars = 5
  const firstBarMultiplier = 2
  const normalBarUnits = 4
  const totalBarWidth = totalWidth - (numBars - 1) * separator
  const normalBarWidth = totalBarWidth / (firstBarMultiplier + normalBarUnits)
  return {
    firstBar: normalBarWidth * firstBarMultiplier,
    normalBar: normalBarWidth,
  }
}

function createBarPoints(x: number, y: number, width: number, height: number): { x: number; y: number }[] {
  const tailIndent = width * 0.2
  return [
    { x: x, y: y },
    { x: x + width - tailIndent, y: y },
    { x: x + width, y: y + height / 2 },
    { x: x + width - tailIndent, y: y + height },
    { x: x, y: y + height },
    { x: x + tailIndent, y: y + height / 2 },
  ]
}

export function createMoveBar(config: MoveBarElementConfig): FabricElement {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const canvas = canvasStore.canvas
  if (!canvas) throw new Error('Canvas is not ready')

  const id = config.id || nanoid()
  const width = config.width || 150
  const height = config.height || 6
  const separator = config.separator || 2
  const level = config.level || 3

  const activeColor = config.activeColor || config.color || DEFAULT_COLORS.active
  const inactiveColor = config.inactiveColor || config.bgColor || DEFAULT_COLORS.inactive

  const barWidths = getBarWidth(width, separator)

  const group: any = new Group([], {
    left: config.left,
    top: config.top,
    id,
    eleType: 'moveBar',
    selectable: true,
    hasControls: false,
    hasBorders: true,
    originX: config.originX ?? 'center',
    originY: config.originY ?? 'center',
    width,
    height,
    activeColor,
    inactiveColor,
    level,
    separator,
  } as any)

  const bars: any[] = []
  let barX = -width / 2
  for (let i = 1; i <= 5; i++) {
    const isActive = i <= level
    const color = isActive ? activeColor : inactiveColor
    const currentBarWidth = i === 1 ? barWidths.firstBar : barWidths.normalBar
    const points = createBarPoints(barX, -height / 2, currentBarWidth, height)
    const bar: any = new Polygon(points as any, {
      fill: color,
      id: id + '_bar_' + i,
      originX: 'center',
      originY: 'center',
      selectable: false,
      hasControls: false,
    } as any)
    group.add(bar)
    bars.push(bar)
    barX += currentBarWidth + separator
  }

  ;(group as any)._bars = bars

  group.setCoords()
  canvas.add(group as any)

  group.set({ left: config.left, top: config.top })
  group.setCoords()

  layerStore.addLayer(group as any)
  elementManager.registerElementInstance(group as FabricElement)
  canvas.requestRenderAll?.()
  canvas.discardActiveObject()
  canvas.setActiveObject(group as any)

  return group as FabricElement
}

export function updateMoveBar(element: FabricElement, patch: Partial<MoveBarElementConfig>): void {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return

  const group = elementManager.getElementById((element as any).id) as any
  if (!group) return

  const currentLeft = group.left
  const currentTop = group.top
  const currentWidth = (group as any).width || patch.width
  const currentHeight = (group as any).height || patch.height

  const updateProps: any = {
    activeColor: patch.activeColor || patch.color || group.activeColor,
    inactiveColor: patch.inactiveColor || patch.bgColor || group.inactiveColor,
    level: patch.level ?? group.level,
    originX: patch.originX ?? group.originX,
    originY: patch.originY ?? group.originY,
    separator: patch.separator ?? group.separator,
  }

  group.set({ width: currentWidth, height: currentHeight, ...updateProps })

  const bars: any[] = (group as any)._bars
  if (bars && Array.isArray(bars)) {
    bars.forEach((bar: any) => group.remove(bar))
  }

  const separator = patch.separator ?? group.separator ?? 6
  const level = patch.level ?? group.level ?? 0
  const activeColor =
    patch.activeColor || patch.color || group.activeColor || DEFAULT_COLORS.active
  const inactiveColor =
    patch.inactiveColor || patch.bgColor || group.inactiveColor || DEFAULT_COLORS.inactive

  const barWidths = getBarWidth(currentWidth, separator)
  const nextBars: any[] = []
  let barX = -currentWidth / 2
  for (let i = 1; i <= 5; i++) {
    const isActive = i <= level
    const color = isActive ? activeColor : inactiveColor
    const currentBarWidth = i === 1 ? barWidths.firstBar : barWidths.normalBar
    const points = createBarPoints(barX, -currentHeight / 2, currentBarWidth, currentHeight)
    const bar: any = new Polygon(points as any, {
      fill: color,
      id: (element as any).id + '_bar_' + i,
      originX: 'center',
      originY: 'center',
      selectable: false,
      hasControls: false,
    } as any)
    group.add(bar)
    nextBars.push(bar)
    barX += currentBarWidth + separator
  }

  if (patch.left === undefined) {
    group.set('left', currentLeft)
  }
  if (patch.top === undefined) {
    group.set('top', currentTop)
  }
  if (patch.left !== undefined || patch.top !== undefined) {
    group.set({ left: patch.left ?? group.left, top: patch.top ?? group.top })
  }

  ;(group as any)._bars = nextBars

  group.setCoords()
  canvas.requestRenderAll?.()
}
