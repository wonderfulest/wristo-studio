import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useTick12Store } from '@/stores/elements/dials/Tick12Element'
import type { FabricElement } from '@/types/element'
import type { TickElementConfig } from '@/types/elements'

const encodeTick12: EncoderFn<'tick12'> = (element: FabricElement) => {
  const tick12Store = useTick12Store()
  return tick12Store.encodeConfig(element as any) as TickElementConfig
}

const decodeTick12: DecoderFn<'tick12'> = (encoded: TickElementConfig) => {
  const tick12Store = useTick12Store()
  return tick12Store.decodeConfig(encoded as any)
}

const addElement: AddElementFn<'tick12'> = (_elementType, config: TickElementConfig) => {
  const tick12Store = useTick12Store()
  return tick12Store.addElement(config) as unknown as FabricElement
}

export default () => {
  registerEncoder('tick12', encodeTick12)
  registerDecoder('tick12', decodeTick12)
  registerAddElement('tick12', addElement)
}
