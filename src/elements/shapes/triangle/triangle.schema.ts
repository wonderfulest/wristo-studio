import type { ElementType } from '@/types/element'

export const triangleSchema = {
  type: 'triangle' as ElementType,
  name: 'Triangle',
  icon: 'mdi:triangle-outline',
  defaultConfig: {
    width: 100,
    height: 100,
    rotation: 0,
    fill: 'transparent',
    stroke: '#FFFFFF',
    strokeWidth: 2,
    opacity: 1,
    gradientEnabled: false,
    gradientStartColor: '#FFFFFF',
    gradientEndColor: '#FFFFFF',
    gradientDirection: 'leftToRight' as const,
  },
  resizable: true,
  rotatable: true,
}
