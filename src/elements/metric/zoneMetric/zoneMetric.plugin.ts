import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { ZoneMetricElementConfig } from '@/types/elements/data'
import { createZoneMetric, updateZoneMetric } from './zoneMetric.renderer'
import { decodeZoneMetric, encodeZoneMetric } from './zoneMetric.encoder'
import ZoneMetricSettings from './zoneMetric.panel.vue'

export default function registerZoneMetricPlugin() {
  registerElement('zoneMetric' as ElementType, {
    add: (config) => createZoneMetric(config as ZoneMetricElementConfig),
    update: (element, patch) => updateZoneMetric(element as any, patch as Partial<ZoneMetricElementConfig>),
    encode: (element) => encodeZoneMetric(element as any),
    decode: (config) => decodeZoneMetric(config as ZoneMetricElementConfig),
  })

  registerSettings('zoneMetric' as ElementType, ZoneMetricSettings)
}
