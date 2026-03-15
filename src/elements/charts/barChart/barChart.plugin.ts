import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { BarChartElementConfig } from '@/types/elements/charts'
import { createBarChart, updateBarChart } from '@/elements/charts/barChart/barChart.renderer'
import { encodeBarChart, decodeBarChart } from '@/elements/charts/barChart/barChart.encoder'
import BarChartPanel from '@/elements/charts/barChart/barChart.panel.vue'

export default function registerBarChartPlugin() {
  registerElement('barChart' as ElementType, {
    add: (config) => {
      return createBarChart(config as BarChartElementConfig)
    },
    update: (element, patch) => {
      updateBarChart(element as any, patch as Partial<BarChartElementConfig>)
    },
    encode: (element) => {
      return encodeBarChart(element as any) as any
    },
    decode: (config) => {
      return decodeBarChart(config as any) as any
    },
  })

  registerSettings('barChart' as ElementType, BarChartPanel)
}
