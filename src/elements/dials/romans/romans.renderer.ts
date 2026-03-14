import type { FabricElement } from '@/types/element'
import type { DialElementConfig } from '@/elements/dials/romans/romans.encoder'
import { createDial, updateDial } from '@/elements/dials/common/dial.renderer'

export async function createRomans(config: DialElementConfig): Promise<FabricElement | undefined> {
  return createDial(config, 'romans')
}

export async function updateRomans(
  element: FabricElement,
  patch: Partial<DialElementConfig>,
): Promise<void> {
  await updateDial(element, patch, 'romans')
}
