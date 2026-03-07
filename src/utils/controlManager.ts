import { Control, FabricObject, controlsUtils } from 'fabric'
import type { Canvas } from 'fabric'
import { nanoid } from 'nanoid'

type FabricLikeObject = FabricObject & {
  id?: string
  eleType?: string
  left?: number
  top?: number
  locked?: boolean
  guideline?: boolean
  keyGuideline?: boolean
  canvas?: Canvas
  clone: (...args: any[]) => unknown
  set: (props: Record<string, unknown>) => unknown
}

export interface ControlManagerOptions {
  size?: number
  stroke?: string
  fill?: string
  deleteFill?: string
  cloneFill?: string
  cloneOffset?: number
  onDelete?: (target: FabricLikeObject, canvas: Canvas) => void
  onClone?: (source: FabricLikeObject, cloned: FabricLikeObject, canvas: Canvas) => void
}

const DEFAULT_OPTIONS: Required<Omit<ControlManagerOptions, 'onDelete' | 'onClone'>> = {
  size: 6,
  stroke: '#333333',
  fill: '#ffffff',
  deleteFill: '#ef4444',
  cloneFill: '#22c55e',
  cloneOffset: 20,
}

let runtimeOptions: Required<Omit<ControlManagerOptions, 'onDelete' | 'onClone'>> & Pick<ControlManagerOptions, 'onDelete' | 'onClone'> = {
  ...DEFAULT_OPTIONS,
}

function isManageableTarget(target: FabricLikeObject | undefined): target is FabricLikeObject {
  if (!target) return false
  if (target.guideline || target.keyGuideline) return false
  if (target.eleType === 'global') return false
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

function deleteHandler(_eventData: unknown, transform: { target?: FabricLikeObject }): boolean {
  const target = transform.target
  if (!isManageableTarget(target) || !target.canvas) return false

  const canvas = target.canvas
  runtimeOptions.onDelete?.(target, canvas)
  canvas.discardActiveObject()
  canvas.remove(target)
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

    const left = Number(source.left ?? 0) + runtimeOptions.cloneOffset
    const top = Number(source.top ?? 0) + runtimeOptions.cloneOffset

    cloned.set({
      id: nanoid(),
      left,
      top,
      selectable: true,
      evented: true,
      hasControls: true,
      lockScalingX: false,
      lockScalingY: false,
    })

    canvas.discardActiveObject()
    canvas.add(cloned)
    canvas.setActiveObject(cloned)
    runtimeOptions.onClone?.(source, cloned, canvas)
    canvas.requestRenderAll()
  })()

  return true
}

function createControls(): Record<string, Control> {
  return {
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
    ml: new Control({
      x: -0.5,
      y: 0,
      cursorStyle: 'ew-resize',
      actionHandler: controlsUtils.scalingX,
      actionName: 'scale',
      render: renderDefaultControl,
    }),
    mr: new Control({
      x: 0.5,
      y: 0,
      cursorStyle: 'ew-resize',
      actionHandler: controlsUtils.scalingX,
      actionName: 'scale',
      render: renderDefaultControl,
    }),
    mt: new Control({
      x: 0,
      y: -0.5,
      cursorStyle: 'ns-resize',
      actionHandler: controlsUtils.scalingY,
      actionName: 'scale',
      render: renderDefaultControl,
    }),
    mb: new Control({
      x: 0,
      y: 0.5,
      cursorStyle: 'ns-resize',
      actionHandler: controlsUtils.scalingY,
      actionName: 'scale',
      render: renderDefaultControl,
    }),
    mtr: new Control({
      x: 0,
      y: -0.5,
      offsetY: -30,
      cursorStyle: 'crosshair',
      actionHandler: controlsUtils.rotationWithSnapping,
      actionName: 'rotate',
      render: renderDefaultControl,
    }),
    cloneControl: new Control({
      x: 0.5,
      y: -0.5,
      offsetX: 20,
      offsetY: -20,
      cursorStyle: 'copy',
      mouseUpHandler: cloneHandler,
      render: renderCloneControl,
    }),
    deleteControl: new Control({
      x: -0.5,
      y: -0.5,
      offsetX: -20,
      offsetY: -20,
      cursorStyle: 'pointer',
      mouseUpHandler: deleteHandler,
      render: renderDeleteControl,
    }),
  }
}

export function applyControlsToObject(target: FabricObject | null | undefined): void {
  if (!target) return
  const t = target as unknown as FabricLikeObject
  if (!isManageableTarget(t)) return

  ;(t as unknown as { controls?: Record<string, Control> }).controls = createControls()
  t.set({
    cornerStyle: 'circle',
    cornerSize: runtimeOptions.size * 2,
    touchCornerSize: runtimeOptions.size * 4,
    transparentCorners: false,
    cornerColor: runtimeOptions.fill,
    cornerStrokeColor: runtimeOptions.stroke,
    borderColor: '#409EFF',
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
    borderColor: '#409EFF',
  }

  ;(FabricObject.prototype as any).controls = createControls()
}
