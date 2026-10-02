import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import { registerFabricProps } from '@/utils/fabricProps'
import type { ComplicationElementConfig } from '@/types/elements/complication'
import { COMPLICATION_FIELDS, createComplication, updateComplication, encodeComplication } from './complication.renderer'
import Panel from './complication.panel.vue'
export default function registerComplicationPlugin() {
  registerFabricProps(COMPLICATION_FIELDS)
  registerElement('complication', {
    add: (config) => createComplication(config as ComplicationElementConfig),
    update: (element, patch, context) => updateComplication(element, patch as Partial<ComplicationElementConfig>, context),
    encode: encodeComplication
  })
  registerSettings('complication', Panel)
}
