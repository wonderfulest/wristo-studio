import type { ElementType } from '@/types/element'

export type BluetoothElementSchema = {
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

export const bluetoothSchema: BluetoothElementSchema = {
  type: 'bluetooth',
  name: 'Bluetooth',
  icon: 'mdi:bluetooth',
  defaultConfig: {
    fontSize: 24,
    fontFamily: 'wristo-indicator',
    fill: '#ffffff',
  },
  resizable: false,
  rotatable: false,
}
