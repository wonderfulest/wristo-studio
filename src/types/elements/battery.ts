import type { BaseElementConfig } from './base'

// Simple battery config used by config/elements.ts defaults
export interface BatteryElementConfig extends BaseElementConfig {
  eleType: 'battery'
  width: number
  height: number
  color: string
  level: number
}
