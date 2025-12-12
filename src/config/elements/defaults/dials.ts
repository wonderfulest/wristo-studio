import type { TickElementConfig } from '@/types/elements'
import { DEFAULT_BASE_CONFIG, EDITOR_ELEMENT } from './base'

export const DEFAULT_TICK_CONFIG: TickElementConfig & EDITOR_ELEMENT = Object.assign(
  {},
  DEFAULT_BASE_CONFIG,
  {
    icon: 'mdi:decagram-outline',
    label: 'Tick 12',
    eleType: 'tick12' as const,
    // disabled: true,
  },
)

export const DEFAULT_TICK60_CONFIG: TickElementConfig & EDITOR_ELEMENT = Object.assign(
  {},
  DEFAULT_TICK_CONFIG,
  {
    icon: 'mdi:circle-slice-6',
    label: 'Tick 60',
    eleType: 'tick60' as const,
    // disabled: true,
  },
)

export const DEFAULT_ROMANS_CONFIG: TickElementConfig & EDITOR_ELEMENT = Object.assign(
  {},
  DEFAULT_TICK_CONFIG,
  {
    icon: 'mdi:format-letter-case',
    label: 'Romans',
    eleType: 'romans' as const,
    // disabled: true,
  },
)

export const DEFAULT_CENTER_CAP_CONFIG: TickElementConfig & EDITOR_ELEMENT = Object.assign(
  {},
  DEFAULT_TICK_CONFIG,
  {
    icon: 'mdi:circle-slice-8',
    label: 'Center Cap',
    eleType: 'centerCap' as const,
    // disabled: true,
  },
)
