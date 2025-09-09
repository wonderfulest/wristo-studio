import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useMinuteHandStore } from '@/stores/elements/hands/minuteHandElement'
import type { FabricElement } from '@/types/element'
import type { HandElementConfig } from '@/types/elements'

const encodeMinuteHand: EncoderFn<'minuteHand'> = (element: FabricElement) => {
  const store = useMinuteHandStore()
  return store.encodeConfig(element)
}

const decodeMinuteHand: DecoderFn<'minuteHand'> = (config: HandElementConfig) => {
  const store = useMinuteHandStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn<'minuteHand'> = (_elementType, config: HandElementConfig) => {
  const store = useMinuteHandStore()
  return store.addElement(config) as unknown as FabricElement
}

export default () => {
  registerEncoder('minuteHand', encodeMinuteHand)
  registerDecoder('minuteHand', decodeMinuteHand)
  registerAddElement('minuteHand', addElement)
}
