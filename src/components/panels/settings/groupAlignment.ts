import type { FabricElement } from '@/types/element'
import type { AlignType } from '@/engine/managers/alignManager'

type AlignSelection = (type: AlignType) => void
type PersistElementPatch = (id: string, patch: Record<string, unknown>) => void

export function applyGroupAlignment(
  elements: FabricElement[],
  type: AlignType,
  align: AlignSelection,
  persistPatch: PersistElementPatch,
): void {
  if (elements.length <= 1) return

  if (type === 'left' || type === 'center' || type === 'right') {
    elements.forEach((element) => {
      element.set('originX', type)
      const id = String((element as any).id ?? '')
      if (id) persistPatch(id, { originX: type })
    })
  }

  align(type)
}
