import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useHourHandStore } from '@/stores/elements/hands/hourHandElement'
import type { FabricElement } from '@/types/element'
import type { HandElementConfig } from '@/types/elements'

const encodeHourHand: EncoderFn<'hourHand'> = (element: FabricElement) => {
  const store = useHourHandStore()
  return store.encodeConfig(element)
}

const decodeHourHand: DecoderFn<'hourHand'> = (config: HandElementConfig) => {
  const store = useHourHandStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn<'hourHand'> = (_elementType, config: HandElementConfig) => {
  const store = useHourHandStore()
  return store.addElement(config) as unknown as FabricElement
}

export default () => {
  registerEncoder('hourHand', encodeHourHand)
  registerDecoder('hourHand', decodeHourHand)
  registerAddElement('hourHand', addElement)
}
