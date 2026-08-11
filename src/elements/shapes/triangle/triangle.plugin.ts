import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { TriangleElementConfig } from '@/types/elements'
import { createTriangle, updateTriangle } from './triangle.renderer'
import { decodeTriangle, encodeTriangle } from './triangle.encoder'
import TrianglePanel from './triangle.panel.vue'

export default function registerTrianglePlugin() {
  registerElement('triangle' as ElementType, {
    add: (config) => createTriangle(config as TriangleElementConfig),
    update: (element, patch, context) => updateTriangle(element as any, patch as Partial<TriangleElementConfig>, context),
    encode: (element) => encodeTriangle(element as any) as any,
    decode: (config) => decodeTriangle(config as TriangleElementConfig) as any,
  })
  registerSettings('triangle' as ElementType, TrianglePanel)
}
