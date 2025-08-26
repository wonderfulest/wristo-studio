import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useMinuteHandStore } from '@/stores/elements/hands/minuteHandElement'

const encodeMinuteHand: EncoderFn = (element: any) => {
  const store = useMinuteHandStore()
  return store.encodeConfig(element)
}

const decodeMinuteHand: DecoderFn = (config: any) => {
  const store = useMinuteHandStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: any) => {
  const store = useMinuteHandStore()
  store.addElement(config)
}

export default () => {
  registerEncoder('minuteHand', encodeMinuteHand)
  registerDecoder('minuteHand', decodeMinuteHand)
  registerAddElement('minuteHand', addElement)
}
