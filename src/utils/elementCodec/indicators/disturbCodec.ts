import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useDisturbStore } from '@/stores/elements/indicators/disturbElement'

const encodeDisturb: EncoderFn = (element: any) => {
  const store = useDisturbStore()
  return store.encodeConfig(element)
}

const decodeDisturb: DecoderFn = (config: any) => {
  const store = useDisturbStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: any) => {
  const store = useDisturbStore()
  store.addElement(config)
}

export default () => {
  registerEncoder('disturb', encodeDisturb)
  registerDecoder('disturb', decodeDisturb)
  registerAddElement('disturb', addElement)
}
