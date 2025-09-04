import { getEncoder, getDecoder } from './registry'
import type { FabricElement, ElementType, ElementConfig } from '@/types/element'


// 编码元素
export const encodeElement = (element: FabricElement) => {
  const encoder = getEncoder((element as FabricElement).eleType)
  if (!encoder) {
    console.warn(`No encoder found for element type: ${(element as FabricElement).eleType}`)
    return null
  }
  return encoder(element)
}

// 解码元素
export const decodeElement = (element: ElementConfig | any) => {
  const type: ElementType | undefined = (element?.type as ElementType) ?? (element?.eleType as ElementType)
  if (!type) {
    console.warn('No decoder found because element.type is undefined')
    return null
  }
  const decoder = getDecoder(type)
  if (!decoder) {
    console.warn(`No decoder found for element type: ${type}`)
    return null
  }
  return decoder(element)
}

// 默认编码器
export const defaultEncoder = (element: FabricElement) => {
  return {
    ...element,
  }
}

// 默认解码器
export const defaultDecoder = (element: FabricElement) => {
  return {
    ...element,
  }
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
