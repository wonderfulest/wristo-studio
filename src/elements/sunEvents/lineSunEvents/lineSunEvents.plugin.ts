import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { LineSunEventsElementConfig } from '@/types/elements/sunEvents'
import { createLineSunEvents, updateLineSunEvents } from './lineSunEvents.renderer'
import { decodeLineSunEvents, encodeLineSunEvents } from './lineSunEvents.encoder'
import LineSunEventsPanel from './lineSunEvents.panel.vue'

export default function registerLineSunEventsPlugin() {
  registerElement('lineSunEvents' as ElementType, {
    add: (config) => createLineSunEvents(config as LineSunEventsElementConfig),
    update: (element, patch) => updateLineSunEvents(element, patch as Partial<LineSunEventsElementConfig>),
    encode: (element) => encodeLineSunEvents(element as any),
    decode: (config) => decodeLineSunEvents(config as LineSunEventsElementConfig) as any,
  })
  registerSettings('lineSunEvents' as ElementType, LineSunEventsPanel)
}
