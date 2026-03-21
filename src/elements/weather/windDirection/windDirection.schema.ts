import type { ElementType } from '@/types/element'

export type WindDirectionElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    width: number
    height: number
    windDegree: number
    color: string
    imageUrl: string
    imageSvg: string
  }
  resizable: boolean
  rotatable: boolean
  disabled: boolean
}

export const windDirectionSchema: WindDirectionElementSchema = {
  type: 'windDirection',
  name: 'Wind',
  icon: 'mdi:compass-outline',
  defaultConfig: {
    width: 30,
    height: 30,
    windDegree: 0,
    color: '#FFFFFF',
    imageUrl: 'https://cdn.wristo.io/analog-assets/prod/windDirection-8bdeee7e-preview.png',
    imageSvg: 'https://cdn.wristo.io/analog-assets/prod/windDirection-8bdeee7e.svg',
  },
  resizable: true,
  rotatable: true,
  disabled: false,
}
