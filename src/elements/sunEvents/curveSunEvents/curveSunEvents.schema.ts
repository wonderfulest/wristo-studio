import type { ElementType } from '@/types/element'
import { createDefaultSunEventStyles } from '../common/sunEvents.model'
import { DEFAULT_SUN_EVENT_INDICATOR_SVG } from '../common/sunEvents.defaults'

export const curveSunEventsSchema = {
  type: 'curveSunEvents' as ElementType,
  name: 'Curve Sun Events',
  icon: 'mdi:chart-bell-curve-cumulative',
  defaultConfig: {
    left: 227,
    top: 227,
    width: 180,
    height: 60,
    strokeWidth: 6,
    angle: 0,
    phases: createDefaultSunEventStyles(),
    indicator: {
      imageSvg: DEFAULT_SUN_EVENT_INDICATOR_SVG,
      imageUrl: DEFAULT_SUN_EVENT_INDICATOR_SVG,
      width: 16,
      height: 16,
      normalOffset: 0,
      orientation: 'fixed',
    },
  },
  resizable: false,
  rotatable: true,
}
