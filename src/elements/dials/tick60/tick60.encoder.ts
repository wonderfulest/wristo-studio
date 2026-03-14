import type { FabricElement } from '@/types/element'
import type { DialElementConfig } from '@/elements/dials/common/dial.schema'
import { encodeDial, decodeDial } from '@/elements/dials/common/dial.encoder'

export type { DialElementConfig }

export function encodeTick60(element: FabricElement): DialElementConfig {
  return encodeDial(element, 'tick60')
}

export function decodeTick60(config: DialElementConfig): Partial<FabricElement> {
  const normalized: DialElementConfig = { ...config, eleType: 'tick60' }
  return decodeDial(normalized)
}
