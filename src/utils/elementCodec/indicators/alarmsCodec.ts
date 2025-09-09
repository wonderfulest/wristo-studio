import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useAlarmsStore } from '@/stores/elements/indicators/alarmsElement'
import type { FabricElement } from '@/types/element'
import type { IndicatorElementConfig } from '@/types/elements'

const encodeAlarms: EncoderFn<'alarms'> = (element: FabricElement) => {
  const store = useAlarmsStore()
  return store.encodeConfig(element)
}

const decodeAlarms: DecoderFn<'alarms'> = (config: IndicatorElementConfig) => {
  const store = useAlarmsStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn<'alarms'> = (_elementType, config: IndicatorElementConfig) => {
  const store = useAlarmsStore()
  return store.addElement(config)
}

export default () => {
  registerEncoder('alarms', encodeAlarms)
  registerDecoder('alarms', decodeAlarms)
  registerAddElement('alarms', addElement)
}
