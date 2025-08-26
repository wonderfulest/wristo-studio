import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useLineElementStore } from '@/stores/elements/shapes/lineElement'

const encodeLine: EncoderFn = (element: any) => {
  const store = useLineElementStore()
  return store.encodeConfig(element)
}

const decodeLine: DecoderFn = (config: any) => {
  const store = useLineElementStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: any) => {
  const store = useLineElementStore()
  return store.addElement(config)
}

export default () => {
  registerEncoder('line', encodeLine)
  registerDecoder('line', decodeLine)
  registerAddElement('line', addElement)
}
