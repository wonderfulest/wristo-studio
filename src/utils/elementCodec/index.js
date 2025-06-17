import { getEncoder, getDecoder } from './registry'

// 编码元素
export const encodeElement = (element) => {
  const encoder = getEncoder(element.eleType)
  if (!encoder) {
    console.warn(`No encoder found for element type: ${element.eleType}`)
    return null
  }
  return encoder(element)
}

// 解码元素
export const decodeElement = (element) => {
  const decoder = getDecoder(element.type)
  if (!decoder) {
    console.warn(`No decoder found for element type: ${element.type}`)
    return null
  }
  return decoder(element)
}

// 默认编码器
export const defaultEncoder = (element) => {
  return {
    type: element.eleType,
    ...element
  }
}

// 默认解码器
export const defaultDecoder = (element) => {
  return {
    eleType: element.type,
    ...element
  }
}

// 自动加载所有编解码器文件
const encoderModules = import.meta.glob(['./**/*Codec.js'], { eager: true })
Object.values(encoderModules).forEach(module => {
  if (module.default) {
    module.default()
  }
})