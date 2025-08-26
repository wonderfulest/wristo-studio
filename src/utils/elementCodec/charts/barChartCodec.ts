import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useBarChartStore } from '@/stores/elements/charts/barChartElement'
import type { ElementConfig } from '@/types/element'
import type { FabricElement } from '@/types/element'
import { BarChartElementConfig } from '@/types/elements/charts'

const encodeBarChart: EncoderFn = (element: FabricElement) => {
  const store = useBarChartStore()
  return store.encodeConfig(element)
}

const decodeBarChart: DecoderFn = (config: ElementConfig) => {
  const store = useBarChartStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: BarChartElementConfig) => {
  const store = useBarChartStore()
  config.type = _elementType
  return store.addElement(config)
}

export default () => {
  registerEncoder('barChart', encodeBarChart)
  registerDecoder('barChart', decodeBarChart)
  registerAddElement('barChart', addElement)
}
