import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useRectangleStore } from '@/stores/elements/shapes/rectangleElement'

const encodeRectangle: EncoderFn = (element: any) => {
  const store = useRectangleStore()
  return store.encodeConfig(element)
}

const decodeRectangle: DecoderFn = (config: any) => {
  const store = useRectangleStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: any) => {
  const store = useRectangleStore()
  return store.addElement(config)
}

export default () => {
  registerEncoder('rectangle', encodeRectangle)
  registerDecoder('rectangle', decodeRectangle)
  registerAddElement('rectangle', addElement)
}
