import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { DataElementConfig } from '@/types/elements/data'
import { createData, updateData } from '@/elements/data/data/data.renderer'
import { encodeData, decodeData } from '@/elements/data/data/data.encoder'
import DataPanel from '@/elements/data/data/data.panel.vue'

export default function registerDataPlugin() {
  registerElement('data' as ElementType, {
    // renderer
    add: (config) => {
      return createData(config as DataElementConfig)
    },
    update: (element, patch) => {
      updateData(element as any, patch as Partial<DataElementConfig>)
    },
    // encoder
    encode: (element) => {
      return encodeData(element as any) as any
    },
    decode: (config) => {
      return decodeData(config as DataElementConfig) as any
    },
  })

  registerSettings('data' as ElementType, DataPanel)
}
