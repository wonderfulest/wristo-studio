import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useCenterCapStore } from '@/stores/elements/dials/CenterCapElement'
import type { FabricElement } from '@/types/element'
import type { TickElementConfig } from '@/types/elements'

const encodeCenterCap: EncoderFn<'centerCap'> = (element: FabricElement) => {
  const store = useCenterCapStore()
  return store.encodeConfig(element as any) as TickElementConfig
}

const decodeCenterCap: DecoderFn<'centerCap'> = (config: TickElementConfig) => {
  const store = useCenterCapStore()
  return store.decodeConfig(config as any)
}

const addElement: AddElementFn<'centerCap'> = (_elementType, config: TickElementConfig) => {
  const store = useCenterCapStore()
  return store.addElement(config as any) as unknown as FabricElement
}

export default () => {
  registerEncoder('centerCap', encodeCenterCap)
  registerDecoder('centerCap', decodeCenterCap)
  registerAddElement('centerCap', addElement)
}
