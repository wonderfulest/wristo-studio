import type { ElementType } from '@/types/element'

export type WeatherElementSchema = {
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

export const weatherSchema: WeatherElementSchema = {
  type: 'weather',
  name: 'Weather',
  icon: 'mdi:weather-partly-cloudy',
  defaultConfig: {
    fontSize: 36,
    fontFamily: 'wristo-icon',
    fill: '#FFFFFF',
  },
  resizable: true,
  rotatable: false,
}
