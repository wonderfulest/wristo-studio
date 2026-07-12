import { Control, FabricObject, controlsUtils } from 'fabric'
import type { Canvas } from 'fabric'
import { nanoid } from 'nanoid'
import { bringForward, bringToFront, sendBackward, sendToBack } from '@/engine/managers/layerManager'
import {
  clearExpandedLayerOrderControl,
  getExpandedLayerOrderControlId,
  getLayerOrderAvailability,
  isLayerOrderControlExpanded,
  isLayerOrderControlTarget,
  toggleExpandedLayerOrderControl,
} from '@/utils/layerOrderControl'

type FabricLikeObject = FabricObject & {
  id?: string
  eleType?: string
  designerControlMode?: string
  left?: number
  top?: number
  locked?: boolean
  guideline?: boolean
  keyGuideline?: boolean
  canvas?: Canvas
  clone: (...args: any[]) => unknown
  set: (props: Record<string, unknown>) => unknown
}

type VisualCenter = {
  x: number
  y: number
}

// 统一控制点适用的元素类型（按 eleType 区分），供全局复用
export const DESIGNER_CONTROL_TYPES: string[] = [
  'rectangle',
  'windDirection',
  'circle',
  'image',
  'centerCap',
  'tick12',
  'tick60',
  'romans',
  'barChart',
  'lineChart',
]

export interface ControlManagerOptions {
  size?: number
  stroke?: string
  fill?: string
  deleteFill?: string
  cloneFill?: string
  cloneOffset?: number
  onDelete?: (target: FabricLikeObject, canvas: Canvas) => void
  onClone?: (source: FabricLikeObject, cloned: FabricLikeObject, canvas: Canvas) => void
  onLayerOrderChange?: (target: FabricLikeObject, canvas: Canvas) => void
}

const offset = 10

const DEFAULT_OPTIONS: Required<Omit<ControlManagerOptions, 'onDelete' | 'onClone' | 'onLayerOrderChange'>> = {
  size: 6,
  stroke: '#333333',
  fill: '#ffffff',
  deleteFill: '#ef4444',
  cloneFill: '#22c55e',
  cloneOffset: offset,
}

let runtimeOptions: Required<Omit<ControlManagerOptions, 'onDelete' | 'onClone' | 'onLayerOrderChange'>> &
  Pick<ControlManagerOptions, 'onDelete' | 'onClone' | 'onLayerOrderChange'> = {
  ...DEFAULT_OPTIONS,
}

function isManageableTarget(target: FabricLikeObject | undefined): target is FabricLikeObject {
  if (!target) return false
  if (target.guideline || target.keyGuideline) return false
  if (target.eleType === 'global' || target.eleType === 'background') return false
  if (target.locked) return false
  if (target.selectable === false || target.evented === false) return false
  if (target.hasControls === false) return false
  return true
}

function renderCircle(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  fill: string,
): void {
  const { size, stroke } = runtimeOptions
  ctx.save()
  ctx.fillStyle = fill
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(left, top, size, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function renderDefaultControl(ctx: CanvasRenderingContext2D, left: number, top: number): void {
  renderCircle(ctx, left, top, runtimeOptions.fill)
}

function renderDeleteControl(ctx: CanvasRenderingContext2D, left: number, top: number): void {
  renderCircle(ctx, left, top, runtimeOptions.deleteFill)
}

function renderCloneControl(ctx: CanvasRenderingContext2D, left: number, top: number): void {
  renderCircle(ctx, left, top, runtimeOptions.cloneFill)
}

type LayerOrderAction = 'front' | 'forward' | 'backward' | 'back'

function getLayerActionEnabled(target: FabricLikeObject | undefined, action: LayerOrderAction): boolean {
  const canvas = target?.canvas
  if (!target || !canvas) return false
  const availability = getLayerOrderAvailability(canvas.getObjects() as FabricLikeObject[], target)
  return action === 'front' || action === 'forward'
    ? availability.canMoveUp
    : availability.canMoveDown
}

function renderLayerGlyph(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  glyph: string,
  enabled = true,
): void {
  renderCircle(ctx, left, top, runtimeOptions.fill)
  ctx.save()
  ctx.fillStyle = enabled ? '#0f6b68' : '#94a3b8'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(glyph, left, top + 0.5)
  ctx.restore()
}

function renderLayerOrderEntryControl(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
): void {
  renderLayerGlyph(ctx, left, top, '▤')
}

function createLayerActionRenderer(action: LayerOrderAction, glyph: string) {
  return (
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    _styleOverride: unknown,
    target: FabricObject,
  ): void => {
    renderLayerGlyph(ctx, left, top, glyph, getLayerActionEnabled(target as FabricLikeObject, action))
  }
}

function applyLayerOrderAction(target: FabricLikeObject, action: LayerOrderAction): boolean {
  const id = target.id == null ? '' : String(target.id)
  if (!id) return false
  if (action === 'front') return bringToFront(id)
  if (action === 'forward') return bringForward(id)
  if (action === 'backward') return sendBackward(id)
  return sendToBack(id)
}

function createLayerActionHandler(action: LayerOrderAction) {
  return (_eventData: unknown, transform: { target?: FabricLikeObject }): boolean => {
    const target = transform.target
    if (!target?.canvas || !isLayerOrderControlTarget(target)) return false
    if (!applyLayerOrderAction(target, action)) return false

    const canvas = target.canvas
    canvas.setActiveObject(target)
    runtimeOptions.onLayerOrderChange?.(target, canvas)
    canvas.requestRenderAll()
    return true
  }
}

function isLayerMenuControlVisible(target: FabricObject): boolean {
  const layerTarget = target as FabricLikeObject
  return Boolean(
    isLayerOrderControlTarget(layerTarget) &&
      layerTarget.id != null &&
      isLayerOrderControlExpanded(String(layerTarget.id)),
  )
}

function isLayerEntryControlVisible(target: FabricObject): boolean {
  const layerTarget = target as FabricLikeObject
  const visible = isLayerOrderControlTarget(layerTarget)
  if (
    !visible &&
    layerTarget.id != null &&
    getExpandedLayerOrderControlId() === String(layerTarget.id)
  ) {
    clearExpandedLayerOrderControl()
  }
  return visible
}

async function cloneFabricObject(target: FabricLikeObject): Promise<FabricLikeObject | null> {
  try {
    const maybePromise = target.clone()
    if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
      const result = await (maybePromise as Promise<unknown>)
      return result as FabricLikeObject
    }

    return await new Promise<FabricLikeObject | null>((resolve) => {
      try {
        target.clone((cloned: FabricLikeObject) => resolve(cloned))
      } catch {
        resolve(null)
      }
    })
  } catch {
    return null
  }
}

function getVisualCenter(target: FabricLikeObject): VisualCenter {
  const rect = typeof target.getBoundingRect === 'function' ? target.getBoundingRect() : null
  if (rect) {
    const left = Number(rect.left ?? 0)
    const top = Number(rect.top ?? 0)
    const width = Number(rect.width ?? 0)
    const height = Number(rect.height ?? 0)
    if ([left, top, width, height].every(Number.isFinite)) {
      return {
        x: left + width / 2,
        y: top + height / 2,
      }
    }
  }

  const left = Number(target.left ?? 0)
  const top = Number(target.top ?? 0)
  return {
    x: Number.isFinite(left) ? left : 0,
    y: Number.isFinite(top) ? top : 0,
  }
}

function getOffsetAnchorPosition(source: FabricLikeObject, cloned: FabricLikeObject): { left: number; top: number } {
  const sourceCenter = getVisualCenter(source)
  const clonedCenter = getVisualCenter(cloned)
  const sourceLeft = Number(source.left ?? sourceCenter.x)
  const sourceTop = Number(source.top ?? sourceCenter.y)
  const clonedLeft = Number(cloned.left ?? clonedCenter.x)
  const clonedTop = Number(cloned.top ?? clonedCenter.y)
  const anchorOffsetX = Number.isFinite(clonedLeft) ? clonedLeft - clonedCenter.x : sourceLeft - sourceCenter.x
  const anchorOffsetY = Number.isFinite(clonedTop) ? clonedTop - clonedCenter.y : sourceTop - sourceCenter.y

  return {
    left: sourceCenter.x + runtimeOptions.cloneOffset + anchorOffsetX,
    top: sourceCenter.y + runtimeOptions.cloneOffset + anchorOffsetY,
  }
}

function deleteHandler(_eventData: unknown, transform: { target?: FabricLikeObject }): boolean {
  const target = transform.target
  if (!isManageableTarget(target) || !target.canvas) return false

  const canvas = target.canvas
  runtimeOptions.onDelete?.(target, canvas)
  if (canvas.getObjects().includes(target)) {
    canvas.discardActiveObject()
    canvas.remove(target)
  }
  canvas.requestRenderAll()
  return true
}

function cloneHandler(_eventData: unknown, transform: { target?: FabricLikeObject }): boolean {
  const source = transform.target
  if (!isManageableTarget(source) || !source.canvas) return false

  const canvas = source.canvas
  void (async () => {
    const cloned = await cloneFabricObject(source)
    if (!cloned) return

    const { left, top } = getOffsetAnchorPosition(source, cloned)

    cloned.set({
      id: nanoid(),
      left,
      top,
      designerControlMode: source.designerControlMode,
      selectable: true,
      evented: true,
      hasControls: true,
      lockScalingX: false,
      lockScalingY: false,
    })

    applyControlsToObject(cloned)

    canvas.discardActiveObject()
    canvas.add(cloned)
    canvas.setActiveObject(cloned)
    runtimeOptions.onClone?.(source, cloned, canvas)
    canvas.requestRenderAll()
  })()

  return true
}

type ControlSetMode = 'default' | 'resize8' | 'corner4'

function createControls(mode: ControlSetMode = 'default'): Record<string, Control> {
  const cornerControls: Record<string, Control> = {
    tl: new Control({
      x: -0.5,
      y: -0.5,
      cursorStyle: 'nwse-resize',
      actionHandler: controlsUtils.scalingEqually,
      actionName: 'scale',
      render: renderDefaultControl,
    }),
    tr: new Control({
      x: 0.5,
      y: -0.5,
      cursorStyle: 'nesw-resize',
      actionHandler: controlsUtils.scalingEqually,
      actionName: 'scale',
      render: renderDefaultControl,
    }),
    bl: new Control({
      x: -0.5,
      y: 0.5,
      cursorStyle: 'nesw-resize',
      actionHandler: controlsUtils.scalingEqually,
      actionName: 'scale',
      render: renderDefaultControl,
    }),
    br: new Control({
      x: 0.5,
      y: 0.5,
      cursorStyle: 'nwse-resize',
      actionHandler: controlsUtils.scalingEqually,
      actionName: 'scale',
      render: renderDefaultControl,
    }),
  }

  if (mode === 'corner4') return cornerControls

  const base: Record<string, Control> = {
    ...cornerControls,
    cloneControl: new Control({
      x: 0.5,
      y: -0.5,
      offsetX: offset,
      offsetY: -offset,
      cursorStyle: 'copy',
      mouseUpHandler: cloneHandler,
      render: renderCloneControl,
    }),
    deleteControl: new Control({
      x: -0.5,
      y: -0.5,
      offsetX: -offset,
      offsetY: -offset,
      cursorStyle: 'pointer',
      mouseUpHandler: deleteHandler,
      render: renderDeleteControl,
    }),
    layerOrderControl: new Control({
      x: 0.5,
      y: 0.5,
      offsetX: offset * 2,
      offsetY: offset * 2,
      cursorStyle: 'pointer',
      actionName: 'layerOrder',
      getVisibility: isLayerEntryControlVisible,
      mouseUpHandler: (_eventData, transform) => {
        const target = transform.target as FabricLikeObject | undefined
        if (!target?.canvas || target.id == null || !isLayerOrderControlTarget(target)) return false
        toggleExpandedLayerOrderControl(String(target.id))
        target.canvas.requestRenderAll()
        return true
      },
      render: renderLayerOrderEntryControl,
    }),
    bringToFrontControl: new Control({
      x: 0.5,
      y: 0.5,
      offsetX: offset * 2,
      offsetY: -offset * 6,
      cursorStyle: 'pointer',
      actionName: 'bringToFront',
      getVisibility: isLayerMenuControlVisible,
      mouseUpHandler: createLayerActionHandler('front'),
      render: createLayerActionRenderer('front', '⇈'),
    }),
    bringForwardControl: new Control({
      x: 0.5,
      y: 0.5,
      offsetX: offset * 2,
      offsetY: -offset * 4,
      cursorStyle: 'pointer',
      actionName: 'bringForward',
      getVisibility: isLayerMenuControlVisible,
      mouseUpHandler: createLayerActionHandler('forward'),
      render: createLayerActionRenderer('forward', '↑'),
    }),
    sendBackwardControl: new Control({
      x: 0.5,
      y: 0.5,
      offsetX: offset * 2,
      offsetY: -offset * 2,
      cursorStyle: 'pointer',
      actionName: 'sendBackward',
      getVisibility: isLayerMenuControlVisible,
      mouseUpHandler: createLayerActionHandler('backward'),
      render: createLayerActionRenderer('backward', '↓'),
    }),
    sendToBackControl: new Control({
      x: 0.5,
      y: 0.5,
      offsetX: offset * 2,
      offsetY: 0,
      cursorStyle: 'pointer',
      actionName: 'sendToBack',
      getVisibility: isLayerMenuControlVisible,
      mouseUpHandler: createLayerActionHandler('back'),
      render: createLayerActionRenderer('back', '⇊'),
    }),
  }

  if (mode !== 'resize8') return base

  return {
    ...base,
    mt: new Control({
      x: 0,
      y: -0.5,
      cursorStyle: 'ns-resize',
      actionHandler: controlsUtils.scalingY,
      actionName: 'scaleY',
      render: renderDefaultControl,
    }),
    mb: new Control({
      x: 0,
      y: 0.5,
      cursorStyle: 'ns-resize',
      actionHandler: controlsUtils.scalingY,
      actionName: 'scaleY',
      render: renderDefaultControl,
    }),
    ml: new Control({
      x: -0.5,
      y: 0,
      cursorStyle: 'ew-resize',
      actionHandler: controlsUtils.scalingX,
      actionName: 'scaleX',
      render: renderDefaultControl,
    }),
    mr: new Control({
      x: 0.5,
      y: 0,
      cursorStyle: 'ew-resize',
      actionHandler: controlsUtils.scalingX,
      actionName: 'scaleX',
      render: renderDefaultControl,
    }),
  }
}

export function applyControlsToObject(target: FabricObject | null | undefined): void {
  if (!target) return
  const t = target as unknown as FabricLikeObject
  if (!isManageableTarget(t)) return

  const mode =
    (t as any).designerControlMode === 'resize8'
      ? 'resize8'
      : (t as any).designerControlMode === 'corner4'
        ? 'corner4'
        : 'default'
  ;(t as unknown as { controls?: Record<string, Control> }).controls = createControls(mode)
  t.set({
    cornerStyle: 'circle',
    cornerSize: runtimeOptions.size * 2,
    touchCornerSize: runtimeOptions.size * 4,
    transparentCorners: false,
    cornerColor: runtimeOptions.fill,
    cornerStrokeColor: runtimeOptions.stroke,
    borderColor: '#0f6b68',
  })
}

export function applyControlManager(options: ControlManagerOptions = {}): void {
  runtimeOptions = {
    ...runtimeOptions,
    ...options,
  }

  ;(FabricObject as any).ownDefaults = {
    ...(FabricObject as any).ownDefaults,
    cornerStyle: 'circle',
    cornerSize: runtimeOptions.size * 2,
    touchCornerSize: runtimeOptions.size * 4,
    transparentCorners: false,
    cornerColor: runtimeOptions.fill,
    cornerStrokeColor: runtimeOptions.stroke,
    borderColor: '#0f6b68',
  }

  ;(FabricObject.prototype as any).controls = createControls('default')
}
