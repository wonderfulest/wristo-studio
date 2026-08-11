import type { ElementType } from '@/types/element'
import { createDefaultSunEventStyles } from '../common/sunEvents.model'
import { DEFAULT_SUN_EVENT_INDICATOR_SVG } from '../common/sunEvents.defaults'

export const arcSunEventsSchema = {
  type: 'arcSunEvents' as ElementType,
  name: 'Arc Sun Events',
  icon: 'mdi:weather-sunset',
  defaultConfig: {
    left: 227, top: 227, radius: 90, strokeWidth: 10,
    startAngle: 90, angleRange: 360, counterClockwise: false,
    phases: createDefaultSunEventStyles(),
    indicator: {
      imageSvg: DEFAULT_SUN_EVENT_INDICATOR_SVG,
      imageUrl: DEFAULT_SUN_EVENT_INDICATOR_SVG,
      width: 16,
      height: 16,
      radialOffset: 0,
      orientation: 'outward',
    },
  },
  resizable: false,
  rotatable: false,
}
