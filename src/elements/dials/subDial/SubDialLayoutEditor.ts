import type { SubDialContentConfig, SubDialContentKey } from '@/types/elements/subDial'
import { Rect } from 'fabric'
import { canvasToLocal, constrainContentPosition, lockDragAxis, type CanvasPoint } from './subDial.layout'

const CONTENT_KEYS: SubDialContentKey[] = ['icon', 'label', 'value', 'unit', 'goalValue', 'percentage']

type CanvasLike = {
  on(name: string, handler: (event: any) => void): void
  off(name: string, handler: (event: any) => void): void
  getScenePoint?(event: any): CanvasPoint
  getPointer?(event: any): CanvasPoint
  discardActiveObject?(): void
  requestRenderAll?(): void
  add?(object: any): void
  remove?(object: any): void
}

type DocumentLike = Pick<Document, 'addEventListener' | 'removeEventListener'>

export interface SubDialLayoutEditorOptions {
  canvas: CanvasLike
  updateElement: (element: any, patch: { content: SubDialContentConfig }) => void | Promise<void>
  saveHistory: () => void | Promise<void>
  runWithoutRecording?: (task: () => void) => void | Promise<void>
  document?: DocumentLike | null
}

type InteractionState = Record<string, unknown> & { controlsVisibility?: Record<string, boolean> }

export class SubDialLayoutEditor {
  private readonly canvas: CanvasLike
  private readonly updateElement: SubDialLayoutEditorOptions['updateElement']
  private readonly saveHistory: SubDialLayoutEditorOptions['saveHistory']
  private readonly document: DocumentLike | null
  private readonly runWithoutRecording: (task: () => void) => void | Promise<void>
  private group: any = null
  private selectedKey: SubDialContentKey | null = null
  private outerState: InteractionState | null = null
  private childInteraction = new Map<any, { evented: unknown; selectable: unknown }>()
  private drag: { startCanvas: CanvasPoint; startLocal: CanvasPoint; itemStart: CanvasPoint; pending: CanvasPoint } | null = null
  private selectionOverlay: Rect | null = null
  private disposed = false
  private suppressSelectionExit = false

  private readonly handlers = {
    doubleClick: (event: any) => {
      const target = event?.target
      if (this.group) {
        if (target !== this.group) this.exit()
      } else if (target?.eleType === 'subDial') {
        this.enter(target)
      }
    },
    mouseDown: (event: any) => {
      if (!this.group) return
      const child = [...(event?.subTargets ?? [])]
        .reverse()
        .find((candidate: any) => CONTENT_KEYS.includes(candidate?.subDialContentKey) && candidate.visible !== false && this.item(candidate.subDialContentKey)?.visible !== false)
      if (!child) return
      this.select(child.subDialContentKey)
      this.beginDrag(this.eventPoint(event))
    },
    mouseMove: (event: any) => {
      if (this.drag) this.updateDrag(this.eventPoint(event), { shiftKey: Boolean(event?.e?.shiftKey) })
    },
    mouseUp: () => {
      void this.endDrag()
    },
    selection: (event: any) => {
      if (!this.group || this.suppressSelectionExit) return
      const selection = event?.selected ?? (event?.target ? [event.target] : [])
      if (!selection.includes(this.group)) this.exit()
    },
    keyDown: (event: Event) => {
      this.handleKeyDown(event as KeyboardEvent)
    }
  }

  constructor(options: SubDialLayoutEditorOptions) {
    this.canvas = options.canvas
    this.updateElement = options.updateElement
    this.saveHistory = options.saveHistory
    this.runWithoutRecording = options.runWithoutRecording ?? ((task) => task())
    this.document = options.document === undefined ? (typeof document === 'undefined' ? null : document) : options.document
    this.canvas.on('mouse:dblclick', this.handlers.doubleClick)
    this.canvas.on('mouse:down', this.handlers.mouseDown)
    this.canvas.on('mouse:move', this.handlers.mouseMove)
    this.canvas.on('mouse:up', this.handlers.mouseUp)
    this.canvas.on('selection:created', this.handlers.selection)
    this.canvas.on('selection:updated', this.handlers.selection)
    this.canvas.on('selection:cleared', this.handlers.selection)
    this.document?.addEventListener('keydown', this.handlers.keyDown)
  }

  enter(group: any): boolean {
    if (this.disposed || group?.eleType !== 'subDial' || !group?.__element?.children?.content) return false
    if (!this.validGroupScale(group)) return false
    if (this.group === group) return true
    this.exit()
    this.group = group
    const names = ['selectable', 'evented', 'hasControls', 'hasBorders', 'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation', 'subTargetCheck']
    this.outerState = Object.fromEntries(names.map((name) => [name, group[name]]))
    if (typeof group.getControlsVisibility === 'function') this.outerState.controlsVisibility = { ...group.getControlsVisibility() }
    group.set?.({
      selectable: false,
      evented: true,
      hasControls: false,
      hasBorders: false,
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      subTargetCheck: true
    })
    for (const key of CONTENT_KEYS) {
      const child = this.child(key)
      if (!child) continue
      this.childInteraction.set(child, { evented: child.evented, selectable: child.selectable })
      child.set?.({ evented: this.item(key)?.visible !== false, selectable: false })
    }
    group.setCoords?.()
    this.clearCanvasSelection()
    this.canvas.requestRenderAll?.()
    return true
  }

  exit(): void {
    if (!this.group) return
    this.cancelDragPreview()
    this.removeSelectionOverlay()
    const group = this.group
    if (this.outerState) {
      const { controlsVisibility, ...values } = this.outerState
      group.set?.(values)
      if (controlsVisibility && typeof group.setControlsVisibility === 'function') group.setControlsVisibility(controlsVisibility)
    }
    this.childInteraction.forEach((state, child) => child.set?.(state))
    this.childInteraction.clear()
    this.selectedKey = null
    this.drag = null
    this.group = null
    this.outerState = null
    group.setCoords?.()
    this.clearCanvasSelection()
    this.canvas.requestRenderAll?.()
  }

  isEditing(group?: any): boolean {
    return Boolean(this.group && (!group || group === this.group))
  }

  select(key: SubDialContentKey): boolean {
    if (!this.group || !CONTENT_KEYS.includes(key) || !this.child(key)) return false
    this.selectedKey = key
    this.updateSelectionOverlay()
    return true
  }

  beginDrag(point: CanvasPoint): boolean {
    if (!this.group || !this.validGroupScale(this.group) || !this.selectedKey || this.drag || !this.finitePoint(point)) return false
    const item = this.item(this.selectedKey)
    if (!item) return false
    this.drag = { startCanvas: { ...point }, startLocal: this.toLocal(point), itemStart: { x: item.x, y: item.y }, pending: { x: item.x, y: item.y } }
    return true
  }

  updateDrag(point: CanvasPoint, options: { shiftKey: boolean }): boolean {
    if (!this.group || !this.validGroupScale(this.group) || !this.selectedKey || !this.drag || !this.finitePoint(point)) return false
    const locked = lockDragAxis(this.drag.startCanvas, point, options.shiftKey)
    const current = this.toLocal(locked)
    const target = { x: this.drag.itemStart.x + current.x - this.drag.startLocal.x, y: this.drag.itemStart.y + current.y - this.drag.startLocal.y }
    const child = this.child(this.selectedKey)
    const scale = this.groupScale()
    const boundingRect = child?.getBoundingRect?.()
    const bounds = {
      width: Number(boundingRect?.width ?? Number(child?.getScaledWidth?.() ?? child?.width ?? 0) * scale),
      height: Number(boundingRect?.height ?? Number(child?.getScaledHeight?.() ?? child?.height ?? 0) * scale)
    }
    const position = constrainContentPosition(target, bounds, this.radius() * scale)
    this.drag.pending = position
    child?.set?.({ left: position.x * this.radius(), top: position.y * this.radius() })
    child?.setCoords?.()
    this.updateSelectionOverlay()
    this.canvas.requestRenderAll?.()
    return true
  }

  async endDrag(): Promise<boolean> {
    if (!this.drag || !this.group || !this.selectedKey) {
      this.drag = null
      return false
    }
    const position = this.drag.pending
    this.drag = null
    await this.commitPosition(position)
    return true
  }

  async center(axis: 'horizontal' | 'vertical' | 'both'): Promise<boolean> {
    const item = this.selectedKey ? this.item(this.selectedKey) : null
    if (!item) return false
    const position = { x: axis === 'horizontal' || axis === 'both' ? 0 : item.x, y: axis === 'vertical' || axis === 'both' ? 0 : item.y }
    this.previewSelected(position)
    await this.commitPosition(position)
    return true
  }

  async resetSelectedPosition(): Promise<boolean> {
    return this.center('both')
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.group || event.key !== 'Escape') return false
    event.preventDefault?.()
    this.exit()
    return true
  }

  dispose(): void {
    if (this.disposed) return
    this.exit()
    this.disposed = true
    this.canvas.off('mouse:dblclick', this.handlers.doubleClick)
    this.canvas.off('mouse:down', this.handlers.mouseDown)
    this.canvas.off('mouse:move', this.handlers.mouseMove)
    this.canvas.off('mouse:up', this.handlers.mouseUp)
    this.canvas.off('selection:created', this.handlers.selection)
    this.canvas.off('selection:updated', this.handlers.selection)
    this.canvas.off('selection:cleared', this.handlers.selection)
    this.document?.removeEventListener('keydown', this.handlers.keyDown)
  }

  private child(key: SubDialContentKey): any {
    return this.group?.__element?.children?.content?.[key]
  }
  private item(key: SubDialContentKey): any {
    return this.group?.__element?.config?.content?.[key]
  }
  private radius(): number {
    return Number(this.group?.__element?.config?.radius ?? 1)
  }
  private groupScale(): number {
    return Number(this.group.scaleX)
  }
  private toLocal(point: CanvasPoint): CanvasPoint {
    const center = this.group.getCenterPoint?.() ?? { x: Number(this.group.left ?? 0), y: Number(this.group.top ?? 0) }
    return canvasToLocal(point, { centerX: center.x, centerY: center.y, radius: this.radius() * this.groupScale(), rotation: Number(this.group.angle ?? 0) })
  }
  private eventPoint(event: any): CanvasPoint {
    return this.canvas.getScenePoint?.(event?.e) ?? this.canvas.getPointer?.(event?.e) ?? { x: Number(event?.e?.x ?? 0), y: Number(event?.e?.y ?? 0) }
  }
  private finitePoint(point: CanvasPoint): boolean {
    return Number.isFinite(point?.x) && Number.isFinite(point?.y)
  }
  private clearCanvasSelection(): void {
    this.suppressSelectionExit = true
    try {
      this.canvas.discardActiveObject?.()
    } finally {
      this.suppressSelectionExit = false
    }
  }
  private validGroupScale(group: any): boolean {
    const scaleX = Number(group?.scaleX)
    const scaleY = Number(group?.scaleY)
    return Number.isFinite(scaleX) && Number.isFinite(scaleY) && scaleX > 0 && scaleY > 0 && Math.abs(scaleX - scaleY) <= 1e-6
  }
  private async commitPosition(position: CanvasPoint): Promise<void> {
    const group = this.group
    if (!group || !this.selectedKey) return
    const content = structuredClone(group.__element.config.content) as SubDialContentConfig
    content[this.selectedKey].x = position.x
    content[this.selectedKey].y = position.y
    await this.updateElement(group, { content })
    await this.saveHistory()
  }
  private previewSelected(position?: CanvasPoint): void {
    if (!this.selectedKey) return
    const item = this.item(this.selectedKey)
    const target = position ?? { x: item.x, y: item.y }
    this.child(this.selectedKey)?.set?.({ left: target.x * this.radius(), top: target.y * this.radius() })
    this.updateSelectionOverlay()
    this.canvas.requestRenderAll?.()
  }
  private cancelDragPreview(): void {
    if (!this.drag || !this.selectedKey) return
    this.previewSelected(this.drag.itemStart)
  }
  private updateSelectionOverlay(): void {
    const child = this.selectedKey ? this.child(this.selectedKey) : null
    if (!child || child.visible === false || this.item(this.selectedKey!)?.visible === false) {
      this.removeSelectionOverlay()
      return
    }
    const bounds = child.getBoundingRect?.()
    if (!bounds || ![bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite)) return
    if (!this.selectionOverlay) {
      this.selectionOverlay = new Rect({
        fill: 'transparent',
        stroke: '#00a8ff',
        strokeWidth: 1,
        strokeDashArray: [4, 3],
        selectable: false,
        evented: false,
        excludeFromExport: true,
        originX: 'center',
        originY: 'center'
      } as any)
      void this.runWithoutRecording(() => this.canvas.add?.(this.selectionOverlay))
    }
    this.selectionOverlay.set({ left: bounds.left + bounds.width / 2, top: bounds.top + bounds.height / 2, width: bounds.width, height: bounds.height, angle: 0 })
    this.selectionOverlay.setCoords()
    this.canvas.requestRenderAll?.()
  }
  private removeSelectionOverlay(): void {
    if (!this.selectionOverlay) return
    void this.runWithoutRecording(() => this.canvas.remove?.(this.selectionOverlay))
    this.selectionOverlay = null
  }
}
