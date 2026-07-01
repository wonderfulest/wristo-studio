import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { UnitElementConfig } from '@/types/elements/data'
import { createUnit, updateUnit } from '@/elements/data/unit/unit.renderer'
import { encodeUnit, decodeUnit } from '@/elements/data/unit/unit.encoder'
import UnitPanel from '@/elements/data/unit/unit.panel.vue'

export default function registerUnitPlugin() {
  registerElement('unit' as ElementType, {
    add: (config) => {
      return createUnit(config as UnitElementConfig)
    },
    update: (element, patch) => {
      updateUnit(element as any, patch as Partial<UnitElementConfig>)
    },
    encode: (element) => {
      return encodeUnit(element as any) as any
    },
    decode: (config) => {
      return decodeUnit(config as UnitElementConfig) as any
    },
  })

  registerSettings('unit' as ElementType, UnitPanel)
}
