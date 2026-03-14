import type { FabricElement } from '@/types/element'
import type { DialElementConfig } from '@/elements/dials/tick60/tick60.encoder'
import { createDial, updateDial } from '@/elements/dials/common/dial.renderer'

export async function createTick60(config: DialElementConfig): Promise<FabricElement | undefined> {
  return createDial(config, 'tick60')
}

export async function updateTick60(
  element: FabricElement,
  patch: Partial<DialElementConfig>,
): Promise<void> {
  await updateDial(element, patch, 'tick60')
}
