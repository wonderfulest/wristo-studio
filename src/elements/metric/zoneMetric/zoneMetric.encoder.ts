import type { FabricElement } from '@/types/element'
import type { ZoneMetricElementConfig } from '@/types/elements/data'
import { encodeZoneMetricGroup } from './zoneMetric.renderer'

export function encodeZoneMetric(element: Partial<FabricElement>): ZoneMetricElementConfig {
  if (!element) throw new Error('Invalid element')
  return encodeZoneMetricGroup(element as any)
}

export function decodeZoneMetric(config: ZoneMetricElementConfig): Partial<FabricElement> {
  return {
    ...config,
    eleType: 'zoneMetric',
    designWidth: config.width,
    designHeight: config.height,
  } as any
}
