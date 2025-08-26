import { getEncoder, getDecoder } from './registry'

export type EncodableElement = any
export type DecodableElement = any

// 编码元素
export const encodeElement = (element: EncodableElement) => {
  const encoder = getEncoder((element as any).eleType)
  if (!encoder) {
    console.warn(`No encoder found for element type: ${(element as any).eleType}`)
    return null
  }
  return encoder(element)
}

// 解码元素
export const decodeElement = (element: DecodableElement) => {
  const decoder = getDecoder((element as any).type)
  if (!decoder) {
    console.warn(`No decoder found for element type: ${(element as any).type}`)
    return null
  }
  return decoder(element)
}

// 默认编码器
export const defaultEncoder = (element: any) => {
  return {
    type: (element as any).eleType,
    ...element,
  }
}

// 默认解码器
export const defaultDecoder = (element: any) => {
  return {
    eleType: (element as any).type,
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
