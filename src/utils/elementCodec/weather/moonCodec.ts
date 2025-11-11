import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useMoonStore } from '@/stores/elements/weather/moonElement'
import type { FabricElement } from '@/types/element'
import type { MoonElementConfig } from '@/types/elements/data'

// 编码器
const encodeMoon: EncoderFn<'moon'> = (element: FabricElement) => {
  const store = useMoonStore()
  return store.encodeConfig(element)
}

// 解码器
const decodeMoon: DecoderFn<'moon'> = (config: MoonElementConfig) => {
  const store = useMoonStore()
  return store.decodeConfig(config)
}

// 添加元素
const addMoon: AddElementFn<'moon'> = (_elementType: 'moon', config: MoonElementConfig) => {
  const store = useMoonStore()
  return store.addElement(config)
}

export default () => {
  registerEncoder('moon', encodeMoon)
  registerDecoder('moon', decodeMoon)
  registerAddElement('moon', addMoon)
}
