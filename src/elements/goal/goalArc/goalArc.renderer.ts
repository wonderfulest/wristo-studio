import { Circle, Group } from 'fabric'
import type { FabricElement } from '@/types/element'
import type { GoalArcElementConfig } from '@/types/elements/goal'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { ensureGoalElementId, clampProgress } from '@/elements/goal/goal.common'

function getProgressAngle(startAngle: number, endAngle: number, counterClockwise: boolean, progress: number) {
  // 规范到 0-359 区间
  startAngle = ((startAngle % 360) + 360) % 360
  endAngle = ((endAngle % 360) + 360) % 360
  const clamped = clampProgress(progress)

  if (counterClockwise) {
    if (endAngle > startAngle) {
      endAngle -= 360
    }
    return startAngle + (endAngle - startAngle) * clamped
  } else {
    if (endAngle < startAngle) {
      endAngle += 360
    }
    return startAngle + (endAngle - startAngle) * clamped
  }
}

export function createGoalArc(config: GoalArcElementConfig): FabricElement {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const canvas = canvasStore.canvas
  if (!canvas) {
    throw new Error('Canvas is not initialized')
  }

  const id = ensureGoalElementId(config.id as any)
  const startAngle = Number(config.startAngle)
  const endAngle = Number(config.endAngle)
  const radius = Number(config.radius)
  const bgRadius = Number(config.bgRadius || radius)
  const strokeWidth = Number(config.strokeWidth)
  const bgStrokeWidth = Number(config.bgStrokeWidth || strokeWidth)
  const color = config.color
  const bgColor = config.bgColor
  const counterClockwise = !!config.counterClockwise
  const progress = clampProgress(config.progress ?? 0)

  const bgRing: any = new Circle({
    radius: bgRadius,
    fill: 'transparent',
    stroke: bgColor,
    strokeWidth: bgStrokeWidth,
    startAngle: startAngle,
    endAngle: endAngle,
    id: id + '_bg',
    originX: 'center',
    originY: 'center',
    counterClockwise: false,
  })

  const mainRing: any = new Circle({
    radius: radius,
    fill: 'transparent',
    stroke: color,
    strokeWidth: strokeWidth,
    startAngle: startAngle,
    endAngle: getProgressAngle(startAngle, endAngle, counterClockwise, progress),
    id: id + '_main',
    originX: 'center',
    originY: 'center',
    counterClockwise: counterClockwise,
  })

  const size = Math.max((radius + strokeWidth / 2) * 2, (bgRadius + bgStrokeWidth / 2) * 2)

  const group: any = new Group([bgRing, mainRing], {
    left: config.left,
    top: config.top,
    width: size,
    height: size,
    id,
    eleType: 'goalArc',
    selectable: true,
    hasControls: false,
    hasBorders: true,
    originX: 'center',
    originY: 'center',
    goalProperty: config.goalProperty,
    startAngle: startAngle,
    endAngle: endAngle,
    counterClockwise: counterClockwise,
    progress: progress,
  } as any)

  group.setCoords()
  canvas.add(group)
  layerStore.addLayer(group as any)
  canvas.renderAll?.()
  canvas.discardActiveObject?.()
  canvas.setActiveObject(group)

  return group as FabricElement
}

export function updateGoalArc(element: FabricElement, patch: Partial<GoalArcElementConfig> = {}): void {
  const anyElement: any = element as any
  if (!anyElement || !anyElement.getObjects) return

  const objects = anyElement.getObjects()
  const mainRing: any = objects.find((obj: any) => (obj as any).id === anyElement.id + '_main')
  const bgRing: any = objects.find((obj: any) => (obj as any).id === anyElement.id + '_bg')
  if (!mainRing || !bgRing) return

  // 当前进度：优先 patch.progress，其次 group.progress
  const nextProgress = clampProgress(patch.progress ?? anyElement.progress ?? 0)

  const bgRingOptions: any = {
    radius: patch.bgRadius ?? bgRing.radius,
    strokeWidth: patch.bgStrokeWidth ?? bgRing.strokeWidth,
    stroke: patch.bgColor ?? bgRing.stroke,
    startAngle: patch.startAngle ?? bgRing.startAngle,
    endAngle: patch.endAngle ?? bgRing.endAngle,
    counterClockwise: patch.counterClockwise !== undefined ? patch.counterClockwise : bgRing.counterClockwise,
  }
  bgRing.set(bgRingOptions)

  const startAngle = patch.startAngle ?? anyElement.startAngle
  const endAngle = patch.endAngle ?? anyElement.endAngle
  const counterClockwise = patch.counterClockwise !== undefined ? patch.counterClockwise : anyElement.counterClockwise
  const progressAngle = getProgressAngle(startAngle, endAngle, counterClockwise, nextProgress)

  const mainRingOptions: any = {
    radius: patch.radius ?? mainRing.radius,
    strokeWidth: patch.strokeWidth ?? mainRing.strokeWidth,
    stroke: patch.color ?? mainRing.stroke,
    startAngle,
    endAngle: progressAngle,
    counterClockwise,
  }
  mainRing.set(mainRingOptions)

  const groupOptions: any = {
    left: patch.left ?? anyElement.left,
    top: patch.top ?? anyElement.top,
    startAngle,
    endAngle,
    counterClockwise,
    goalProperty: patch.goalProperty ?? anyElement.goalProperty,
    progress: nextProgress,
  }
  anyElement.set(groupOptions)

  const size = Math.max((mainRing.radius + mainRing.strokeWidth / 2) * 2, (bgRing.radius + bgRing.strokeWidth / 2) * 2)
  anyElement.set({ width: size, height: size })

  anyElement.setCoords?.()
  mainRing.setCoords?.()
  bgRing.setCoords?.()

  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  canvas?.requestRenderAll?.()
}
