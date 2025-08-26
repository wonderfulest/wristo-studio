import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useDateStore } from '@/stores/elements/time/dateElement'
import type { ElementConfig, FabricElement } from '@/types/element'

const encodeDate: EncoderFn = (element: FabricElement) => {
  const store = useDateStore()
  return store.encodeConfig(element)
}

const decodeDate: DecoderFn = (config: ElementConfig) => {
  const store = useDateStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: ElementConfig) => {
  const store = useDateStore()
  config.type = _elementType
  return store.addElement(config)
}

export default () => {
  registerEncoder('date', encodeDate)
  registerDecoder('date', decodeDate)
  registerAddElement('date', addElement)
}
