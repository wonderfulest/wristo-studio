import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useMoveBarStore } from '@/stores/elements/status/moveBarElement'

const encodeMoveBar: EncoderFn = (element: any) => {
  const store = useMoveBarStore()
  return store.encodeConfig(element)
}

const decodeMoveBar: DecoderFn = (config: any) => {
  const store = useMoveBarStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: any) => {
  const store = useMoveBarStore()
  store.addElement(config)
}

export default () => {
  registerEncoder('moveBar', encodeMoveBar)
  registerDecoder('moveBar', decodeMoveBar)
  registerAddElement('moveBar', addElement)
}
