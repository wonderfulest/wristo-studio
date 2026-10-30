import { encodeElementByRegistry } from '@/engine/registry/elementRegistry'
import { computed, ref } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useLayoutGroupStore } from '@/stores/layoutGroupStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useDesignStore } from '@/stores/designStore'
import { useUserStore } from '@/stores/user'
import { addElement, removeElement, getElementById, updateElementById } from '@/engine/managers/elementManager'
import { additionConfig, weatherVisibility } from './aiAdjustmentOperations'
import { useLayerStore } from '@/stores/layerStore'
import { adjustmentElements, applyAdjustment, fingerprintDesign } from './aiAdjustmentPatch'
import type { AdjustmentRequest, AdjustmentResult } from '@/api/wristo/aiAdjustment'

export function useAiAdjustmentEditor() {
  const base = useBaseStore(), canvas = useCanvasStore(), data = useElementDataStore(), groups = useLayoutGroupStore()
  const design = useDesignStore(), user = useUserStore(), history = useHistoryStore()
  const applying = ref(false)
  const selectedIds = computed(() => Array.from(new Set([
    ...canvas.activeIds,
    ...groups.groups.filter(g => canvas.activeLayoutGroupIds.includes(g.id)).flatMap(g => g.members.map(m => m.elementId)),
  ])))
  function serializedState() {
    if (base.designLoading || !base.canvas || !base.id || history.isRestoring) throw Error('Wait for the design to finish loading.')
    // Fabric stores multi-selection members in selection-local coordinates. Normalize before hashing.
    base.canvas.discardActiveObject()
    const config = base.generateConfig({ validateBindings: false })
    if (!config) throw Error('Unable to read the current design.')
    return JSON.stringify({ projectId: base.id, owner: user.userInfo?.id, width: design.designSpec.width, height: design.designSpec.height, config })
  }
  async function currentFingerprint() {
    const state = serializedState()
    const value = await fingerprintDesign(state)
    if (serializedState() !== state) throw Error('The design changed. Try again using the current design.')
    return value
  }
  async function capture(scope: 'all' | 'selected' = 'all') {
    const projectId = String(base.id || '')
    const { width, height } = design.designSpec
    const selected = scope === 'selected' ? [...selectedIds.value] : []
    if (scope === 'selected' && !selected.length) throw Error('Select an element or switch to the whole watch face.')
    const state = serializedState()
    const groupedIds = new Set(groups.groups.flatMap(g => g.members.map(m => m.elementId)))
    const configs = base.canvas?.getObjects().map(e => encodeElementByRegistry(e as any)).filter((e): e is NonNullable<typeof e> => !!e) ?? []
    const elements = adjustmentElements(configs, groupedIds, Math.max(width, height))
    if (elements.length > 200) throw Error('AI adjustments support up to 200 design elements.')
    if (selected.some(id => !elements.some(e => e.id === id))) throw Error('Select editable elements; backgrounds use their own controls.')
    const referenceImage = await base.captureScreenshot({ includeDeviceFrame: false })
    if (!referenceImage) throw Error('Unable to capture the current design. Please try again before sending an adjustment.')
    const fingerprint = await fingerprintDesign(state)
    if (serializedState() !== state) throw Error('The design changed. Try again using the current design.')
    return { projectId, width, height, elements, selectedIds: selected, fingerprint, referenceImage }
  }
  async function applyResult(snapshot: { fingerprint: string; request: AdjustmentRequest }, result: AdjustmentResult) {
    if (applying.value || snapshot.request.projectId !== String(base.id)) throw Error('Open the original design to apply this adjustment.')
    applying.value = true
    const blockInput = (event: KeyboardEvent) => { event.preventDefault(); event.stopImmediatePropagation() }
    window.addEventListener('keydown', blockInput, true)
    try {
      await applyAdjustment(snapshot.fingerprint, snapshot.request.elements, snapshot.request.selectedIds, result, {
        currentFingerprint,
        atomic: task => history.runAtomicMutation('ai:adjust', task),
        update: async (id, patch) => {
          if (!base.canvas?.getObjects().some((e: any) => String(e.id) === id)) throw Error('An adjusted element is no longer available.')
          base.canvas.discardActiveObject()
          const element = getElementById(id)
          const { angle, ...rest } = patch
          let nativePatch: Record<string, string | number> = element?.eleType === 'triangle' && angle !== undefined ? { ...rest, rotation: angle } : patch
          if (element?.eleType === 'line' && ['x1', 'y1', 'x2', 'y2'].some(key => key in patch)) {
            const current = encodeElementByRegistry(element) as any
            const points = { ...current, ...patch }
            nativePatch = { ...patch, left: (points.x1 + points.x2) / 2, top: (points.y1 + points.y2) / 2 }
          }
          await updateElementById(id, nativePatch)
        },
        add: async addition => {
          const collision = data.getElementConfig(addition.id) || base.canvas?.getObjects().some(e => String((e as any).id) === addition.id)
          const config = additionConfig(collision ? { ...addition, id: crypto.randomUUID() } : addition)
          const element = await addElement(config.eleType as any, config)
          if (!element) throw Error('Unable to create a new element.')
          // Renderers store their own geometry; shared metadata must also survive save/reopen.
          const encoded = encodeElementByRegistry(element)
          if (!encoded) throw Error('Unable to save a new element.')
          data.upsertElement(encoded)
          // Keep added artwork beneath existing readings, preserving the AI additions' order.
          const objects = base.canvas!.getObjects()
          const readingTypes = new Set(['time', 'date', 'text', 'data', 'label', 'battery', 'rotatingHand', 'hourHand', 'minuteHand', 'secondHand'])
          const existingIds = new Set(snapshot.request.elements.map(e => e.id))
          const readingIndex = objects.findIndex(e => existingIds.has(String((e as any).id)) && readingTypes.has(String((e as any).eleType)))
          if (readingIndex >= 0) base.canvas!.moveObjectTo(element, readingIndex)
          const order = new Map(base.canvas!.getObjects().map((e, index) => [String((e as any).id), index]))
          const layers = useLayerStore()
          layers.setLayers([...layers.layers].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)))
          base.canvas?.discardActiveObject()
          useLayerStore().applyPreviewVisibility()
        },
        remove: async id => {
          const element = getElementById(id)
          if (!element) throw Error('An element to remove is no longer available.')
          base.canvas?.discardActiveObject()
          removeElement(element)
        },
        weather: async (id, weather) => {
          if (!getElementById(id)) throw Error('A weather element is no longer available.')
          await updateElementById(id, { visibility: weatherVisibility(weather) })
        },
        save: () => { history.saveState('ai:adjust'); base.canvas?.requestRenderAll() },
      })
    } finally { applying.value = false; window.removeEventListener('keydown', blockInput, true) }
  }
  return { applying, selectedIds, capture, applyResult }
}
