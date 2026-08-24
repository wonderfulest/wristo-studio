import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { CurveSunEventsElementConfig } from '@/types/elements/sunEvents'
import { createCurveSunEvents, updateCurveSunEvents } from './curveSunEvents.renderer'
import { decodeCurveSunEvents, encodeCurveSunEvents } from './curveSunEvents.encoder'
import CurveSunEventsPanel from './curveSunEvents.panel.vue'

export default function registerCurveSunEventsPlugin() {
  registerElement('curveSunEvents' as ElementType, {
    add: (config) => createCurveSunEvents(config as CurveSunEventsElementConfig),
    update: (element, patch) => updateCurveSunEvents(element, patch as Partial<CurveSunEventsElementConfig>),
    encode: (element) => encodeCurveSunEvents(element as any),
    decode: (config) => decodeCurveSunEvents(config as CurveSunEventsElementConfig) as any,
  })
  registerSettings('curveSunEvents' as ElementType, CurveSunEventsPanel)
}
