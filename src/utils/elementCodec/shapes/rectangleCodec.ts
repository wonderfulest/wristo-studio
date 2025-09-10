import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useRectangleStore } from '@/stores/elements/shapes/rectangleElement'
import type { FabricElement } from '@/types/element'
import type { RectangleElementConfig } from '@/types/elements'

const encodeRectangle: EncoderFn<'rectangle'> = (element: FabricElement) => {
  const store = useRectangleStore()
  return store.encodeConfig(element) as RectangleElementConfig
}

const decodeRectangle: DecoderFn<'rectangle'> = (config: RectangleElementConfig) => {
  const store = useRectangleStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn<'rectangle'> = (_elementType, config: RectangleElementConfig) => {
  const store = useRectangleStore()
  return store.addElement(config) as unknown as FabricElement
}

export default () => {
  registerEncoder('rectangle', encodeRectangle)
  registerDecoder('rectangle', decodeRectangle)
  registerAddElement('rectangle', addElement)
}
