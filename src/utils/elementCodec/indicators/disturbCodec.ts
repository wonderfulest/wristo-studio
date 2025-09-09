import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useDisturbStore } from '@/stores/elements/indicators/disturbElement'
import type { FabricElement } from '@/types/element'
import type { IndicatorElementConfig } from '@/types/elements'

const encodeDisturb: EncoderFn<'disturb'> = (element: FabricElement) => {
  const store = useDisturbStore()
  return store.encodeConfig(element)
}

const decodeDisturb: DecoderFn<'disturb'> = (config: IndicatorElementConfig) => {
  const store = useDisturbStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn<'disturb'> = (_elementType, config: IndicatorElementConfig) => {
  const store = useDisturbStore()
  return store.addElement(config)
}

export default () => {
  registerEncoder('disturb', encodeDisturb)
  registerDecoder('disturb', decodeDisturb)
  registerAddElement('disturb', addElement)
}
