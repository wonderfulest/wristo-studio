import { Circle, Group, Line } from 'fabric'
import { reactive } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useHistoryStore } from '@/stores/historyStore'
import { getHandPivot, moveHandCenterKeepingPivot, moveHandPivotKeepingCenter } from './hand.geometry'

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
}

export const handCalibrationState = reactive({
  active: false,
  selectedHandId: null as string | null,
})

const priorInteraction = new Map<any, HandInteractionState>()
let pivotMarker: any = null
let attachedCanvas: any = null
let draggingPivot = false

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
    new Circle({ radius: 7, fill: 'rgba(255,255,255,0.92)', stroke: '#ef4444', strokeWidth: 2 }),
    new Line([-12, 0, 12, 0], { stroke: '#ef4444', strokeWidth: 2 }),
    new Line([0, -12, 0, 12], { stroke: '#ef4444', strokeWidth: 2 }),
  ], {
    left: pivot.x,
    top: pivot.y,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: true,
    hasControls: false,
    hasBorders: false,
    excludeFromExport: true,
  } as any)
  marker.set({ eleType: PIVOT_MARKER_TYPE, handId: String(hand.id), hoverCursor: 'crosshair' })
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

function handleSelection(event: any): void {
  const target = event?.selected?.find?.(isHand) ?? event?.target
  if (isHand(target)) showMarkerFor(target)
}

function handleObjectMoving(event: any): void {
  const hand = event?.target
  if (!isHand(hand) || String(hand.id) !== handCalibrationState.selectedHandId) return
  const geometry = moveHandCenterKeepingPivot(hand, {
    x: Number(hand.left ?? hand.centerX ?? 0),
    y: Number(hand.top ?? hand.centerY ?? 0),
  })
  patchHand(hand, geometry)
  pivotMarker?.set?.({ left: geometry.pivotX, top: geometry.pivotY })
  pivotMarker?.setCoords?.()
}

function handleObjectModified(event: any): void {
  if (!isHand(event?.target)) return
  useHistoryStore().saveState('hand:calibration-drag', { captureConfig: true })
}

function handleMouseDown(event: any): void {
  draggingPivot = event?.target?.eleType === PIVOT_MARKER_TYPE
}

function handleMouseMove(event: any): void {
  if (!draggingPivot || !attachedCanvas || !pivotMarker) return
  const hand = findSelectedHand(attachedCanvas)
  const pointer = attachedCanvas.getScenePoint?.(event.e) ?? attachedCanvas.getPointer?.(event.e)
  if (!hand || !pointer) return
  const geometry = moveHandPivotKeepingCenter(hand, { x: Number(pointer.x), y: Number(pointer.y) })
  patchHand(hand, geometry)
  pivotMarker.set({ left: geometry.pivotX, top: geometry.pivotY })
  pivotMarker.setCoords?.()
  attachedCanvas.requestRenderAll?.()
}

function handleMouseUp(): void {
  if (!draggingPivot) return
  draggingPivot = false
  useHistoryStore().saveState('hand:calibration-pivot', { captureConfig: true })
}

export function startHandCalibration(): boolean {
  if (handCalibrationState.active) return true
  const canvas = useCanvasStore().canvas as any
  if (!canvas) return false
  const hands = (canvas.getObjects?.() || []).filter(isHand)
  if (!hands.length) return false

  attachedCanvas = canvas
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
    })
    hand.set({
      angle: 0,
      selectable: true,
      evented: true,
      lockMovementX: false,
      lockMovementY: false,
      hasControls: false,
      hasBorders: true,
      borderColor: '#2563eb',
      hoverCursor: 'move',
    })
    hand.setCoords?.()
  })

  handCalibrationState.active = true
  const selected = findSelectedHand(canvas)
  if (selected) {
    canvas.setActiveObject?.(selected)
    showMarkerFor(selected)
  }
  canvas.on?.('selection:created', handleSelection)
  canvas.on?.('selection:updated', handleSelection)
  canvas.on?.('object:moving', handleObjectMoving)
  canvas.on?.('object:modified', handleObjectModified)
  canvas.on?.('mouse:down', handleMouseDown)
  canvas.on?.('mouse:move', handleMouseMove)
  canvas.on?.('mouse:up', handleMouseUp)
  canvas.requestRenderAll?.()
  return true
}

export function stopHandCalibration(): void {
  const canvas = attachedCanvas
  if (canvas) {
    canvas.off?.('selection:created', handleSelection)
    canvas.off?.('selection:updated', handleSelection)
    canvas.off?.('object:moving', handleObjectMoving)
    canvas.off?.('object:modified', handleObjectModified)
    canvas.off?.('mouse:down', handleMouseDown)
    canvas.off?.('mouse:move', handleMouseMove)
    canvas.off?.('mouse:up', handleMouseUp)
    priorInteraction.forEach((state, hand) => {
      hand.set?.(state)
      hand.setCoords?.()
    })
    if (pivotMarker) void useHistoryStore().runWithoutRecording(() => canvas.remove?.(pivotMarker))
    canvas.requestRenderAll?.()
  }
  priorInteraction.clear()
  pivotMarker = null
  attachedCanvas = null
  draggingPivot = false
  handCalibrationState.active = false
  handCalibrationState.selectedHandId = null
}
