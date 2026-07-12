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
  getObjects?(): any[]
}

type DocumentLike = Pick<Document, 'addEventListener' | 'removeEventListener'>

export interface SubDialLayoutEditorOptions {
  canvas: CanvasLike
  updateElement: (element: any, patch: { content: SubDialContentConfig }) => void | Promise<void>
  saveHistory: () => void | Promise<void>
  runWithoutRecording?: (task: () => void) => void | Promise<void>
  onError?: (error: Error) => void
  document?: DocumentLike | null
  onSelectionChange?: (key: SubDialContentKey | null, group: any | null) => void
}

type InteractionState = Record<string, unknown> & { controlsVisibility?: Record<string, boolean> }

export class SubDialLayoutEditor {
  private readonly canvas: CanvasLike
  private readonly updateElement: SubDialLayoutEditorOptions['updateElement']
  private readonly saveHistory: SubDialLayoutEditorOptions['saveHistory']
  private readonly document: DocumentLike | null
  private readonly runWithoutRecording: (task: () => void) => void | Promise<void>
  private readonly onError: (error: Error) => void
  private readonly onSelectionChange: NonNullable<SubDialLayoutEditorOptions['onSelectionChange']>
  private group: any = null
  private selectedKey: SubDialContentKey | null = null
  private outerState: InteractionState | null = null
  private childInteraction = new Map<any, { evented: unknown; selectable: unknown }>()
  private drag: { startCanvas: CanvasPoint; startLocal: CanvasPoint; itemStart: CanvasPoint; pending: CanvasPoint } | null = null
  private selectionOverlay: Rect | null = null
  private disposed = false
  private suppressSelectionExit = false
  private interactionRevision = 0
  private commitQueue: Promise<void> = Promise.resolve()
  private selectionListeners = new Set<(key: SubDialContentKey | null, group: any | null) => void>()

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
      if (!this.ensureAttached()) return
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
    canvasMutation: (event: any) => {
      if (!this.group || event?.target === this.selectionOverlay) return
      if (event?.target === this.group || !this.isAttached(this.group)) this.exit()
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
    this.onError = options.onError ?? ((error) => console.error('[SubDialLayoutEditor]', error))
    this.onSelectionChange = options.onSelectionChange ?? (() => undefined)
    this.document = options.document === undefined ? (typeof document === 'undefined' ? null : document) : options.document
    this.canvas.on('mouse:dblclick', this.handlers.doubleClick)
    this.canvas.on('mouse:down', this.handlers.mouseDown)
    this.canvas.on('mouse:move', this.handlers.mouseMove)
    this.canvas.on('mouse:up', this.handlers.mouseUp)
    this.canvas.on('selection:created', this.handlers.selection)
    this.canvas.on('selection:updated', this.handlers.selection)
    this.canvas.on('selection:cleared', this.handlers.selection)
    this.canvas.on('object:removed', this.handlers.canvasMutation)
    this.canvas.on('object:added', this.handlers.canvasMutation)
    this.canvas.on('canvas:cleared', this.handlers.canvasMutation)
    this.document?.addEventListener('keydown', this.handlers.keyDown)
  }

  enter(group: any): boolean {
    if (this.disposed || group?.eleType !== 'subDial' || !group?.__element?.children?.content || !this.isAttached(group)) return false
    if (!this.validGroupScale(group)) return false
    if (this.group === group) return true
    this.exit()
    this.interactionRevision += 1
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
    this.interactionRevision += 1
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
    this.emitSelection(null, null)
    group.setCoords?.()
    this.clearCanvasSelection()
    this.canvas.requestRenderAll?.()
  }

  isEditing(group?: any): boolean {
    return Boolean(this.group && (!group || group === this.group))
  }

  getSelectedKey(): SubDialContentKey | null { return this.selectedKey }
  getEditingGroup(): any | null { return this.group }
  subscribeSelection(listener: (key: SubDialContentKey | null, group: any | null) => void): () => void {
    this.selectionListeners.add(listener)
    try { listener(this.selectedKey, this.group) } catch { /* Match later notification isolation. */ }
    return () => this.selectionListeners.delete(listener)
  }

  select(key: SubDialContentKey): boolean {
    if (!this.ensureAttached() || !this.group || !CONTENT_KEYS.includes(key) || !this.child(key)) return false
    this.selectedKey = key
    this.emitSelection(key, this.group)
    this.updateSelectionOverlay()
    return true
  }

  beginDrag(point: CanvasPoint): boolean {
    if (!this.ensureAttached() || !this.group || !this.validGroupScale(this.group) || !this.selectedKey || this.drag || !this.finitePoint(point)) return false
    const item = this.item(this.selectedKey)
    const child = this.child(this.selectedKey)
    if (!item || !child) return false
    const itemStart = { x: Number(child.left) / this.radius(), y: Number(child.top) / this.radius() }
    this.drag = { startCanvas: { ...point }, startLocal: this.toLocal(point), itemStart, pending: { ...itemStart } }
    return true
  }

  updateDrag(point: CanvasPoint, options: { shiftKey: boolean }): boolean {
    if (!this.ensureAttached() || !this.group || !this.validGroupScale(this.group) || !this.selectedKey || !this.drag || !this.finitePoint(point)) return false
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
    return this.commitPosition(position)
  }

  async center(axis: 'horizontal' | 'vertical' | 'both'): Promise<boolean> {
    const item = this.selectedKey ? this.item(this.selectedKey) : null
    const child = this.selectedKey ? this.child(this.selectedKey) : null
    if (!item || !child || !this.ensureAttached()) return false
    const patch: Partial<CanvasPoint> = {}
    if (axis === 'horizontal' || axis === 'both') patch.x = 0
    if (axis === 'vertical' || axis === 'both') patch.y = 0
    const position = { x: patch.x ?? Number(child.left) / this.radius(), y: patch.y ?? Number(child.top) / this.radius() }
    this.previewSelected(position)
    return this.commitPosition(patch)
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
    this.canvas.off('object:removed', this.handlers.canvasMutation)
    this.canvas.off('object:added', this.handlers.canvasMutation)
    this.canvas.off('canvas:cleared', this.handlers.canvasMutation)
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
  private commitPosition(position: Partial<CanvasPoint>): Promise<boolean> {
    const group = this.group
    const key = this.selectedKey
    const revision = this.interactionRevision
    if (!group || !key) return Promise.resolve(false)
    const operation = this.commitQueue.then(async () => {
      if (!this.isAttached(group)) return false
      const content = structuredClone(group.__element.config.content) as SubDialContentConfig
      if (position.x !== undefined) content[key].x = position.x
      if (position.y !== undefined) content[key].y = position.y
      try {
        await this.updateElement(group, { content })
      } catch (error) {
        if (this.isCurrentInteraction(group, revision)) this.previewSelected()
        this.reportError(error)
        return false
      }
      if (!this.isAttached(group)) return false
      try {
        await this.saveHistory()
      } catch (error) {
        this.reportError(error)
        return false
      }
      return this.isAttached(group)
    })
    this.commitQueue = operation.then(
      () => undefined,
      () => undefined
    )
    return operation.catch((error) => {
      this.reportError(error)
      return false
    })
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
  private isAttached(group: any): boolean {
    const objects = this.canvas.getObjects?.()
    return !objects || objects.includes(group)
  }
  private ensureAttached(): boolean {
    if (!this.group) return false
    if (this.isAttached(this.group)) return true
    this.exit()
    return false
  }
  private isCurrentInteraction(group: any, revision: number): boolean {
    const current = this.group === group && this.interactionRevision === revision && !this.disposed && this.isAttached(group)
    if (!current && this.group === group && !this.isAttached(group)) this.exit()
    return current
  }
  private reportError(error: unknown): void {
    const normalized = error instanceof Error ? error : new Error(String(error))
    try {
      this.onError(normalized)
    } catch {
      // Error reporting must never reject a Fabric event handler.
    }
  }
  private emitSelection(key: SubDialContentKey | null, group: any | null): void {
    try { this.onSelectionChange(key, group) } catch { /* Selection observers cannot break Fabric cleanup. */ }
    this.selectionListeners.forEach((listener) => {
      try { listener(key, group) } catch { /* Keep notifying the remaining observers. */ }
    })
  }
}
