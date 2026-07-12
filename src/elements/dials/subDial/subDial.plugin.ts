import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { SubDialElementConfig } from '@/types/elements/subDial'
import { decodeSubDial, encodeSubDial } from './subDial.encoder'
import SubDialPanel from './subDial.panel.vue'
import { createSubDial, updateSubDial } from './subDial.renderer'
import { SubDialLayoutEditor, type SubDialLayoutEditorOptions } from './SubDialLayoutEditor'

let activeLayoutEditor: SubDialLayoutEditor | null = null
const listeners = new Set<(editor: SubDialLayoutEditor | null) => void>()

export const getActiveSubDialLayoutEditor = () => activeLayoutEditor
export const subscribeSubDialLayoutEditor = (listener: (editor: SubDialLayoutEditor | null) => void) => {
  listeners.add(listener)
  listener(activeLayoutEditor)
  return () => listeners.delete(listener)
}

export function installSubDialLayoutEditor(options: SubDialLayoutEditorOptions): SubDialLayoutEditor {
  const editor = new SubDialLayoutEditor(options)
  activeLayoutEditor = editor
  listeners.forEach((listener) => listener(editor))
  const dispose = editor.dispose.bind(editor)
  editor.dispose = () => {
    dispose()
    if (activeLayoutEditor === editor) {
      activeLayoutEditor = null
      listeners.forEach((listener) => listener(null))
    }
  }
  return editor
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
