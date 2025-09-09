import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useDateStore } from '@/stores/elements/time/dateElement'
import type { FabricElement } from '@/types/element'
import type { DateElementConfig } from '@/types/elements'

const encodeDate: EncoderFn<'date'> = (element: FabricElement) => {
  const store = useDateStore()
  return store.encodeConfig(element)
}

const decodeDate: DecoderFn<'date'> = (config: DateElementConfig) => {
  const store = useDateStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn<'date'> = (_elementType, config: DateElementConfig) => {
  const store = useDateStore()
  return store.addElement(config)
}

export default () => {
  registerEncoder('date', encodeDate)
  registerDecoder('date', decodeDate)
  registerAddElement('date', addElement)
}
