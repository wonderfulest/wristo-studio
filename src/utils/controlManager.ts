import { Control, FabricObject, controlsUtils } from 'fabric'
import type { Canvas } from 'fabric'
import { nanoid } from 'nanoid'

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
export const DESIGNER_CONTROL_TYPES: string[] = ['rectangle', 'windDirection', 'circle', 'image', 'centerCap']

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

const offset = 10

const DEFAULT_OPTIONS: Required<Omit<ControlManagerOptions, 'onDelete' | 'onClone'>> = {
  size: 6,
  stroke: '#333333',
  fill: '#ffffff',
  deleteFill: '#ef4444',
  cloneFill: '#22c55e',
  cloneOffset: offset,
}

let runtimeOptions: Required<Omit<ControlManagerOptions, 'onDelete' | 'onClone'>> & Pick<ControlManagerOptions, 'onDelete' | 'onClone'> = {
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
