import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { ArcSunEventsElementConfig } from '@/types/elements/sunEvents'
import { createArcSunEvents, updateArcSunEvents } from './arcSunEvents.renderer'
import { decodeArcSunEvents, encodeArcSunEvents } from './arcSunEvents.encoder'
import ArcSunEventsPanel from './arcSunEvents.panel.vue'

export default function registerArcSunEventsPlugin() {
  registerElement('arcSunEvents' as ElementType, {
    add: (config) => createArcSunEvents(config as ArcSunEventsElementConfig),
    update: (element, patch) => updateArcSunEvents(element, patch as Partial<ArcSunEventsElementConfig>),
    encode: (element) => encodeArcSunEvents(element as any),
    decode: (config) => decodeArcSunEvents(config as ArcSunEventsElementConfig) as any,
  })
  registerSettings('arcSunEvents' as ElementType, ArcSunEventsPanel)
}
