import type { FabricElement } from '@/types/element'
import type { DialElementConfig } from '../common/dial.schema'
import { encodeDial, decodeDial } from '../common/dial.encoder'

export type { DialElementConfig }

export function encodeRomans(element: FabricElement): DialElementConfig {
  return encodeDial(element, 'romans')
}

export function decodeRomans(config: DialElementConfig): Partial<FabricElement> {
  // 确保 eleType 固定为 'romans'
  const normalized: DialElementConfig = {
    ...config,
    eleType: 'romans',
  }
  return decodeDial(normalized)
}
