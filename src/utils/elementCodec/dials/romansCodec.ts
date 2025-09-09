import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useRomansStore } from '@/stores/elements/dials/RomansElement'
import type { FabricElement } from '@/types/element'
import type { TickElementConfig } from '@/types/elements'

const encodeRomans: EncoderFn<'romans'> = (element: FabricElement) => {
  const store = useRomansStore()
  return store.encodeConfig(element) as TickElementConfig
}

const decodeRomans: DecoderFn<'romans'> = (config: TickElementConfig) => {
  const store = useRomansStore()
  return store.decodeConfig(config as any)
}

const addElement: AddElementFn<'romans'> = (_elementType, config: TickElementConfig) => {
  const store = useRomansStore()
  return store.addElement(config) as unknown as FabricElement
}

export default () => {
  registerEncoder('romans', encodeRomans)
  registerDecoder('romans', decodeRomans)
  registerAddElement('romans', addElement)
}
