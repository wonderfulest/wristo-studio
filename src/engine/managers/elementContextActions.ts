import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useHistoryStore } from '@/stores/historyStore'
import { copySelection, pasteSelection, hasClipboardSelection } from './clipboardManager'
import { removeElement } from './elementManager'
import { bringForward, bringToFront, sendBackward, sendToBack } from './layerManager'
import {
  getElementActionAvailability,
  isMutableContextElement,
  roundElementPosition,
  toggleElementFlip,
  type ContextElement,
  type ElementActionAvailability,
} from './elementContextActionModel'

function activeElements(): ContextElement[] {
  return (useCanvasStore().canvas?.getActiveObjects?.() || []) as ContextElement[]
}

function saveElementPatches(patches: Array<{ element: ContextElement; patch: Record<string, unknown> }>): void {
  const dataStore = useElementDataStore()
  patches.forEach(({ element, patch }) => {
    if (element.id != null) dataStore.patchElement(String(element.id), patch as any)
  })
  useCanvasStore().canvas?.requestRenderAll?.()
}

export function getCurrentElementActionAvailability(): ElementActionAvailability {
  const canvas = useCanvasStore().canvas
  return getElementActionAvailability(
    activeElements(),
    (canvas?.getObjects?.() || []) as ContextElement[],
    hasClipboardSelection(),
  )
}

export function copySelectedElements(): void {
  copySelection()
}

export function pasteElements(): void {
  pasteSelection()
}

export function duplicateSelectedElements(): void {
  copySelection()
  pasteSelection()
}

export async function deleteSelectedElements(): Promise<void> {
  const selected = activeElements().filter(isMutableContextElement)
  if (!selected.length) return
  const history = useHistoryStore()
  await history.runWithoutRecording(async () => selected.forEach((element) => removeElement(element as any)))
  useCanvasStore().canvas?.discardActiveObject?.()
  history.saveState('delete:selection', { captureConfig: true })
}

export function moveSelectedElements(action: 'forward' | 'backward' | 'front' | 'back'): void {
  const canvas = useCanvasStore().canvas
  if (!canvas) return
  const objects = canvas.getObjects() as ContextElement[]
  const selected = activeElements().filter(isMutableContextElement)
  const ascending = [...selected].sort((a, b) => objects.indexOf(a) - objects.indexOf(b))
  const ordered = action === 'forward' || action === 'back' ? [...ascending].reverse() : ascending
  const move = action === 'forward' ? bringForward : action === 'backward' ? sendBackward : action === 'front' ? bringToFront : sendToBack
  let changed = false
  ordered.forEach((element) => {
    if (element.id != null && move(String(element.id))) changed = true
  })
  if (changed) useHistoryStore().saveState(`layer:${action}`, { captureConfig: true })
}

export function flipSelectedElements(axis: 'horizontal' | 'vertical'): void {
  const selected = activeElements().filter(isMutableContextElement)
  if (!selected.length) return
  saveElementPatches(selected.map((element) => ({ element, patch: toggleElementFlip(element, axis) })))
  useHistoryStore().saveState(`flip:${axis}`, { captureConfig: true })
}

export function roundSelectedElementPositions(): void {
  const selected = activeElements().filter(isMutableContextElement)
  const patches = selected
    .filter((element) => Math.round(Number(element.left ?? 0)) !== Number(element.left ?? 0) || Math.round(Number(element.top ?? 0)) !== Number(element.top ?? 0))
    .map((element) => ({ element, patch: roundElementPosition(element) }))
  if (!patches.length) return
  saveElementPatches(patches)
  useHistoryStore().saveState('round:position', { captureConfig: true })
}
