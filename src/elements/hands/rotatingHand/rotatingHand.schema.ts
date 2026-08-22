import type { ElementType } from '@/types/element'
import type { RotatingHandElementConfig } from '@/types/elements'

export type RotatingHandElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: Omit<RotatingHandElementConfig, 'id' | 'eleType'>
  resizable: boolean
  rotatable: boolean
}

export const rotatingHandSchema: RotatingHandElementSchema = {
  type: 'rotatingHand',
  name: 'Rotating Hand',
  icon: 'mdi:gauge-low',
  defaultConfig: {
    left: 227,
    top: 227,
    originX: 'center',
    originY: 'center',
    dialProperty: '',
    progressMode: 'range',
    previewProgress: 50,
    previewBearing: 0,
    northAngle: 270,
    startAngle: 150,
    endAngle: 390,
    counterClockwise: false,
    outOfRangeBehavior: 'clamp',
    assetId: null,
    imageUrl: null,
    centerX: 227,
    centerY: 227,
    pivotOffsetX: 0,
    pivotOffsetY: 0,
    scalePercent: 100,
  },
  resizable: false,
  rotatable: false,
}
