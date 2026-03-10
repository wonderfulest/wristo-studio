import type { ElementType } from '@/types/element'

export type NotificationElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    fontSize: number
    fontFamily: string
    fill: string
  }
  resizable: boolean
  rotatable: boolean
}

export const notificationSchema: NotificationElementSchema = {
  type: 'notification',
  name: 'Notification',
  icon: 'mdi:bell',
  defaultConfig: {
    fontSize: 24,
    fontFamily: 'wristo-indicator',
    fill: '#ffffff',
  },
  resizable: false,
  rotatable: false,
}
