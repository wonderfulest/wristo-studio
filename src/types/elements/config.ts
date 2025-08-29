
import type { AnyElementConfig } from '@/types/elements'

export interface ElementConfigs {
  dials: Record<string, AnyElementConfig>
  hands: Record<string, AnyElementConfig>
  status: Record<string, AnyElementConfig>
  time: Record<string, AnyElementConfig>
  metric: Record<string, AnyElementConfig>
  indicator: Record<string, AnyElementConfig>
  shape: Record<string, AnyElementConfig>
  goal: Record<string, AnyElementConfig>
  chart: Record<string, AnyElementConfig>
}
