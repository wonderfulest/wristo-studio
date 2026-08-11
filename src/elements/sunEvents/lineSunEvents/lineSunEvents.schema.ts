import type { ElementType } from '@/types/element'
import { createDefaultSunEventStyles } from '../common/sunEvents.model'
import { DEFAULT_SUN_EVENT_INDICATOR_SVG } from '../common/sunEvents.defaults'

export const lineSunEventsSchema = {
  type: 'lineSunEvents' as ElementType,
  name: 'Line Sun Events',
  icon: 'mdi:weather-sunset-up',
  defaultConfig: {
    left: 227, top: 227, length: 160, strokeWidth: 10, angle: 0,
    phases: createDefaultSunEventStyles(),
    indicator: {
      imageSvg: DEFAULT_SUN_EVENT_INDICATOR_SVG,
      imageUrl: DEFAULT_SUN_EVENT_INDICATOR_SVG,
      width: 16,
      height: 16,
      offset: 0,
    },
  },
  resizable: false,
  rotatable: true,
}
