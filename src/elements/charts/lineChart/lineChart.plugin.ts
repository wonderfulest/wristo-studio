import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { LineChartElementConfig } from '@/types/elements/charts'
import { createLineChart, updateLineChart } from '@/elements/charts/lineChart/lineChart.renderer'
import { encodeLineChart, decodeLineChart } from '@/elements/charts/lineChart/lineChart.encoder'
import LineChartPanel from '@/elements/charts/lineChart/lineChart.panel.vue'

export default function registerLineChartPlugin() {
  registerElement('lineChart' as ElementType, {
    add: (config) => {
      return createLineChart(config as LineChartElementConfig)
    },
    update: (element, patch) => {
      updateLineChart(element as any, patch as Partial<LineChartElementConfig>)
    },
    encode: (element) => {
      return encodeLineChart(element as any) as any
    },
    decode: (config) => {
      return decodeLineChart(config as any) as any
    },
  })

  registerSettings('lineChart' as ElementType, LineChartPanel)
}
