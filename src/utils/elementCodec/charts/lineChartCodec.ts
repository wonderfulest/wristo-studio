import { LineChartElementConfig } from '@/types/elements/charts'
import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useLineChartStore } from '@/stores/elements/charts/lineChartElement'
import type { ElementConfig } from '@/types/element'
import type { FabricElement } from '@/types/element'

const encodeLineChart: EncoderFn = (element: FabricElement) => {
  const store = useLineChartStore()
  return store.encodeConfig(element)
}

const decodeLineChart: DecoderFn = (config: ElementConfig) => {
  const store = useLineChartStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: LineChartElementConfig) => {
  const store = useLineChartStore()
  config.type = _elementType
  return store.addElement(config)
}

export default () => {
  registerEncoder('lineChart', encodeLineChart)
  registerDecoder('lineChart', decodeLineChart)
  registerAddElement('lineChart', addElement)
}
