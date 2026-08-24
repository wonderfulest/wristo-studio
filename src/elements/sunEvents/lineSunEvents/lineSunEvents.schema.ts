import type { ElementType } from '@/types/element'
import { createDefaultSunEventStyles } from '../common/sunEvents.model'
import { DEFAULT_SUN_EVENT_INDICATOR_SVG, DEFAULT_SUN_EVENTS_DISPLAY_MODE, DEFAULT_SUN_EVENTS_NIGHT_DOT_COLOR, DEFAULT_SUN_EVENTS_SIMPLE_COLOR } from '../common/sunEvents.defaults'

export const lineSunEventsSchema = {
  type: 'lineSunEvents' as ElementType,
  name: 'Line Sun Events',
  icon: 'mdi:weather-sunset-up',
  defaultConfig: {
    left: 227, top: 227, length: 160, strokeWidth: 10, angle: 0,
    displayMode: DEFAULT_SUN_EVENTS_DISPLAY_MODE,
    simpleColor: DEFAULT_SUN_EVENTS_SIMPLE_COLOR,
    phases: createDefaultSunEventStyles(),
    indicator: {
      imageSvg: DEFAULT_SUN_EVENT_INDICATOR_SVG,
      imageUrl: DEFAULT_SUN_EVENT_INDICATOR_SVG,
      width: 16,
      height: 16,
      nightDotColor: DEFAULT_SUN_EVENTS_NIGHT_DOT_COLOR,
      offset: 0,
    },
  },
  resizable: false,
  rotatable: true,
}
