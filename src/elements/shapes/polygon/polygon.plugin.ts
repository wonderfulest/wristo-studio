import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { PolygonElementConfig } from '@/types/elements'
import { createPolygon, updatePolygon } from './polygon.renderer'
import { encodePolygon, decodePolygon } from './polygon.encoder'
import PolygonPanel from './polygon.panel.vue'

export default function registerPolygonPlugin() {
  registerElement('polygon' as ElementType, {
    add: (config) => createPolygon(config as PolygonElementConfig),
    update: (element, patch) => updatePolygon(element as any, patch as Partial<PolygonElementConfig>),
    encode: (element) => encodePolygon(element as any) as any,
    decode: (config) => decodePolygon(config as PolygonElementConfig) as any,
  })
  registerSettings('polygon' as ElementType, PolygonPanel)
}
