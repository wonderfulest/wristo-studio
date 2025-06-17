import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useBarChartStore } from '@/stores/elements/charts/barChartElement'

const addElement = (config) => {
  const barChartStore = useBarChartStore()
  barChartStore.addElement(config)
}

// 编码器
const encodeBarChart = (element) => {
  const barChartStore = useBarChartStore()
  return barChartStore.encodeConfig(element)
}

// 解码器
const decodeBarChart = (config) => {
  const barChartStore = useBarChartStore()
  return barChartStore.decodeConfig(config)
}

// 注册编码器和解码器
registerAddElement('barChart', addElement)
registerEncoder('barChart', encodeBarChart)
registerDecoder('barChart', decodeBarChart)
