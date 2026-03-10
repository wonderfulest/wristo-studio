import { Group, Rect } from 'fabric'
import type { FabricElement } from '@/types/element'
import type { GoalSegmentBarElementConfig } from '@/types/elements/goal'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { ensureGoalElementId, clampProgress } from '@/elements/goal/goal.common'

interface BuildSegmentsParams {
  left: number
  top: number
  width: number
  height: number
  segments: number
  gap: number
  borderRadius: number
  bgColor: string
  color: string
  progress: number // 0..1
}

function buildSegments(params: BuildSegmentsParams) {
  const {
    left,
    top,
    width,
    height,
    segments,
    gap,
    borderRadius,
    bgColor,
    color,
    progress,
  } = params

  const segmentWidth = (width - gap * (segments - 1)) / segments

  const bgRects: Rect[] = []
  const activeRects: Rect[] = []

  const activeTotal = Math.max(0, Math.min(1, progress)) * segments
  const fullActive = Math.floor(activeTotal)
  const remainder = activeTotal - fullActive

  for (let i = 0; i < segments; i++) {
    const x = left - width / 2 + i * (segmentWidth + gap) + segmentWidth / 2
    // background segment
    const bgRect = new Rect({
      id: `${i}_seg_bg`,
      left: x,
      top,
      width: segmentWidth,
      height,
      fill: bgColor,
      rx: borderRadius,
      ry: borderRadius,
      originX: 'center',
      originY: 'center',
      selectable: true,
      hasControls: false,
      hasBorders: true,
      evented: false,
    }) as unknown as Rect
    bgRects.push(bgRect)

    // active segment(s)
    if (i < fullActive) {
      const active = new Rect({
        id: `${i}_seg_active`,
        left: x,
        top,
        width: segmentWidth,
        height,
        fill: color,
        rx: borderRadius,
        ry: borderRadius,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      }) as unknown as Rect
      activeRects.push(active)
    } else if (i === fullActive && remainder > 0) {
      const partialWidth = Math.max(0, Math.min(1, remainder)) * segmentWidth
      const partialLeft = x - segmentWidth / 2 + partialWidth / 2
      const active = new Rect({
        id: `${i}_seg_active`,
        left: partialLeft,
        top,
        width: partialWidth,
        height,
        fill: color,
        rx: borderRadius,
        ry: borderRadius,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      }) as unknown as Rect
      activeRects.push(active)
    }
  }

  return { bgRects, activeRects }
}

export function createGoalSegmentBar(options: GoalSegmentBarElementConfig): FabricElement {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const canvas = canvasStore.canvas
  if (!canvas) {
    throw new Error('Canvas not initialized, cannot add goal segment bar element')
  }

  const id = ensureGoalElementId(options.id as any)

  const left = Number(options.left) || 0
  const top = Number(options.top) || 0
  const width = Number(options.width) || 200
  const height = Number(options.height) || 12
  const segments = Math.max(1, Math.floor(options.segments ?? 8))
  const gap = Math.max(0, Number(options.gap ?? 2))
  const borderRadius = Math.max(0, Number(options.borderRadius ?? 4))
  const color = options.color || '#00FF00'
  const bgColor = options.bgColor || '#333333'
  const progress = clampProgress(options.progress ?? 0)

  const { bgRects, activeRects } = buildSegments({
    left,
    top,
    width,
    height,
    segments,
    gap,
    borderRadius,
    bgColor,
    color,
    progress,
  })

  const group = new Group([...bgRects, ...activeRects], {
    id,
    eleType: 'goalSegmentBar',
    left,
    top,
    width,
    height,
    originX: options.originX || 'center',
    originY: options.originY || 'center',
    selectable: true,
    hasControls: false,
    hasBorders: true,
    // custom props kept on group for encode/update
    color,
    bgColor,
    borderRadius,
    segments,
    gap,
    progress,
    goalProperty: options.goalProperty || '',
    // persist desired size regardless of Fabric's computed group bounds
    designWidth: width,
    designHeight: height,
  } as unknown as FabricElement)

  // hard-lock visible width/height to design sizes
  ;(group as any).width = width
  ;(group as any).height = height

  canvas.add(group as unknown as any)
  layerStore.addLayer(group as unknown as any)
  canvas.renderAll?.()
  canvas.setActiveObject(group as unknown as any)

  return group as unknown as FabricElement
}

export function updateGoalSegmentBar(element: any, options: Partial<GoalSegmentBarElementConfig> = {}): void {
  if (!element) return

  const left = options.left !== undefined ? Number(options.left) : element.left
  const top = options.top !== undefined ? Number(options.top) : element.top
  const currentDesignWidth = (element as any).designWidth ?? element.width
  const currentDesignHeight = (element as any).designHeight ?? element.height
  const width = options.width !== undefined ? Number(options.width) : currentDesignWidth
  const height = options.height !== undefined ? Number(options.height) : currentDesignHeight
  const segments = options.segments !== undefined ? Math.max(1, Math.floor(options.segments)) : element.segments
  const gap = options.gap !== undefined ? Math.max(0, Number(options.gap)) : element.gap
  const borderRadius = options.borderRadius !== undefined ? Math.max(0, Number(options.borderRadius)) : element.borderRadius
  const color = options.color ?? element.color
  const bgColor = options.bgColor ?? element.bgColor
  const progress = options.progress !== undefined ? clampProgress(options.progress) : clampProgress(element.progress)

  // update group properties
  element.set({ left, top })
  if (options.originX) element.set({ originX: options.originX })
  if (options.originY) element.set({ originY: options.originY })
  // persist desired size on group for future rebuilds (do not rely on Fabric computed width/height)
  ;(element as any).designWidth = width
  ;(element as any).designHeight = height
  element.color = color
  element.bgColor = bgColor
  element.segments = segments
  element.gap = gap
  element.borderRadius = borderRadius
  element.progress = progress

  // rebuild children
  const { bgRects, activeRects } = buildSegments({
    left,
    top,
    width,
    height,
    segments,
    gap,
    borderRadius,
    bgColor,
    color,
    progress,
  })

  // remove all existing children and add new ones (compat across Fabric versions)
  const children = element.getObjects()
  children.forEach((child: any) => {
    if (typeof (element as any).removeWithUpdate === 'function') {
      (element as any).removeWithUpdate(child)
    } else if (typeof element.remove === 'function') {
      element.remove(child)
    }
  })

  const addChild = (rect: any) => {
    if (typeof (element as any).addWithUpdate === 'function') {
      (element as any).addWithUpdate(rect)
    } else if (typeof element.add === 'function') {
      element.add(rect)
    }
  }
  bgRects.forEach(addChild)
  activeRects.forEach(addChild)

  if (typeof (element as any)._setAfterTransform === 'function') {
    ;(element as any)._setAfterTransform()
  }
  // hard-lock width/height to design sizes to avoid drift
  element.set({
    width: (element as any).designWidth,
    height: (element as any).designHeight,
  })
  // recalc bounds & internal coords if available
  ;(element as any)._calcBounds?.()
  ;(element as any)._updateObjectsCoords?.()
  ;(element as any)._onAfterObjectsChange?.('add')
  ;(element as any)._set?.('dirty', true)
  element.setCoords()

  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  canvas?.requestRenderAll?.()
  canvas?.renderAll?.()
}
