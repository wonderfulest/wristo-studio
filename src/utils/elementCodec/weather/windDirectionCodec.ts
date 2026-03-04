import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useWindDirectionStore } from '@/stores/elements/weather/windDirectionElement'
import type { FabricElement } from '@/types/element'
import type { WindDirectionElementConfig } from '@/types/elements/data'

const encodeWindDirection: EncoderFn<'windDirection'> = (element: FabricElement) => {
  const store = useWindDirectionStore()
  return store.encodeConfig(element)
}

const decodeWindDirection: DecoderFn<'windDirection'> = (config: WindDirectionElementConfig) => {
  const store = useWindDirectionStore()
  return store.decodeConfig(config)
}

const addWindDirection: AddElementFn<'windDirection'> = (_elementType: 'windDirection', config: WindDirectionElementConfig) => {
  const store = useWindDirectionStore()
  return store.addElement(config)
}

export default () => {
  registerEncoder('windDirection', encodeWindDirection)
  registerDecoder('windDirection', decodeWindDirection)
  registerAddElement('windDirection', addWindDirection)
}
