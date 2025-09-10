import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useSecondHandStore } from '@/stores/elements/hands/secondHandElement'
import type { FabricElement } from '@/types/element'
import type { HandElementConfig } from '@/types/elements'

const encodeSecondHand: EncoderFn<'secondHand'> = (element: FabricElement) => {
  const store = useSecondHandStore()
  return store.encodeConfig(element)
}

const decodeSecondHand: DecoderFn<'secondHand'> = (config: HandElementConfig) => {
  const store = useSecondHandStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn<'secondHand'> = (_elementType, config: HandElementConfig) => {
  const store = useSecondHandStore()
  return store.addElement(config) as unknown as FabricElement
}

export default () => {
  registerEncoder('secondHand', encodeSecondHand)
  registerDecoder('secondHand', decodeSecondHand)
  registerAddElement('secondHand', addElement)
}
