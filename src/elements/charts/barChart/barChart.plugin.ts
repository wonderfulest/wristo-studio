import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { BarChartElementConfig } from '@/types/elements/charts'
import { useBarChartStore } from '@/elements/charts/barChart/barChartElement'
import BarChartSettings from '@/elements/charts/barChart/barChartSettings.vue'

export default function registerBarChartPlugin() {
  registerElement('barChart' as ElementType, {
    add: (config) => {
      const store = useBarChartStore()
      return store.addElement(config as BarChartElementConfig)
    },
    update: (element, patch) => {
      const store = useBarChartStore()
      store.updateElement(element as any, patch as Partial<BarChartElementConfig>)
    },
    encode: (element) => {
      const store = useBarChartStore()
      return store.encodeConfig(element as any) as any
    },
    decode: (config) => {
      const store = useBarChartStore()
      return store.decodeConfig(config as any)
    },
  })

  registerSettings('barChart' as ElementType, BarChartSettings)
}
