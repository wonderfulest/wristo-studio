import { Control, FabricObject, Point, controlsUtils } from 'fabric'
import type { Canvas, TMat2D } from 'fabric'
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
  'subDial',
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
export const LAYER_ORDER_ENTRY_OFFSET = 10
export const INSET_CORNER_CONTROL_OFFSET = 30
export const OBJECT_ACTION_MENU_WIDTH = 144
export const OBJECT_ACTION_MENU_HEIGHT = 28
export const OBJECT_ACTION_MENU_TOUCH_HEIGHT = 32
export const OBJECT_ACTION_MENU_GAP = 4
export const OBJECT_ACTION_MENU_OFFSET_X = LAYER_ORDER_ENTRY_OFFSET + OBJECT_ACTION_MENU_WIDTH / 2

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
  radius = runtimeOptions.size,
): void {
  const { stroke } = runtimeOptions
  ctx.save()
  ctx.fillStyle = fill
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(left, top, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function renderDefaultControl(ctx: CanvasRenderingContext2D, left: number, top: number): void {
  renderCircle(ctx, left, top, runtimeOptions.fill)
}

type LayerOrderAction = 'front' | 'forward' | 'backward' | 'back'
type ControlSetMode = 'default' | 'resize8' | 'corner4' | 'corner4Inset'

type ObjectActionDescriptor = {
  key: string
  label: string
  glyph: string
  tone: 'primary' | 'danger'
  layerAction?: LayerOrderAction
}

const OBJECT_ACTIONS: ObjectActionDescriptor[] = [
  { key: 'cloneActionControl', label: 'Clone', glyph: '＋', tone: 'primary' },
  { key: 'deleteActionControl', label: 'Delete', glyph: '×', tone: 'danger' },
  { key: 'bringToFrontControl', label: 'Bring to Front', glyph: '⇈', tone: 'primary', layerAction: 'front' },
  { key: 'bringForwardControl', label: 'Bring Forward', glyph: '↑', tone: 'primary', layerAction: 'forward' },
  { key: 'sendBackwardControl', label: 'Send Backward', glyph: '↓', tone: 'primary', layerAction: 'backward' },
  { key: 'sendToBackControl', label: 'Send to Back', glyph: '⇊', tone: 'primary', layerAction: 'back' },
]

function getLayerActionEnabled(target: FabricLikeObject | undefined, action: LayerOrderAction): boolean {
  const canvas = target?.canvas
  if (!target || !canvas) return false
  const availability = getLayerOrderAvailability(canvas.getObjects() as FabricLikeObject[], target)
  return action === 'front' || action === 'forward'
    ? availability.canMoveUp
    : availability.canMoveDown
}

function renderLayerOrderEntryControl(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
): void {
  renderCircle(ctx, left, top, runtimeOptions.cloneFill)
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('•••', left, top)
  ctx.restore()
}

function renderObjectActionPill(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  descriptor: ObjectActionDescriptor,
  enabled: boolean,
): void {
  const x = left - OBJECT_ACTION_MENU_WIDTH / 2
  const y = top - OBJECT_ACTION_MENU_HEIGHT / 2
  const color = enabled
    ? descriptor.tone === 'danger' ? runtimeOptions.deleteFill : '#0f6b68'
    : '#94a3b8'

  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = runtimeOptions.stroke
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x, y, OBJECT_ACTION_MENU_WIDTH, OBJECT_ACTION_MENU_HEIGHT, 7)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = color
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(descriptor.glyph, x + 18, top + 0.5)
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(descriptor.label, x + 34, top + 0.5)
  ctx.restore()
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

function createObjectActionRenderer(descriptor: ObjectActionDescriptor) {
  return (
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    _styleOverride: unknown,
    target: FabricObject,
  ): void => {
    const enabled = descriptor.layerAction
      ? getLayerActionEnabled(target as FabricLikeObject, descriptor.layerAction)
      : true
    renderObjectActionPill(ctx, left, top, descriptor, enabled)
  }
}

function getObjectActionHandler(descriptor: ObjectActionDescriptor) {
  if (descriptor.key === 'cloneActionControl') return cloneHandler
  if (descriptor.key === 'deleteActionControl') return deleteHandler
  return createLayerActionHandler(descriptor.layerAction as LayerOrderAction)
}

function getObjectActionOffsetY(index: number): number {
  const itemStep = OBJECT_ACTION_MENU_HEIGHT + OBJECT_ACTION_MENU_GAP
  const distanceFromBottom = OBJECT_ACTIONS.length - 1 - index
  return LAYER_ORDER_ENTRY_OFFSET - itemStep - distanceFromBottom * itemStep
}

function getDefaultControlPosition(
  dim: Point,
  finalMatrix: TMat2D,
  control: Pick<Control, 'x' | 'y' | 'offsetX' | 'offsetY'>,
): Point {
  return new Point(
    control.x * dim.x + control.offsetX,
    control.y * dim.y + control.offsetY,
  ).transform(finalMatrix)
}

function getInsetActionAnchor(
  dim: Point,
  finalMatrix: TMat2D,
  fabricObject: FabricObject,
): Point {
  const position = getDefaultControlPosition(dim, finalMatrix, {
    x: 0.5,
    y: 0.5,
    offsetX: LAYER_ORDER_ENTRY_OFFSET,
    offsetY: LAYER_ORDER_ENTRY_OFFSET,
  })
  const canvas = fabricObject.canvas
  if (!canvas) return position

  const margin = INSET_CORNER_CONTROL_OFFSET
  return new Point(
    clamp(position.x, margin, canvas.getWidth() - margin),
    clamp(position.y, margin, canvas.getHeight() - margin * 2),
  )
}

function insetActionEntryPositionHandler(
  dim: Point,
  finalMatrix: TMat2D,
  fabricObject: FabricObject,
): Point {
  return getInsetActionAnchor(dim, finalMatrix, fabricObject)
}

function createInsetActionItemPositionHandler(index: number) {
  return (
    dim: Point,
    finalMatrix: TMat2D,
    fabricObject: FabricObject,
  ): Point => {
    const anchor = getInsetActionAnchor(dim, finalMatrix, fabricObject)
    const canvas = fabricObject.canvas
    const itemStep = OBJECT_ACTION_MENU_HEIGHT + OBJECT_ACTION_MENU_GAP
    const distanceFromBottom = OBJECT_ACTIONS.length - 1 - index
    const position = new Point(
      anchor.x - OBJECT_ACTION_MENU_WIDTH / 2,
      anchor.y - itemStep * (distanceFromBottom + 1),
    )
    if (!canvas) return position

    const margin = INSET_CORNER_CONTROL_OFFSET
    return new Point(
      clamp(
        position.x,
        margin + OBJECT_ACTION_MENU_WIDTH / 2,
        canvas.getWidth() - margin - OBJECT_ACTION_MENU_WIDTH / 2,
      ),
      clamp(
        position.y,
        margin + OBJECT_ACTION_MENU_HEIGHT / 2,
        canvas.getHeight() - margin - OBJECT_ACTION_MENU_HEIGHT / 2,
      ),
    )
  }
}

function createLayerOrderControls(mode: ControlSetMode = 'default'): Record<string, Control> {
  const useInsetMenu = mode === 'corner4Inset'
  const controls: Record<string, Control> = {
    layerOrderControl: new Control({
      x: 0.5,
      y: 0.5,
      offsetX: LAYER_ORDER_ENTRY_OFFSET,
      offsetY: LAYER_ORDER_ENTRY_OFFSET,
      positionHandler: useInsetMenu
        ? insetActionEntryPositionHandler
        : Control.prototype.positionHandler,
      cursorStyle: 'pointer',
      actionName: 'objectActions',
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
  }

  OBJECT_ACTIONS.forEach((descriptor, index) => {
    controls[descriptor.key] = new Control({
      x: 0.5,
      y: 0.5,
      offsetX: OBJECT_ACTION_MENU_OFFSET_X,
      offsetY: getObjectActionOffsetY(index),
      positionHandler: useInsetMenu
        ? createInsetActionItemPositionHandler(index)
        : Control.prototype.positionHandler,
      sizeX: OBJECT_ACTION_MENU_WIDTH,
      sizeY: OBJECT_ACTION_MENU_HEIGHT,
      touchSizeX: OBJECT_ACTION_MENU_WIDTH,
      touchSizeY: OBJECT_ACTION_MENU_TOUCH_HEIGHT,
      cursorStyle: 'pointer',
      actionName: descriptor.key,
      getVisibility: isLayerMenuControlVisible,
      mouseUpHandler: getObjectActionHandler(descriptor),
      render: createObjectActionRenderer(descriptor),
    })
  })

  return controls
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function insetCornerPositionHandler(
  dim: Point,
  finalMatrix: TMat2D,
  fabricObject: FabricObject,
  control: Control,
): Point {
  const position = new Point(control.x * dim.x, control.y * dim.y).transform(finalMatrix)
  const canvas = fabricObject.canvas
  if (!canvas) return position

  const margin = INSET_CORNER_CONTROL_OFFSET
  return new Point(
    clamp(position.x, margin, canvas.getWidth() - margin),
    clamp(position.y, margin, canvas.getHeight() - margin),
  )
}

const CORNER_DIRECTIONS: Record<string, Point> = {
  tl: new Point(-1, -1),
  tr: new Point(1, -1),
  bl: new Point(-1, 1),
  br: new Point(1, 1),
}

const scaleInsetCorner = controlsUtils.wrapWithFireEvent(
  'scaling',
  (_eventData, transform, x, y) => {
    const target = transform.target
    const direction = CORNER_DIRECTIONS[transform.corner]
    if (!direction) return false

    const originalScaleX = Number(transform.original.scaleX)
    const originalScaleY = Number(transform.original.scaleY)
    const halfDiagonal = Math.hypot(
      Number(transform.width) * originalScaleX,
      Number(transform.height) * originalScaleY,
    ) / 2
    if (!Number.isFinite(halfDiagonal) || halfDiagonal <= 0) return false

    const projectedDelta = (
      (x - transform.ex) * direction.x +
      (y - transform.ey) * direction.y
    ) / Math.SQRT2
    const minScale = Number(target.minScaleLimit || 0.01)
    const minRatio = Math.max(
      minScale / originalScaleX,
      minScale / originalScaleY,
    )
    const ratio = Math.max(minRatio, 1 + projectedDelta / halfDiagonal)
    const nextScaleX = originalScaleX * ratio
    const nextScaleY = originalScaleY * ratio
    const changed = target.scaleX !== nextScaleX || target.scaleY !== nextScaleY

    if (changed) {
      target.set({ scaleX: nextScaleX, scaleY: nextScaleY })
    }
    return changed
  },
)

function createControls(mode: ControlSetMode = 'default'): Record<string, Control> {
  const positionHandler =
    mode === 'corner4Inset' ? insetCornerPositionHandler : Control.prototype.positionHandler
  const cornerScaleHandler =
    mode === 'corner4Inset' ? scaleInsetCorner : controlsUtils.scalingEqually
  const cornerControls: Record<string, Control> = {
    tl: new Control({
      x: -0.5,
      y: -0.5,
      positionHandler,
      cursorStyle: 'nwse-resize',
      actionHandler: cornerScaleHandler,
      actionName: 'scale',
      render: renderDefaultControl,
    }),
    tr: new Control({
      x: 0.5,
      y: -0.5,
      positionHandler,
      cursorStyle: 'nesw-resize',
      actionHandler: cornerScaleHandler,
      actionName: 'scale',
      render: renderDefaultControl,
    }),
    bl: new Control({
      x: -0.5,
      y: 0.5,
      positionHandler,
      cursorStyle: 'nesw-resize',
      actionHandler: cornerScaleHandler,
      actionName: 'scale',
      render: renderDefaultControl,
    }),
    br: new Control({
      x: 0.5,
      y: 0.5,
      positionHandler,
      cursorStyle: 'nwse-resize',
      actionHandler: cornerScaleHandler,
      actionName: 'scale',
      render: renderDefaultControl,
    }),
  }

  const layerOrderControls = createLayerOrderControls(mode)

  if (mode === 'corner4' || mode === 'corner4Inset') {
    return { ...cornerControls, ...layerOrderControls }
  }

  const base: Record<string, Control> = {
    ...cornerControls,
    ...layerOrderControls,
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
      : (t as any).designerControlMode === 'corner4Inset'
        ? 'corner4Inset'
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

export function applyLayerOrderControlsToObject(target: FabricObject | null | undefined): void {
  if (!target) return
  const existingControls = (target as unknown as { controls?: Record<string, Control> }).controls ?? {}
  const {
    cloneControl: _legacyCloneControl,
    deleteControl: _legacyDeleteControl,
    ...currentControls
  } = existingControls
  const mode: ControlSetMode =
    (target as unknown as FabricLikeObject).designerControlMode === 'corner4Inset'
      ? 'corner4Inset'
      : 'default'
  ;(target as unknown as { controls: Record<string, Control> }).controls = {
    ...currentControls,
    ...createLayerOrderControls(mode),
  }
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
