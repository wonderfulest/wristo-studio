import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useTick60Store } from '@/stores/elements/dials/Tick60Element'
import type { FabricElement } from '@/types/element'
import type { TickElementConfig } from '@/types/elements'

const encodeTick60: EncoderFn<'tick60'> = (element: FabricElement) => {
  const store = useTick60Store()
  return store.encodeConfig(element as any) as TickElementConfig
}

const decodeTick60: DecoderFn<'tick60'> = (config: TickElementConfig) => {
  const store = useTick60Store()
  return store.decodeConfig(config as any)
}

const addElement: AddElementFn<'tick60'> = (_elementType, config: TickElementConfig) => {
  const store = useTick60Store()
  return store.addElement(config) as unknown as FabricElement
}

export default () => {
  registerEncoder('tick60', encodeTick60)
  registerDecoder('tick60', decodeTick60)
  registerAddElement('tick60', addElement)
}
