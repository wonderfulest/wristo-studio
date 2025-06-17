import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useLineChartStore } from '@/stores/elements/charts/lineChartElement'

const addElement = (config) => {
  const lineChartStore = useLineChartStore()
  lineChartStore.addElement(config)
}

// 编码器
const encodeLineChart = (element) => {
  const lineChartStore = useLineChartStore()
  return lineChartStore.encodeConfig(element)
}

// 解码器
const decodeLineChart = (config) => {
  const lineChartStore = useLineChartStore()
  return lineChartStore.decodeConfig(config)
}

// 注册编码器和解码器
registerAddElement('lineChart', addElement)
registerEncoder('lineChart', encodeLineChart)
registerDecoder('lineChart', decodeLineChart)
