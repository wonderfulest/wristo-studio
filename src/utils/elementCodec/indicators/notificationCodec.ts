import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useNotificationStore } from '@/stores/elements/indicators/notificationElement'

const encodeNotification: EncoderFn = (element: any) => {
  const store = useNotificationStore()
  return store.encodeConfig(element)
}

const decodeNotification: DecoderFn = (config: any) => {
  const store = useNotificationStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: any) => {
  const store = useNotificationStore()
  store.addElement(config)
}

export default () => {
  registerEncoder('notification', encodeNotification)
  registerDecoder('notification', decodeNotification)
  registerAddElement('notification', addElement)
}
