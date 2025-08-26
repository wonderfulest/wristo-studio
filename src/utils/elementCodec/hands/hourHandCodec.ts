import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useHourHandStore } from '@/stores/elements/hands/hourHandElement'
import type { ElementConfig, FabricElement } from '@/types/element'
import type { ElementType } from '@/types/element'

const encodeHourHand: EncoderFn = (element: FabricElement) => {
  const store = useHourHandStore()
  return store.encodeConfig(element)
}

const decodeHourHand: DecoderFn = (config: ElementConfig) => {
  const store = useHourHandStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType: ElementType, config: ElementConfig) => {
  const store = useHourHandStore()
  store.addElement(config)
  return {} as FabricElement
}

export default () => {
  registerEncoder('hourHand', encodeHourHand)
  registerDecoder('hourHand', decodeHourHand)
  registerAddElement('hourHand', addElement)
}
