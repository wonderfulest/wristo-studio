import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { SubDialElementConfig } from '@/types/elements/subDial'
import { decodeSubDial, encodeSubDial } from './subDial.encoder'
import SubDialPanel from './subDial.panel.vue'
import { createSubDial, updateSubDial } from './subDial.renderer'
import { SubDialLayoutEditor, type SubDialLayoutEditorOptions } from './SubDialLayoutEditor'
import { createOwnedDispose, SubDialEditorRegistry } from './subDial.editorRegistry'

const editorRegistry = new SubDialEditorRegistry<SubDialLayoutEditor>()

export const getActiveSubDialLayoutEditor = () => editorRegistry.current()
export const subscribeSubDialLayoutEditor = (listener: (editor: SubDialLayoutEditor | null) => void) => editorRegistry.subscribe(listener)

export function installSubDialLayoutEditor(options: SubDialLayoutEditorOptions): SubDialLayoutEditor {
  const editor = new SubDialLayoutEditor(options)
  const dispose = editor.dispose.bind(editor)
  editor.dispose = createOwnedDispose(editor, editorRegistry, dispose)
  editorRegistry.register(editor)
  return editor
}

export default function registerSubDialPlugin() {
  registerElement('subDial', {
    add: (config) => createSubDial(config as SubDialElementConfig),
    update: (element, patch) => updateSubDial(element, patch as Partial<SubDialElementConfig>),
    encode: (element) => encodeSubDial(element),
    decode: (config) => decodeSubDial(config as SubDialElementConfig)
  })
  registerSettings('subDial', SubDialPanel)
}
