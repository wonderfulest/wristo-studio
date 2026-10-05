import { computed, ref } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useLayoutGroupStore } from '@/stores/layoutGroupStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useDesignStore } from '@/stores/designStore'
import { useUserStore } from '@/stores/user'
import { updateElementById } from '@/engine/managers/elementManager'
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
  async function capture() {
    const projectId = String(base.id || '')
    const { width, height } = design.designSpec
    const groupedIds = new Set(groups.groups.flatMap(g => g.members.map(m => m.elementId)))
    const elements = adjustmentElements(data.elements.map(e => e.config), groupedIds, Math.max(width, height))
    const selected = [...selectedIds.value]
    if (elements.length > 200) throw Error('AI adjustments support up to 200 design elements.')
    if (selected.some(id => !elements.some(e => e.id === id))) throw Error('Select editable elements; backgrounds use their own controls.')
    const state = serializedState()
    const fingerprint = await fingerprintDesign(state)
    if (serializedState() !== state) throw Error('The design changed. Try again using the current design.')
    return { projectId, width, height, elements, selectedIds: selected, fingerprint }
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
          await updateElementById(id, patch)
        },
        save: () => { history.saveState('ai:adjust'); base.canvas?.requestRenderAll() },
      })
    } finally { applying.value = false; window.removeEventListener('keydown', blockInput, true) }
  }
  return { applying, selectedIds, capture, applyResult }
}
