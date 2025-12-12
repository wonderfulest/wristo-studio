import type { BaseElementConfig } from './base'

export interface TickElementConfig extends BaseElementConfig {
  eleType: 'tick12' | 'tick60' | 'romans' | 'centerCap'
}
