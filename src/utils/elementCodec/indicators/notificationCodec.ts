import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useNotificationStore } from '@/stores/elements/indicators/notificationElement'
import type { FabricElement } from '@/types/element'
import type { IndicatorElementConfig } from '@/types/elements'

const encodeNotification: EncoderFn<'notification'> = (element: FabricElement) => {
  const store = useNotificationStore()
  return store.encodeConfig(element)
}

const decodeNotification: DecoderFn<'notification'> = (config: IndicatorElementConfig) => {
  const store = useNotificationStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn<'notification'> = (_elementType, config: IndicatorElementConfig) => {
  const store = useNotificationStore()
  return store.addElement(config)
}

export default () => {
  registerEncoder('notification', encodeNotification)
  registerDecoder('notification', decodeNotification)
  registerAddElement('notification', addElement)
}
