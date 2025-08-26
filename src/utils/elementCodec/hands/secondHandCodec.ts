import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useSecondHandStore } from '@/stores/elements/hands/secondHandElement'

const encodeSecondHand: EncoderFn = (element: any) => {
  const store = useSecondHandStore()
  return store.encodeConfig(element)
}

const decodeSecondHand: DecoderFn = (config: any) => {
  const store = useSecondHandStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: any) => {
  const store = useSecondHandStore()
  store.addElement(config)
}

export default () => {
  registerEncoder('secondHand', encodeSecondHand)
  registerDecoder('secondHand', decodeSecondHand)
  registerAddElement('secondHand', addElement)
}
