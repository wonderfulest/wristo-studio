import type { FabricElement } from '@/types/element'
import type { DialElementConfig } from '@/elements/dials/common/dial.schema'
import { encodeDial, decodeDial } from '@/elements/dials/common/dial.encoder'

export type { DialElementConfig }

export function encodeTick12(element: FabricElement): DialElementConfig {
  return encodeDial(element, 'tick12')
}

export function decodeTick12(config: DialElementConfig): Partial<FabricElement> {
  const normalized: DialElementConfig = { ...config, eleType: 'tick12' }
  return decodeDial(normalized)
}
