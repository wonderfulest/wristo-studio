import { ref } from 'vue'
import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useNotificationStore } from '@/stores/elements/indicators/notificationElement'

// 通知编码器
const encodeNotification = (element) => {
  const notificationStore = useNotificationStore()
  return notificationStore.encodeConfig(element)
}

// 通知解码器
const decodeNotification = (encoded) => {
  const notificationStore = useNotificationStore()
  return notificationStore.decodeConfig(encoded)
}

const addElement = (config) => {
  const notificationStore = useNotificationStore()
  notificationStore.addElement(config)
}

export default () => {
  registerEncoder('notification', encodeNotification)
  registerDecoder('notification', decodeNotification)
  registerAddElement('notification', addElement)
} 