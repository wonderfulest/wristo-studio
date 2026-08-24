import type { ElementType } from '@/types/element'
import { createDefaultSunEventStyles } from '../common/sunEvents.model'
import { DEFAULT_SUN_EVENT_INDICATOR_SVG, DEFAULT_SUN_EVENTS_DISPLAY_MODE, DEFAULT_SUN_EVENTS_NIGHT_DOT_COLOR, DEFAULT_SUN_EVENTS_SIMPLE_COLOR } from '../common/sunEvents.defaults'

export const arcSunEventsSchema = {
  type: 'arcSunEvents' as ElementType,
  name: 'Arc Sun Events',
  icon: 'mdi:weather-sunset',
  defaultConfig: {
    left: 227, top: 227, radius: 90, strokeWidth: 10,
    startAngle: 90, angleRange: 360, counterClockwise: false,
    displayMode: DEFAULT_SUN_EVENTS_DISPLAY_MODE,
    simpleColor: DEFAULT_SUN_EVENTS_SIMPLE_COLOR,
    phases: createDefaultSunEventStyles(),
    indicator: {
      imageSvg: DEFAULT_SUN_EVENT_INDICATOR_SVG,
      imageUrl: DEFAULT_SUN_EVENT_INDICATOR_SVG,
      width: 16,
      height: 16,
      nightDotColor: DEFAULT_SUN_EVENTS_NIGHT_DOT_COLOR,
      radialOffset: 0,
      orientation: 'outward',
    },
  },
  resizable: false,
  rotatable: false,
}
