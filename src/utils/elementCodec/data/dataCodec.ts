import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useDataStore as useDataStore } from '@/stores/elements/data/dataElement'
import type { FabricElement } from '@/types/element'
import type { DataElementConfig } from '@/types/elements/data'

// 数据编码器
const dataEncoder: EncoderFn<'data'> = (element: FabricElement) => {
  const dataStore = useDataStore()
  return dataStore.encodeConfig(element) as unknown as DataElementConfig
}

// 数据解码器
const dataDecoder: DecoderFn<'data'> = (element: DataElementConfig) => {
  const dataStore = useDataStore()
  return dataStore.decodeConfig(element as any)
}

// 添加元素（签名与 AddElementFn 对齐，忽略 elementType，仅使用后续参数）
const addElement: AddElementFn<'data'> = (_elementType, config: DataElementConfig) => {
  const dataStore = useDataStore()
  return dataStore.addElement(config)
}

// 默认导出函数，用于自动注册
export default () => {
  registerEncoder('data', dataEncoder)
  registerDecoder('data', dataDecoder)
  registerAddElement('data', addElement)
}
