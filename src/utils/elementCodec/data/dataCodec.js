import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useDataStore } from '@/stores/elements/data/dataElement'

// 数据编码器
const dataEncoder = (element) => {
  const dataStore = useDataStore()
  return dataStore.encodeConfig(element)
}

// 数据解码器
const dataDecoder = (element) => {
  const dataStore = useDataStore()
  return dataStore.decodeConfig(element)
}

const addElement = (config) => {
  const dataStore = useDataStore()
  dataStore.addElement(config)
}

// 默认导出函数，用于自动注册
export default () => {
  registerEncoder('data', dataEncoder)
  registerDecoder('data', dataDecoder)
  registerAddElement('data', addElement)
}
