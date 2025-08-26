import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useLabelStore } from '@/stores/elements/data/labelElement'

const encodeLabel: EncoderFn = (element: any) => {
  const store = useLabelStore()
  return store.encodeConfig(element)
}

const decodeLabel: DecoderFn = (config: any) => {
  const store = useLabelStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: any) => {
  const store = useLabelStore()
  store.addElement(config)
}

export default () => {
  registerEncoder('label', encodeLabel)
  registerDecoder('label', decodeLabel)
  registerAddElement('label', addElement)
}
