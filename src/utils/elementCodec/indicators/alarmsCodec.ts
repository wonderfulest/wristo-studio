import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useAlarmsStore } from '@/stores/elements/indicators/alarmsElement'

const encodeAlarms: EncoderFn = (element: any) => {
  const store = useAlarmsStore()
  return store.encodeConfig(element)
}

const decodeAlarms: DecoderFn = (config: any) => {
  const store = useAlarmsStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: any) => {
  const store = useAlarmsStore()
  store.addElement(config)
}

export default () => {
  registerEncoder('alarms', encodeAlarms)
  registerDecoder('alarms', decodeAlarms)
  registerAddElement('alarms', addElement)
}
