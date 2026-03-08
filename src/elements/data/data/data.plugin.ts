import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useDataStore } from '@/elements/data/data/dataElement'
import type { DataElementConfig } from '@/types/elements/data'
import DataSettings from '@/elements/data/data/dataSettings.vue'

export default function registerDataPlugin() {
  registerElement('data' as ElementType, {
    add: (_type, config) => {
      const store = useDataStore()
      return store.addElement(config as DataElementConfig)
    },
    update: (element, patch) => {
      const store = useDataStore()
      store.updateElement(element as any, patch as Partial<DataElementConfig>)
    },
    encode: (element) => {
      const store = useDataStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useDataStore()
      return store.decodeConfig(config as DataElementConfig)
    },
  })

  registerSettings('data' as ElementType, DataSettings)
}
