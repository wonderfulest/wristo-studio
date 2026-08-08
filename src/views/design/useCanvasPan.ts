import { computed, nextTick, ref, watch, type Ref } from 'vue'
import { CANVAS_LONG_PRESS_DELAY_MS, clampCanvasPanOffset, hasExceededCanvasLongPressTolerance, isPointOutsideWatchFace, type CanvasPanPoint, type CanvasPanRect } from '@/utils/canvasPan'

export const RULER_OFFSET = 40

const MINIMUM_VISIBLE_STAGE = 64
const PAN_EXCLUDED_SELECTOR = [
  '.ruler-horizontal',
  '.ruler-vertical',
  '.ruler-corner',
  '.history-controls-anchor',
  '.time-simulator-panel',
  'button',
  'input',
  'select',
  'textarea',
  'a',
  '[role="button"]',
  '[role="slider"]'
].join(',')

export interface CanvasPanCanvasAdapter {
  syncCanvasOffset?: () => void
  clearSelection?: () => void
  cancelFabricInteractionForStagePan?: (event: PointerEvent) => boolean
  finishFabricInteractionForPointerCancel?: (event: PointerEvent) => void
}

export interface UseCanvasPanOptions {
  centerAreaRef: Ref<HTMLElement | null>
  canvasStageRef: Ref<HTMLElement | null>
  canvasRef: Ref<CanvasPanCanvasAdapter | null>
  canvasRulersRef: Ref<{ refresh?: () => void } | null>
  upperCanvas: () => HTMLCanvasElement | undefined
  findCanvasTarget: (event: PointerEvent) => unknown
  isRoundWatch: () => boolean
  watchedLayout: () => readonly unknown[]
}

type CanvasPanSession = {
  pointerId: number
  startClientX: number
  startClientY: number
  startOffset: CanvasPanPoint
  stageBaseRect: CanvasPanRect
}

type CanvasPanPointerRegion = 'excluded' | 'immediate' | 'long-press'

type CanvasLongPressSession = {
  pointerId: number
  startClientX: number
  startClientY: number
  lastClientX: number
  lastClientY: number
  sourceEvent: PointerEvent
  timerId: number
}

type StartCanvasPanOptions = {
  pointerId: number
  startClientX: number
  startClientY: number
  clearSelection: boolean
}

const toCanvasPanRect = (rect: DOMRect): CanvasPanRect => ({
  left: rect.left,
  top: rect.top,
  width: rect.width,
  height: rect.height
})

export function useCanvasPan(options: UseCanvasPanOptions) {
  const panOffset = ref<CanvasPanPoint>({ x: 0, y: 0 })
  const isCanvasPanning = ref(false)
  const isCanvasPanReady = ref(false)
  let canvasPanFrame: number | null = null
  let canvasPanSession: CanvasPanSession | null = null
  let canvasLongPressSession: CanvasLongPressSession | null = null
  let canvasPanPointerOwnerId: number | null = null
  let disposed = false

  const canvasStageStyle = computed(() => ({
    transform: `translate3d(${panOffset.value.x}px, ${panOffset.value.y}px, 0)`
  }))

  const getWorkspaceRect = (): CanvasPanRect | null => {
    const rect = options.centerAreaRef.value?.getBoundingClientRect()
    if (!rect) return null
    return {
      left: rect.left + RULER_OFFSET,
      top: rect.top + RULER_OFFSET,
      width: Math.max(0, rect.width - RULER_OFFSET),
      height: Math.max(0, rect.height - RULER_OFFSET)
    }
  }

  const getStageBaseRect = (): CanvasPanRect | null => {
    const rect = options.canvasStageRef.value?.getBoundingClientRect()
    if (!rect) return null
    return {
      left: rect.left - panOffset.value.x,
      top: rect.top - panOffset.value.y,
      width: rect.width,
      height: rect.height
    }
  }

  const getCanvasPanPointerRegion = (event: PointerEvent): CanvasPanPointerRegion => {
    const target = event.target as Element | null
    if (!target || target.closest(PAN_EXCLUDED_SELECTOR)) return 'excluded'

    const faceRect = options.upperCanvas()?.getBoundingClientRect()
    if (!faceRect || faceRect.width <= 0 || faceRect.height <= 0) {
      return options.canvasStageRef.value ? 'immediate' : 'excluded'
    }

    const point = { x: event.clientX, y: event.clientY }
    const canvasRect = toCanvasPanRect(faceRect)
    const isOutsideCanvasBounds = isPointOutsideWatchFace(point, canvasRect, false)
    if (!isOutsideCanvasBounds && options.findCanvasTarget(event)) return 'long-press'

    return isPointOutsideWatchFace(point, canvasRect, options.isRoundWatch()) ? 'immediate' : 'long-press'
  }

  const scheduleCanvasViewportSync = (): void => {
    if (disposed || canvasPanFrame != null) return
    canvasPanFrame = window.requestAnimationFrame(() => {
      canvasPanFrame = null
      if (disposed) return
      options.canvasRef.value?.syncCanvasOffset?.()
      options.canvasRulersRef.value?.refresh?.()
    })
  }

  const constrainPanOffset = (stageBaseRect = getStageBaseRect()): void => {
    const workspaceRect = getWorkspaceRect()
    if (!stageBaseRect || !workspaceRect) return
    panOffset.value = clampCanvasPanOffset(panOffset.value, stageBaseRect, workspaceRect, MINIMUM_VISIBLE_STAGE)
    scheduleCanvasViewportSync()
  }

  function removeCanvasPanPointerOwnerDocumentListeners(): void {
    document.removeEventListener('pointerdown', handleCanvasPanPointerOwnerDocumentDown, true)
    document.removeEventListener('pointermove', handleCanvasPanPointerOwnerDocumentMove, true)
    document.removeEventListener('pointerup', handleCanvasPanPointerOwnerDocumentUp, true)
    document.removeEventListener('pointercancel', handleCanvasPanPointerOwnerDocumentCancel, true)
  }

  function releaseCanvasPanPointerOwner(pointerId?: number): void {
    const ownerId = canvasPanPointerOwnerId
    if (ownerId === null || (pointerId !== undefined && pointerId !== ownerId)) return
    canvasPanPointerOwnerId = null
    removeCanvasPanPointerOwnerDocumentListeners()
  }

  function claimCanvasPanPointerOwner(pointerId: number): boolean {
    if (canvasPanPointerOwnerId !== null) return false
    canvasPanPointerOwnerId = pointerId
    document.addEventListener('pointerdown', handleCanvasPanPointerOwnerDocumentDown, true)
    document.addEventListener('pointermove', handleCanvasPanPointerOwnerDocumentMove, true)
    document.addEventListener('pointerup', handleCanvasPanPointerOwnerDocumentUp, true)
    document.addEventListener('pointercancel', handleCanvasPanPointerOwnerDocumentCancel, true)
    return true
  }

  function clearCanvasLongPressSession(): CanvasLongPressSession | null {
    const session = canvasLongPressSession
    canvasLongPressSession = null
    if (session) window.clearTimeout(session.timerId)
    return session
  }

  const startCanvasPan = (startOptions: StartCanvasPanOptions): boolean => {
    if (canvasPanPointerOwnerId !== startOptions.pointerId || canvasPanSession || canvasLongPressSession) return false

    const stageBaseRect = getStageBaseRect()
    const centerArea = options.centerAreaRef.value
    if (!stageBaseRect || !centerArea || typeof centerArea.setPointerCapture !== 'function') {
      return false
    }

    try {
      centerArea.setPointerCapture(startOptions.pointerId)
    } catch {
      return false
    }

    canvasPanSession = {
      pointerId: startOptions.pointerId,
      startClientX: startOptions.startClientX,
      startClientY: startOptions.startClientY,
      startOffset: { ...panOffset.value },
      stageBaseRect
    }
    isCanvasPanning.value = true
    isCanvasPanReady.value = false
    if (startOptions.clearSelection) options.canvasRef.value?.clearSelection?.()
    return true
  }

  function activateCanvasLongPress(expectedSession: CanvasLongPressSession): void {
    if (canvasLongPressSession !== expectedSession) return
    const session = clearCanvasLongPressSession()
    if (!session) return
    const didCancelFabric = options.canvasRef.value?.cancelFabricInteractionForStagePan?.(session.sourceEvent) === true
    if (!didCancelFabric) return
    const started = startCanvasPan({
      pointerId: session.pointerId,
      startClientX: session.lastClientX,
      startClientY: session.lastClientY,
      clearSelection: false
    })
    if (!started) releaseCanvasPanPointerOwner(session.pointerId)
  }

  function handleCanvasPanPointerOwnerDocumentDown(event: PointerEvent): void {
    const ownerId = canvasPanPointerOwnerId
    if (ownerId === null || event.pointerId === ownerId) return
    event.preventDefault()
    event.stopPropagation()
  }

  function handleCanvasPanPointerOwnerDocumentMove(event: PointerEvent): void {
    const ownerId = canvasPanPointerOwnerId
    if (ownerId === null) return
    if (event.pointerId !== ownerId) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    const session = canvasLongPressSession
    if (!session || session.pointerId !== ownerId) return
    session.lastClientX = event.clientX
    session.lastClientY = event.clientY
    if (hasExceededCanvasLongPressTolerance({ x: session.startClientX, y: session.startClientY }, { x: event.clientX, y: event.clientY })) {
      clearCanvasLongPressSession()
      isCanvasPanReady.value = false
      return
    }
    event.preventDefault()
    event.stopPropagation()
  }

  function handleCanvasPanPointerOwnerDocumentUp(event: PointerEvent): void {
    const ownerId = canvasPanPointerOwnerId
    if (ownerId === null) return
    if (event.pointerId !== ownerId) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (canvasLongPressSession?.pointerId === ownerId) clearCanvasLongPressSession()
    releaseCanvasPanPointerOwner(ownerId)
  }

  function handleCanvasPanPointerOwnerDocumentCancel(event: PointerEvent): void {
    const ownerId = canvasPanPointerOwnerId
    if (ownerId === null) return
    if (event.pointerId !== ownerId) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    const pendingSession = canvasLongPressSession
    if (pendingSession?.pointerId === ownerId) {
      clearCanvasLongPressSession()
      try {
        options.canvasRef.value?.cancelFabricInteractionForStagePan?.(pendingSession.sourceEvent)
      } finally {
        releaseCanvasPanPointerOwner(ownerId)
        event.preventDefault()
        event.stopPropagation()
      }
      return
    }
    if (canvasPanSession?.pointerId === ownerId) {
      releaseCanvasPanPointerOwner(ownerId)
      return
    }
    try {
      options.canvasRef.value?.finishFabricInteractionForPointerCancel?.(event)
    } finally {
      releaseCanvasPanPointerOwner(ownerId)
      event.preventDefault()
      event.stopPropagation()
    }
  }

  const beginCanvasLongPress = (event: PointerEvent): boolean => {
    if (canvasPanPointerOwnerId !== event.pointerId || canvasLongPressSession || canvasPanSession) {
      return false
    }
    const session: CanvasLongPressSession = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      sourceEvent: event,
      timerId: 0
    }
    session.timerId = window.setTimeout(() => activateCanvasLongPress(session), CANVAS_LONG_PRESS_DELAY_MS)
    canvasLongPressSession = session
    return true
  }

  const handleCanvasPanPointerDown = (event: PointerEvent): void => {
    const ownerId = canvasPanPointerOwnerId
    if (ownerId !== null) {
      if (event.pointerId !== ownerId) {
        event.preventDefault()
        event.stopPropagation()
      }
      return
    }
    if (!event.isPrimary || event.button !== 0) return
    const region = getCanvasPanPointerRegion(event)
    if (region === 'excluded' || !claimCanvasPanPointerOwner(event.pointerId)) return
    if (region === 'long-press') {
      if (!beginCanvasLongPress(event)) releaseCanvasPanPointerOwner(event.pointerId)
      return
    }
    const started = startCanvasPan({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      clearSelection: true
    })
    if (!started) {
      releaseCanvasPanPointerOwner(event.pointerId)
      return
    }
    event.preventDefault()
    event.stopPropagation()
  }

  const handleCanvasPanPointerMove = (event: PointerEvent): void => {
    if (!canvasPanSession) {
      isCanvasPanReady.value = event.isPrimary && getCanvasPanPointerRegion(event) === 'immediate'
      return
    }
    if (event.pointerId !== canvasPanSession.pointerId) return
    const workspaceRect = getWorkspaceRect()
    if (!workspaceRect) return
    panOffset.value = clampCanvasPanOffset(
      {
        x: canvasPanSession.startOffset.x + event.clientX - canvasPanSession.startClientX,
        y: canvasPanSession.startOffset.y + event.clientY - canvasPanSession.startClientY
      },
      canvasPanSession.stageBaseRect,
      workspaceRect,
      MINIMUM_VISIBLE_STAGE
    )
    scheduleCanvasViewportSync()
    event.preventDefault()
    event.stopPropagation()
  }

  const finishCanvasPan = (pointerId?: number): void => {
    const session = canvasPanSession
    if (!session || (pointerId !== undefined && pointerId !== session.pointerId)) return
    canvasPanSession = null
    isCanvasPanning.value = false
    isCanvasPanReady.value = false
    releaseCanvasPanPointerOwner(session.pointerId)
    const centerArea = options.centerAreaRef.value
    if (centerArea?.hasPointerCapture?.(session.pointerId)) {
      centerArea.releasePointerCapture(session.pointerId)
    }
    scheduleCanvasViewportSync()
  }

  const handleCanvasPanPointerEnd = (event: PointerEvent): void => {
    const session = canvasPanSession
    if (!session || event.pointerId !== session.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    finishCanvasPan(event.pointerId)
  }

  const handleCanvasPanPointerLeave = (): void => {
    if (!canvasPanSession) isCanvasPanReady.value = false
  }

  const stopWatching = watch(
    options.watchedLayout,
    () => {
      void nextTick(() => constrainPanOffset())
    },
    { flush: 'post' }
  )

  const dispose = (): void => {
    disposed = true
    stopWatching()
    clearCanvasLongPressSession()
    finishCanvasPan()
    releaseCanvasPanPointerOwner()
    if (canvasPanFrame != null) {
      window.cancelAnimationFrame(canvasPanFrame)
      canvasPanFrame = null
    }
  }

  return {
    panOffset,
    isCanvasPanning,
    isCanvasPanReady,
    canvasStageStyle,
    constrainPanOffset,
    handleCanvasPanPointerDown,
    handleCanvasPanPointerMove,
    handleCanvasPanPointerEnd,
    handleCanvasPanPointerLeave,
    dispose
  }
}
