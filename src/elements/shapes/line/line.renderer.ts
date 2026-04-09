import { Rect, Control } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { LineElementConfig } from '@/types/elements'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'

// ─── 辅助：x1/y1/x2/y2 <-> Rect left/top/width/angle 互转 ───────────────────

/** 根据两端点计算 Rect 参数（originX/Y = center） */
export function pointsToRect(x1: number, y1: number, x2: number, y2: number, strokeWidth: number) {
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
  return { left: cx, top: cy, width: Math.max(length, 1), height: strokeWidth, angle }
}

/** 从 Rect 反算两端点坐标 */
export function rectToPoints(rect: any): { x1: number; y1: number; x2: number; y2: number } {
  const rad = (rect.angle * Math.PI) / 180
  const halfW = (rect.width * (rect.scaleX ?? 1)) / 2
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    x1: Math.round(rect.left - cos * halfW),
    y1: Math.round(rect.top - sin * halfW),
    x2: Math.round(rect.left + cos * halfW),
    y2: Math.round(rect.top + sin * halfW),
  }
}

// ─── 端点控制点（拖动改变线段长度/端点位置）────────────────────────────────

function createEndpointControl(side: 'left' | 'right'): Control {
  const xSign = side === 'left' ? -0.5 : 0.5
  return new Control({
    x: xSign,
    y: 0,
    cursorStyle: 'crosshair',
    actionHandler: function(eventData, transform, x, y) {
      const rect = transform.target as any
      const canvas = rect.canvas
      const rad = (rect.angle * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)

      const halfW = (rect.width * (rect.scaleX ?? 1)) / 2

      // 固定端坐标
      const fixedX = side === 'left' ? rect.left + cos * halfW : rect.left - cos * halfW
      const fixedY = side === 'left' ? rect.top + sin * halfW : rect.top - sin * halfW

      // 新长度 = 鼠标位置到固定端的距离
      const newLength = Math.max(1, Math.sqrt((x - fixedX) ** 2 + (y - fixedY) ** 2))
      // 新角度
      const newAngle = side === 'left'
        ? (Math.atan2(fixedY - y, fixedX - x) * 180) / Math.PI
        : (Math.atan2(y - fixedY, x - fixedX) * 180) / Math.PI

      // 新中心 = 固定端 + 半长沿新方向
      const newRad = (newAngle * Math.PI) / 180
      const newCX = side === 'left' ? fixedX - Math.cos(newRad) * newLength / 2 : fixedX + Math.cos(newRad) * newLength / 2
      const newCY = side === 'left' ? fixedY - Math.sin(newRad) * newLength / 2 : fixedY + Math.sin(newRad) * newLength / 2

      rect.set({
        left: newCX,
        top: newCY,
        width: newLength,
        scaleX: 1,
        angle: newAngle,
      })
      rect.setCoords()
      canvas?.requestRenderAll()
      return true
    },
    render: function(ctx, left, top, _styleOverride, fabricObject) {
      const size = 8
      ctx.save()
      ctx.translate(left, top)
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = (fabricObject as any).fill || '#000000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, size, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    },
  })
}

// ─── 应用线段专属控制点 ─────────────────────────────────────────────────────

function applyLineControls(rect: any) {
  rect.controls = {
    ml: createEndpointControl('left'),
    mr: createEndpointControl('right'),
    mtr: rect.controls.mtr,
  }
}

// ─── 创建直线（Rect 模拟）──────────────────────────────────────────────────

export async function createLine(config: LineElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()

  const canvas = canvasStore.canvas
  if (!canvas) {
    throw new Error('画布未初始化，无法添加直线元素')
  }

  const fill = (config as any).fill || config.stroke || '#000000'
  // 优先使用 height（decodeLine 返回的运行时属性），否则回退到 strokeWidth（配置属性）
  const strokeWidth = Math.max(1, Number((config as any).height ?? config.strokeWidth) || 2)

  const x1 = Math.round(config.x1 ?? 50)
  const y1 = Math.round(config.y1 ?? 50)
  const x2 = Math.round(config.x2 ?? 200)
  const y2 = Math.round(config.y2 ?? 50)

  const { left, top, width, height, angle } = pointsToRect(x1, y1, x2, y2, strokeWidth)

  const rect = new Rect({
    id: nanoid(),
    eleType: 'line',
    left,
    top,
    width,
    height,
    angle,
    fill,
    stroke: null as any,
    strokeWidth: 0,
    originX: 'center',
    originY: 'center',
    opacity: config.opacity ?? 1,
    visible: true,
    selectable: true,
    hasControls: true,
    hasBorders: true,
    lockScalingY: true,
    strokeUniform: true,
    strokeDashArray: (config as any).strokeDashArray ?? null,
  } as any)

  applyLineControls(rect)

  // 同步到 elementDataStore，确保设置面板能读取响应式数据
  elementDataStore.upsertElement({
    id: String((rect as any).id),
    eleType: 'line',
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    fill: rect.fill,
    opacity: rect.opacity,
  } as any)

  canvas.add(rect as any)
  layerStore.addLayer(rect as any)
  canvas.requestRenderAll()
  canvas.setActiveObject(rect as any)

  return rect as any
}

// ─── 鼠标拖拽绘制直线 ───────────────────────────────────────────────────────

export function startDrawingLine(canvas: any, initialConfig: Partial<LineElementConfig> = {}) {
  let isDrawing = false
  let currentRect: any = null
  let startX = 0
  let startY = 0

  const mouseDownHandler = (o: any) => {
    const pointer = canvas.getPointer(o.e)
    isDrawing = true
    startX = pointer.x
    startY = pointer.y

    const strokeWidth = Math.max(1, Number(initialConfig.strokeWidth) || 2)
    const fill = initialConfig.stroke || '#000000'

    currentRect = new Rect({
      id: nanoid(),
      eleType: 'line',
      left: startX,
      top: startY,
      width: 1,
      height: strokeWidth,
      angle: 0,
      fill,
      stroke: null as any,
      strokeWidth: 0,
      originX: 'center',
      originY: 'center',
      opacity: initialConfig.opacity ?? 1,
      selectable: false,
      hasControls: false,
      hasBorders: false,
      evented: false,
    } as any)

    canvas.add(currentRect)
  }

  const mouseMoveHandler = (o: any) => {
    if (!isDrawing || !currentRect) return

    const pointer = canvas.getPointer(o.e)
    let endX = pointer.x
    let endY = pointer.y

    // 水平/垂直吸附（Shift 感觉）
    const dx = Math.abs(endX - startX)
    const dy = Math.abs(endY - startY)
    const SNAP_THRESHOLD = 10

    if (Math.abs(dx - dy) >= SNAP_THRESHOLD) {
      if (dx > dy) {
        endY = startY
      } else {
        endX = startX
      }
    }

    const strokeWidth = currentRect.height
    const { left, top, width, angle } = pointsToRect(startX, startY, endX, endY, strokeWidth)
    currentRect.set({ left, top, width, angle })
    canvas.renderAll()
  }

  const mouseUpHandler = () => {
    if (!isDrawing || !currentRect) return

    isDrawing = false

    if (currentRect.width < 5) {
      canvas.remove(currentRect)
    } else {
      applyLineControls(currentRect)

      currentRect.set({
        selectable: true,
        hasControls: true,
        hasBorders: true,
        evented: true,
      })

      // 同步到 elementDataStore
      const elementDataStore = useElementDataStore()
      elementDataStore.upsertElement({
        id: String((currentRect as any).id),
        eleType: 'line',
        left: currentRect.left,
        top: currentRect.top,
        width: currentRect.width,
        height: currentRect.height,
        fill: currentRect.fill,
        opacity: currentRect.opacity,
      } as any)

      const layerStore = useLayerStore()
      layerStore.addLayer(currentRect)
      canvas.setActiveObject(currentRect)
    }

    currentRect = null
    canvas.renderAll()
  }

  canvas.off('mouse:down', mouseDownHandler)
  canvas.off('mouse:move', mouseMoveHandler)
  canvas.off('mouse:up', mouseUpHandler)

  canvas.on('mouse:down', mouseDownHandler)
  canvas.on('mouse:move', mouseMoveHandler)
  canvas.on('mouse:up', mouseUpHandler)

  return () => {
    canvas.off('mouse:down', mouseDownHandler)
    canvas.off('mouse:move', mouseMoveHandler)
    canvas.off('mouse:up', mouseUpHandler)
    if (currentRect && isDrawing) {
      canvas.remove(currentRect)
      canvas.renderAll()
    }
  }
}

// ─── 更新直线属性 ────────────────────────────────────────────────────────────

export function updateLine(element: FabricElement, patch: Partial<LineElementConfig> = {}): void {
  const rect = element as any
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas

  if (!canvas || !rect) return

  // 颜色 → fill
  if (patch.stroke !== undefined) rect.set('fill', patch.stroke)
  if (patch.opacity !== undefined) rect.set('opacity', Number(patch.opacity))

  // strokeDashArray → 暂存在 rect 上（用于 encode）
  if ((patch as any).strokeDashArray !== undefined)
    rect.set('strokeDashArray', (patch as any).strokeDashArray)

  // strokeWidth → 改变线的"粗细"即 height
  if (patch.strokeWidth !== undefined) {
    const newH = Math.max(1, Number(patch.strokeWidth))
    rect.set('height', newH)
  }

  // 端点变化 → 重新计算 Rect 几何
  const needRecompute = patch.x1 !== undefined || patch.y1 !== undefined
    || patch.x2 !== undefined || patch.y2 !== undefined

  if (needRecompute) {
    const pts = rectToPoints(rect)
    const x1 = patch.x1 !== undefined ? Math.round(Number(patch.x1)) : pts.x1
    const y1 = patch.y1 !== undefined ? Math.round(Number(patch.y1)) : pts.y1
    const x2 = patch.x2 !== undefined ? Math.round(Number(patch.x2)) : pts.x2
    const y2 = patch.y2 !== undefined ? Math.round(Number(patch.y2)) : pts.y2
    const sw = patch.strokeWidth !== undefined ? Math.max(1, Number(patch.strokeWidth)) : rect.height
    const { left, top, width, angle } = pointsToRect(x1, y1, x2, y2, sw)
    rect.set({ left, top, width, angle, scaleX: 1 })
  }

  rect.setCoords()
  canvas.requestRenderAll?.()

  // 同步更新 elementDataStore，确保设置面板响应式更新
  const id = rect.id
  if (id != null) {
    const elementDataStore = useElementDataStore()
    elementDataStore.patchElement(String(id), {
      left: rect.left as number,
      top: rect.top as number,
      width: rect.width as number,
      height: rect.height as number,
      fill: rect.fill as string,
      opacity: rect.opacity as number,
    } as any)
  }
}
