import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { SubDialElementConfig } from '@/types/elements/subDial'
import { decodeSubDial, encodeSubDial } from './subDial.encoder'
import SubDialPanel from './subDial.panel.vue'
import { createSubDial, updateSubDial } from './subDial.renderer'
import { SubDialLayoutEditor, type SubDialLayoutEditorOptions } from './SubDialLayoutEditor'

export function installSubDialLayoutEditor(options: SubDialLayoutEditorOptions): SubDialLayoutEditor {
  return new SubDialLayoutEditor(options)
}

export default function registerSubDialPlugin() {
  registerElement('subDial', {
    add: (config) => createSubDial(config as SubDialElementConfig),
    update: (element, patch) => updateSubDial(element, patch as Partial<SubDialElementConfig>),
    encode: (element) => encodeSubDial(element),
    decode: (config) => decodeSubDial(config as SubDialElementConfig),
  })
  registerSettings('subDial', SubDialPanel)
}
