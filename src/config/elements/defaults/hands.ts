import type { HandElementConfig } from '@/types/elements'
import { DEFAULT_HAND_CONFIG, EDITOR_ELEMENT } from './base'

export const DEFAULT_HOUR_HAND_CONFIG: HandElementConfig & EDITOR_ELEMENT = Object.assign(
  {},
  DEFAULT_HAND_CONFIG,
  {
    icon: 'mdi:clock-time-three-outline',
    label: 'Hour',
    eleType: 'hourHand' as const,
  },
)

export const DEFAULT_MINUTE_HAND_CONFIG: HandElementConfig & EDITOR_ELEMENT = Object.assign(
  {},
  DEFAULT_HAND_CONFIG,
  {
    icon: 'mdi:clock-time-six-outline',
    label: 'Minute',
    eleType: 'minuteHand' as const,
  },
)

export const DEFAULT_SECOND_HAND_CONFIG: HandElementConfig & EDITOR_ELEMENT = Object.assign(
  {},
  DEFAULT_HAND_CONFIG,
  {
    icon: 'mdi:clock-time-nine-outline',
    label: 'Second',
    eleType: 'secondHand' as const,
  },
)
