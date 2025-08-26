import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useDataStore as useDataStore } from '@/stores/elements/data/dataElement'
import type { ElementConfig, FabricElement } from '@/types/element'

// 数据编码器
const dataEncoder: EncoderFn = (element: FabricElement) => {
  const dataStore = useDataStore()
  return dataStore.encodeConfig(element)
}

// 数据解码器
const dataDecoder: DecoderFn = (element: ElementConfig) => {
  const dataStore = useDataStore()
  return dataStore.decodeConfig(element)
}

// 添加元素（签名与 AddElementFn 对齐，忽略 elementType，仅使用后续参数）
const addElement: AddElementFn = (_elementType, config: ElementConfig) => {
  const dataStore = useDataStore()
  return dataStore.addElement(config)
}

// 默认导出函数，用于自动注册
export default () => {
  registerEncoder('data', dataEncoder)
  registerDecoder('data', dataDecoder)
  registerAddElement('data', addElement)
}
