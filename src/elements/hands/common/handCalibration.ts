import { Group, Line } from 'fabric'
import { reactive } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useHistoryStore } from '@/stores/historyStore'
import { getHandPivot, getRotatedHandCenter, moveHandCenterKeepingPivot } from './hand.geometry'

const HAND_TYPES = new Set(['hourHand', 'minuteHand', 'secondHand'])
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
}

export const handCalibrationState = reactive({
  active: false,
  selectedHandId: null as string | null,
})

const priorInteraction = new Map<any, HandInteractionState>()
let pivotMarker: any = null
let attachedCanvas: any = null
let priorPreserveObjectStacking: boolean | undefined

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
    new Line([-12, 0, 12, 0], { stroke: '#ef4444', strokeWidth: 2 }),
    new Line([0, -12, 0, 12], { stroke: '#ef4444', strokeWidth: 2 }),
  ], {
    left: pivot.x,
    top: pivot.y,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    objectCaching: false,
    excludeFromExport: true,
  } as any)
  marker.set({ eleType: PIVOT_MARKER_TYPE, handId: String(hand.id), hoverCursor: 'default' })
  return marker
}

function patchHand(hand: any, geometry: ReturnType<typeof moveHandCenterKeepingPivot>): void {
  hand.set({
    centerX: geometry.centerX,
    centerY: geometry.centerY,
    left: geometry.centerX,
    top: geometry.centerY,
    pivotOffsetX: geometry.pivotOffsetX,
    pivotOffsetY: geometry.pivotOffsetY,
    rotationCenter: { x: geometry.pivotX, y: geometry.pivotY },
    angle: 0,
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
      angle: 0,
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

function pointHandAtNoon(hand: any): void {
  hand.set?.({
    angle: 0,
    left: Number(hand.centerX ?? hand.left ?? 0),
    top: Number(hand.centerY ?? hand.top ?? 0),
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
  pivotMarker?.set?.({ evented: false, hoverCursor: 'default' })
  if (selected) attachedCanvas.setActiveObject?.(selected)
  if (pivotMarker) attachedCanvas.bringObjectToFront?.(pivotMarker)
  attachedCanvas.requestRenderAll?.()
}

function handleObjectMoving(event: any): void {
  const hand = event?.target
  if (!isHand(hand) || String(hand.id) !== handCalibrationState.selectedHandId) return
  const geometry = moveHandCenterKeepingPivot(hand, {
    x: Number(hand.left ?? hand.centerX ?? 0),
    y: Number(hand.top ?? hand.centerY ?? 0),
  })
  patchHand(hand, geometry)
}

function handleObjectModified(event: any): void {
  if (!isHand(event?.target)) return
  useHistoryStore().saveState('hand:calibration-drag', { captureConfig: true })
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
    pointHandAtNoon(selected)
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
    pointHandAtNoon(selected)
  }
  applyCalibrationInteraction()
  canvas.on?.('object:moving', handleObjectMoving)
  canvas.on?.('object:modified', handleObjectModified)
  canvas.requestRenderAll?.()
  return true
}

export function stopHandCalibration(): void {
  const canvas = attachedCanvas
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
