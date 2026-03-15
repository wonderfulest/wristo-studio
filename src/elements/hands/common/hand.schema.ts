import type { ElementType } from '@/types/element'
import type { HandElementConfig } from '@/types/elements'

export type HandElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: Partial<HandElementConfig>
  resizable: boolean
  rotatable: boolean
}

export const hourHandSchema: HandElementSchema = {
  type: 'hourHand' as ElementType,
  name: 'Hour',
  icon: 'mdi:clock-time-three-outline',
  defaultConfig: {
    assetId: null,
    imageUrl: null,
    rotationCenter: { x: 227, y: 227 },
    targetHeight: 180,
    moveDy: 0,
    angle: 0,
    height: 180,
  },
  resizable: false,
  rotatable: false,
}

export const minuteHandSchema: HandElementSchema = {
  type: 'minuteHand' as ElementType,
  name: 'Minute',
  icon: 'mdi:clock-time-six-outline',
  defaultConfig: {
    assetId: null,
    imageUrl: null,
    rotationCenter: { x: 227, y: 227 },
    targetHeight: 180,
    moveDy: 0,
    angle: 0,
    height: 180,
  },
  resizable: false,
  rotatable: false,
}

export const secondHandSchema: HandElementSchema = {
  type: 'secondHand' as ElementType,
  name: 'Second',
  icon: 'mdi:clock-time-nine-outline',
  defaultConfig: {
    assetId: null,
    imageUrl: null,
    rotationCenter: { x: 227, y: 227 },
    targetHeight: 180,
    moveDy: 0,
    angle: 0,
    height: 180,
  },
  resizable: false,
  rotatable: false,
}
