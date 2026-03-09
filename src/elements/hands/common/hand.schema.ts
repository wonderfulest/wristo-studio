import type { ElementType } from '@/types/element'
import type { HandElementConfig } from '@/types/elements'
import {
  DEFAULT_HOUR_HAND_CONFIG,
  DEFAULT_MINUTE_HAND_CONFIG,
  DEFAULT_SECOND_HAND_CONFIG,
} from '@/config/elements/defaults/hands'

export type HandElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: HandElementConfig
  resizable: boolean
  rotatable: boolean
}

export const hourHandSchema: HandElementSchema = {
  type: 'hourHand' as ElementType,
  name: DEFAULT_HOUR_HAND_CONFIG.label,
  icon: DEFAULT_HOUR_HAND_CONFIG.icon,
  defaultConfig: DEFAULT_HOUR_HAND_CONFIG,
  resizable: false,
  rotatable: false,
}

export const minuteHandSchema: HandElementSchema = {
  type: 'minuteHand' as ElementType,
  name: DEFAULT_MINUTE_HAND_CONFIG.label,
  icon: DEFAULT_MINUTE_HAND_CONFIG.icon,
  defaultConfig: DEFAULT_MINUTE_HAND_CONFIG,
  resizable: false,
  rotatable: false,
}

export const secondHandSchema: HandElementSchema = {
  type: 'secondHand' as ElementType,
  name: DEFAULT_SECOND_HAND_CONFIG.label,
  icon: DEFAULT_SECOND_HAND_CONFIG.icon,
  defaultConfig: DEFAULT_SECOND_HAND_CONFIG,
  resizable: false,
  rotatable: false,
}
