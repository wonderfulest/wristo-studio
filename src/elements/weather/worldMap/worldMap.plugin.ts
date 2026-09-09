import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { WorldMapElementConfig } from '@/types/elements/worldMap'
import { createWorldMap, updateWorldMap } from './worldMap.renderer'
import { decodeWorldMap, encodeWorldMap } from './worldMap.encoder'
import WorldMapPanel from './worldMap.panel.vue'
export default function registerWorldMapPlugin() {
  registerElement('worldMap', {
    add: (config) => createWorldMap(config as WorldMapElementConfig),
    update: (element, patch, context) => updateWorldMap(element, patch as Partial<WorldMapElementConfig>, context),
    encode: encodeWorldMap,
    decode: (config) => decodeWorldMap(config) as any
  })
  registerSettings('worldMap', WorldMapPanel)
}
