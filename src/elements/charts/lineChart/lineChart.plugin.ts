import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { LineChartElementConfig } from '@/types/elements/charts'
import { useLineChartStore } from '@/elements/charts/lineChart/lineChartElement'
import LineChartSettings from '@/elements/charts/lineChart/lineChartSettings.vue'

export default function registerLineChartPlugin() {
  registerElement('lineChart' as ElementType, {
    add: (_type, config) => {
      const store = useLineChartStore()
      return store.addElement(config as LineChartElementConfig)
    },
    update: (element, patch) => {
      const store = useLineChartStore()
      store.updateElement(element as any, patch as Partial<LineChartElementConfig>)
    },
    encode: (element) => {
      const store = useLineChartStore()
      return store.encodeConfig(element as any) as any
    },
    decode: (config) => {
      const store = useLineChartStore()
      return store.decodeConfig(config as any)
    },
  })

  registerSettings('lineChart' as ElementType, LineChartSettings)
}
