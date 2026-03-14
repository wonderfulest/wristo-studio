import type { FabricElement } from '@/types/element'
import type { DialElementConfig } from '@/elements/dials/tick12/tick12.encoder'
import { createDial, updateDial } from '@/elements/dials/common/dial.renderer'

export async function createTick12(config: DialElementConfig): Promise<FabricElement | undefined> {
  return createDial(config, 'tick12')
}

export async function updateTick12(
  element: FabricElement,
  patch: Partial<DialElementConfig>,
): Promise<void> {
  await updateDial(element, patch, 'tick12')
}
