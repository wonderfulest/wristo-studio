import type { BatteryElementConfig } from '@/types/elements'
import type { MoveBarElementConfig } from '@/types/elements/status'
import { DEFAULT_BASE_CONFIG, EDITOR_ELEMENT } from './base'

export const DEFAULT_BATTERY_CONFIG: BatteryElementConfig & EDITOR_ELEMENT = Object.assign({
  icon: 'mdi:battery-outline',
  label: 'Battery',
  eleType: 'battery' as const,
}, DEFAULT_BASE_CONFIG, {
  width: 34,
  height: 16,
  color: '#333',
  level: 0.5,
})

export const DEFAULT_MOVE_BAR_CONFIG: MoveBarElementConfig & EDITOR_ELEMENT = Object.assign({
  icon: 'mdi:run',
  label: 'Move Bar',
  eleType: 'moveBar' as const,
}, DEFAULT_BASE_CONFIG, {
  eleType: 'moveBar',
  width: 120,
  height: 8,
  separator: 2 as any,
  color: '#FFFFFF',
  bgColor: '#555555',
  level: 0 as any,
})
