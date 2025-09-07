import { getEncoder, getDecoder } from './registry'
import type { FabricElement, ElementType } from '@/types/element'
import type { AnyElementConfig } from '@/types/elements'

// 编码元素
export const encodeElement = (element: FabricElement): AnyElementConfig => {
  // 类型收窄：eleType 可能为 string | undefined，需要先收窄为 ElementType
  const type: ElementType = element.eleType as ElementType
  if (!type) {
    console.warn(`No encoder found because element.eleType is undefined`)
    // 回退到默认编码器
    return defaultEncoder(element)
  }
  try {
    const encoder = getEncoder(type)
    const ret = encoder(element)
    if (ret == null) {
      console.warn(`Encoder returned null for element type: ${type}. Fallback to defaultEncoder.`)
      return defaultEncoder(element)
    }
    return ret
  } catch (e) {
    console.warn(`No encoder found for element type: ${type}`, e)
    // 回退到默认编码器
    return defaultEncoder(element)
  }
}

// 解码元素
export const decodeElement = (element: AnyElementConfig): FabricElement => {
  const type: ElementType = element?.eleType as ElementType
  if (!type) {
    console.warn('No decoder found because element.type is undefined')
    return {} as FabricElement
  }
  const decoder = getDecoder(type)
  if (!decoder) {
    console.warn(`No decoder found for element type: ${type}`)
    return {} as FabricElement
  }
  const ret = decoder(element)
  return ret as FabricElement
}

// 默认编码器: 直接回传（宽松类型）
export const defaultEncoder = (element: FabricElement): AnyElementConfig => {
  try {
    return element as AnyElementConfig
  } catch (e) {
    console.error('Failed to encode element using default encoder', e)
    return {} as AnyElementConfig
  }
}

// 默认解码器: 直接回传
export const defaultDecoder = (element: FabricElement): FabricElement => {
  // 保持返回原始 Fabric 实例以确保类型包含 FabricObject 的方法
  return element
}

// 自动加载所有编解码器文件（支持 .ts 与 .js）
const encoderModulesTs = import.meta.glob(['./**/*Codec.ts'], { eager: true })
const encoderModulesJs = import.meta.glob(['./**/*Codec.js'], { eager: true })
const allModules = { ...encoderModulesTs, ...encoderModulesJs } as Record<string, any>
Object.values(allModules).forEach((mod: any) => {
  if (mod?.default && typeof mod.default === 'function') {
    try {
      mod.default()
    } catch (e) {
      console.error('Failed to init codec module', e)
    }
  }
})
