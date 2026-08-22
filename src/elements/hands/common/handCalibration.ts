import { Circle, Group, Line } from 'fabric'
import { reactive } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useHistoryStore } from '@/stores/historyStore'
import {
  getHandPivot,
  getRotatedHandCenter,
  moveHandCenterKeepingPivot,
  moveHandPivotKeepingCenter,
} from './hand.geometry'

const HAND_TYPES = new Set(['hourHand', 'minuteHand', 'secondHand', 'rotatingHand'])
const PIVOT_MARKER_TYPE = 'handCalibrationPivot'

type HandInteractionState = {
  selectable: boolean
  evented: boolean
  lockMovementX: boolean
  lockMovementY: boolean
  hasBorders: boolean
  hasControls: boolean
  borderColor: string
  hoverCursor: string
  angle: number
  geometry: {
    centerX: number
    centerY: number
    pivotOffsetX: number
    pivotOffsetY: number
  }
}

export const handCalibrationState = reactive({
  active: false,
  selectedHandId: null as string | null,
})

const priorInteraction = new Map<any, HandInteractionState>()
let pivotMarker: any = null
let attachedCanvas: any = null
let priorPreserveObjectStacking: boolean | undefined
let keyboardSequenceChanged = false

function isHand(target: any): boolean {
  return HAND_TYPES.has(String(target?.eleType ?? ''))
}

function findSelectedHand(canvas: any): any | null {
  const id = handCalibrationState.selectedHandId
  if (id) {
    const selected = (canvas.getObjects?.() || []).find((object: any) => String(object?.id) === id)
    if (isHand(selected)) return selected
  }
  const active = canvas.getActiveObject?.()
  if (isHand(active)) return active
  return (canvas.getObjects?.() || []).find(isHand) ?? null
}

function markerFor(hand: any): any {
  const pivot = getHandPivot(hand)
  const marker = new Group([
    new Circle({ radius: 18, fill: 'rgba(0,0,0,0)', originX: 'center', originY: 'center' }),
    new Line([-12, 0, 12, 0], { stroke: '#ef4444', strokeWidth: 2 }),
    new Line([0, -12, 0, 12], { stroke: '#ef4444', strokeWidth: 2 }),
  ], {
    left: pivot.x,
    top: pivot.y,
    originX: 'center',
    originY: 'center',
    selectable: true,
    evented: true,
    hasControls: false,
    hasBorders: false,
    objectCaching: false,
    excludeFromExport: true,
  } as any)
  marker.set({ eleType: PIVOT_MARKER_TYPE, handId: String(hand.id), hoverCursor: 'crosshair' })
  return marker
}

function patchHand(hand: any, geometry: ReturnType<typeof moveHandCenterKeepingPivot>): void {
  const calibrationAngle = getCalibrationAngle()
  hand.set({
    centerX: geometry.centerX,
    centerY: geometry.centerY,
    left: geometry.centerX,
    top: geometry.centerY,
    pivotOffsetX: geometry.pivotOffsetX,
    pivotOffsetY: geometry.pivotOffsetY,
    rotationCenter: { x: geometry.pivotX, y: geometry.pivotY },
    angle: calibrationAngle,
  })
  hand.setCoords?.()
  if (hand.id != null) {
    useElementDataStore().patchElement(String(hand.id), {
      centerX: geometry.centerX,
      centerY: geometry.centerY,
      left: geometry.centerX,
      top: geometry.centerY,
      pivotOffsetX: geometry.pivotOffsetX,
      pivotOffsetY: geometry.pivotOffsetY,
      rotationCenter: { x: geometry.pivotX, y: geometry.pivotY },
    } as any)
  }
}

function restoreHandGeometry(hand: any, state: HandInteractionState): void {
  const geometry = state.geometry
  const pivot = getHandPivot(geometry)
  hand.set?.({
    ...geometry,
    rotationCenter: pivot,
  })
  hand.setCoords?.()
  if (hand.id != null) {
    useElementDataStore().patchElement(String(hand.id), {
      ...geometry,
      left: geometry.centerX,
      top: geometry.centerY,
      rotationCenter: pivot,
    } as any)
  }
}

function showMarkerFor(hand: any): void {
  if (!attachedCanvas || !hand) return
  handCalibrationState.selectedHandId = String(hand.id)
  if (pivotMarker) attachedCanvas.remove?.(pivotMarker)
  pivotMarker = markerFor(hand)
  void useHistoryStore().runWithoutRecording(() => attachedCanvas.add?.(pivotMarker))
  attachedCanvas.bringObjectToFront?.(pivotMarker)
  attachedCanvas.requestRenderAll?.()
}

function restoreHandAngle(hand: any): void {
  const state = priorInteraction.get(hand)
  if (!state) return
  const position = getRotatedHandCenter(hand, state.angle)
  hand.set?.({ angle: state.angle, ...position })
  hand.setCoords?.()
}

function getCalibrationAngle(): number {
  return 0
}

function pointHandAtCalibrationAngle(hand: any): void {
  const angle = getCalibrationAngle()
  const position = getRotatedHandCenter(hand, angle)
  hand.set?.({
    angle,
    ...position,
  })
  hand.setCoords?.()
}

function applyCalibrationInteraction(): void {
  if (!attachedCanvas) return
  const selected = findSelectedHand(attachedCanvas)
  for (const hand of (attachedCanvas.getObjects?.() || []).filter(isHand)) {
    const isTarget = hand === selected
    hand.set?.({
      selectable: isTarget,
      evented: isTarget,
      lockMovementX: !isTarget,
      lockMovementY: !isTarget,
      hasControls: false,
      hasBorders: isTarget,
      borderColor: '#2563eb',
      hoverCursor: isTarget ? 'move' : 'default',
    })
    hand.setCoords?.()
  }
  pivotMarker?.set?.({ selectable: true, evented: true, hoverCursor: 'crosshair' })
  if (selected) attachedCanvas.setActiveObject?.(selected)
  if (pivotMarker) attachedCanvas.bringObjectToFront?.(pivotMarker)
  attachedCanvas.requestRenderAll?.()
}

function handleObjectMoving(event: any): void {
  const target = event?.target
  if (target?.eleType === PIVOT_MARKER_TYPE) {
    const hand = findSelectedHand(attachedCanvas)
    if (!hand || String(target.handId) !== String(hand.id)) return
    patchHand(hand, moveHandPivotKeepingCenter(hand, {
      x: Number(target.left ?? 0),
      y: Number(target.top ?? 0),
    }))
    return
  }
  const hand = target
  if (!isHand(hand) || String(hand.id) !== handCalibrationState.selectedHandId) return
  const geometry = moveHandCenterKeepingPivot(hand, {
    x: Number(hand.left ?? hand.centerX ?? 0),
    y: Number(hand.top ?? hand.centerY ?? 0),
  })
  patchHand(hand, geometry)
}

function handleObjectModified(event: any): void {
  const target = event?.target
  if (!isHand(target) && target?.eleType !== PIVOT_MARKER_TYPE) return
  useHistoryStore().saveState('hand:calibration-drag', { captureConfig: true })
}

function keyboardDelta(event: KeyboardEvent): { x: number; y: number } | null {
  const step = event.shiftKey ? 10 : 1
  if (event.key === 'ArrowLeft') return { x: -step, y: 0 }
  if (event.key === 'ArrowRight') return { x: step, y: 0 }
  if (event.key === 'ArrowUp') return { x: 0, y: -step }
  if (event.key === 'ArrowDown') return { x: 0, y: step }
  return null
}

function handleCalibrationKeyDown(event: KeyboardEvent): void {
  if (!handCalibrationState.active || !attachedCanvas) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopImmediatePropagation()
    cancelHandCalibration()
    return
  }

  const delta = keyboardDelta(event)
  if (!delta) return
  const target = attachedCanvas.getActiveObject?.()
  const isSelectedHand = isHand(target)
    && String(target.id) === handCalibrationState.selectedHandId
  const isSelectedPivot = target?.eleType === PIVOT_MARKER_TYPE
    && String(target.handId) === handCalibrationState.selectedHandId
  if (!isSelectedHand && !isSelectedPivot) return

  event.preventDefault()
  event.stopImmediatePropagation()
  target.set?.({
    left: Number(target.left ?? 0) + delta.x,
    top: Number(target.top ?? 0) + delta.y,
  })
  target.setCoords?.()
  handleObjectMoving({ target })
  keyboardSequenceChanged = true
  attachedCanvas.requestRenderAll?.()
}

function handleCalibrationKeyUp(event: KeyboardEvent): void {
  if (!keyboardDelta(event) || !keyboardSequenceChanged) return
  keyboardSequenceChanged = false
  useHistoryStore().saveState('hand:calibration-keyboard', { captureConfig: true })
}

function attachKeyboardCalibration(): void {
  if (typeof document === 'undefined') return
  document.addEventListener('keydown', handleCalibrationKeyDown, { capture: true })
  document.addEventListener('keyup', handleCalibrationKeyUp, { capture: true })
}

function detachKeyboardCalibration(): void {
  if (typeof document === 'undefined') return
  document.removeEventListener('keydown', handleCalibrationKeyDown, { capture: true })
  document.removeEventListener('keyup', handleCalibrationKeyUp, { capture: true })
}

export function syncHandCalibrationMarker(handId: string, pivot: { x: number; y: number }): void {
  if (!attachedCanvas || !pivotMarker || handCalibrationState.selectedHandId !== String(handId)) return
  pivotMarker.set?.({ left: Number(pivot.x), top: Number(pivot.y) })
  pivotMarker.setCoords?.()
  attachedCanvas.bringObjectToFront?.(pivotMarker)
  attachedCanvas.requestRenderAll?.()
}

export function startHandCalibration(handId?: string): boolean {
  const canvas = useCanvasStore().canvas as any
  if (!canvas) return false
  const hands = (canvas.getObjects?.() || []).filter(isHand)
  if (!hands.length) return false

  const requested = handId
    ? hands.find((hand: any) => String(hand.id) === String(handId))
    : findSelectedHand(canvas)
  const selected = requested ?? hands[0]
  if (!selected) return false

  if (handCalibrationState.active) {
    attachedCanvas = canvas
    const previous = findSelectedHand(canvas)
    if (previous && previous !== selected) restoreHandAngle(previous)
    showMarkerFor(selected)
    pointHandAtCalibrationAngle(selected)
    applyCalibrationInteraction()
    return true
  }

  attachedCanvas = canvas
  priorPreserveObjectStacking = Boolean(canvas.preserveObjectStacking)
  canvas.preserveObjectStacking = true
  hands.forEach((hand: any) => {
    priorInteraction.set(hand, {
      selectable: Boolean(hand.selectable),
      evented: Boolean(hand.evented),
      lockMovementX: Boolean(hand.lockMovementX),
      lockMovementY: Boolean(hand.lockMovementY),
      hasBorders: Boolean(hand.hasBorders),
      hasControls: Boolean(hand.hasControls),
      borderColor: String(hand.borderColor ?? ''),
      hoverCursor: String(hand.hoverCursor ?? ''),
      angle: Number(hand.angle ?? 0),
      geometry: {
        centerX: Number(hand.centerX ?? hand.left ?? 0),
        centerY: Number(hand.centerY ?? hand.top ?? 0),
        pivotOffsetX: Number(hand.pivotOffsetX ?? 0),
        pivotOffsetY: Number(hand.pivotOffsetY ?? 0),
      },
    })
    hand.set({
      selectable: false,
      evented: false,
      lockMovementX: true,
      lockMovementY: true,
      hasControls: false,
      hasBorders: true,
      borderColor: '#2563eb',
      hoverCursor: 'move',
    })
    hand.setCoords?.()
  })

  handCalibrationState.active = true
  if (selected) {
    showMarkerFor(selected)
    pointHandAtCalibrationAngle(selected)
  }
  applyCalibrationInteraction()
  canvas.on?.('object:moving', handleObjectMoving)
  canvas.on?.('object:modified', handleObjectModified)
  attachKeyboardCalibration()
  canvas.requestRenderAll?.()
  return true
}

export function cancelHandCalibration(): void {
  priorInteraction.forEach((state, hand) => restoreHandGeometry(hand, state))
  keyboardSequenceChanged = false
  stopHandCalibration()
}

export function stopHandCalibration(): void {
  const canvas = attachedCanvas
  detachKeyboardCalibration()
  if (keyboardSequenceChanged) {
    keyboardSequenceChanged = false
    useHistoryStore().saveState('hand:calibration-keyboard', { captureConfig: true })
  }
  if (canvas) {
    canvas.off?.('object:moving', handleObjectMoving)
    canvas.off?.('object:modified', handleObjectModified)
    priorInteraction.forEach((state, hand) => {
      hand.set?.(state)
      const position = getRotatedHandCenter(hand, state.angle)
      hand.set?.(position)
      hand.setCoords?.()
    })
    if (pivotMarker) void useHistoryStore().runWithoutRecording(() => canvas.remove?.(pivotMarker))
    if (priorPreserveObjectStacking !== undefined) {
      canvas.preserveObjectStacking = priorPreserveObjectStacking
    }
    canvas.requestRenderAll?.()
  }
  priorInteraction.clear()
  pivotMarker = null
  attachedCanvas = null
  priorPreserveObjectStacking = undefined
  handCalibrationState.active = false
  handCalibrationState.selectedHandId = null
}
