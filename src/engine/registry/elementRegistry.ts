import type { ElementType, FabricElement } from '@/types/element'
import type { AnyElementConfig, ElementConfigMap } from '@/types/elements'

// 基础类型定义
export type AddElementFn<T extends ElementType = ElementType> =
  (elementType: T, config: ElementConfigMap[T]) => Promise<FabricElement> | FabricElement

export type EncoderFn<T extends ElementType = ElementType> =
  (element: FabricElement) => ElementConfigMap[T] | null

export type DecoderFn<T extends ElementType = ElementType> =
  (config: ElementConfigMap[T]) => Partial<FabricElement>

// 统一的元素处理器
export type ElementHandler<T extends ElementType = ElementType> = {
  add: AddElementFn<T>
  update?: (element: FabricElement, patch: any) => void
  encode?: EncoderFn<T>
  decode?: DecoderFn<T>
}

const elementRegistry = new Map<ElementType, ElementHandler>()

// 新的注册/获取 API
export const registerElement = <T extends ElementType>(
  elementType: T,
  handler: ElementHandler<T>,
) => {
  elementRegistry.set(elementType, handler as unknown as ElementHandler)
}

export const getElementHandler = <T extends ElementType>(
  elementType: T,
): ElementHandler<T> | undefined => {
  return elementRegistry.get(elementType) as ElementHandler<T> | undefined
}

// 统一编码入口：根据元素上的 eleType 从注册表中找到对应的 encoder 并执行
export const encodeElementByRegistry = (
  element: FabricElement,
): ElementConfigMap[ElementType] | null => {
  const eleType = (element as any).eleType as ElementType | undefined
  if (!eleType) return null

  const handler = elementRegistry.get(eleType)
  const encoder = handler?.encode
  if (!encoder) return null

  return encoder(element) as ElementConfigMap[ElementType] | null
}

// 统一解码入口：根据配置中的 eleType 调用对应 handler.decode，将解码结果合并回配置
export const decodeElementConfig = (
  config: AnyElementConfig,
): AnyElementConfig | null => {
  const eleType = config.eleType as ElementType | undefined
  if (!eleType) return null

  const handler = elementRegistry.get(eleType)
  if (!handler) return null

  const decoder = handler.decode
  if (!decoder) {
    // 未提供专门的 decoder，则直接返回原始配置
    return config
  }

  const partial = decoder(config as any)
  return { ...config, ...(partial as object) } as AnyElementConfig
}

// 兼容层：旧的 registerAddElement / registerEncoder / registerDecoder
export const registerAddElement = <T extends ElementType>(
  elementType: T,
  addElement: AddElementFn<T>,
) => {
  const existing = elementRegistry.get(elementType) || ({} as ElementHandler)
  elementRegistry.set(elementType, {
    ...existing,
    add: addElement as AddElementFn,
  })
}

export const registerEncoder = <T extends ElementType>(elementType: T, encoder: EncoderFn<T>) => {
  const existing = elementRegistry.get(elementType) || ({} as ElementHandler)
  elementRegistry.set(elementType, {
    ...existing,
    encode: encoder as EncoderFn,
  })
}

export const registerDecoder = <T extends ElementType>(elementType: T, decoder: DecoderFn<T>) => {
  const existing = elementRegistry.get(elementType) || ({} as ElementHandler)
  elementRegistry.set(elementType, {
    ...existing,
    decode: decoder as DecoderFn,
  })
}

// 兼容层：旧的 getAddElement / getEncoder / getDecoder
export const getAddElement = <T extends ElementType>(elementType: T): AddElementFn<T> => {
  const handler = elementRegistry.get(elementType)
  const addElement = handler?.add
  if (!addElement) {
    throw new Error(`No add-element handler found for element type: ${elementType}`)
  }
  // 包装以兼容两种调用方式：
  // 1) 旧：addElement(elementType, config)
  // 2) 新：addElement(config)
  const wrapped: AddElementFn<T> = ((...args: any[]) => {
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      return (addElement as AddElementFn<T>)(elementType, args[0])
    }
    return (addElement as any)(...args)
  }) as AddElementFn<T>

  return wrapped
}

export const getEncoder = <T extends ElementType>(elementType: T): EncoderFn<T> => {
  const handler = elementRegistry.get(elementType)
  const encoder = handler?.encode
  if (!encoder) {
    throw new Error(`No encoder found for element type: ${elementType}`)
  }
  return encoder as EncoderFn<T>
}

export const getDecoder = <T extends ElementType>(elementType: T): DecoderFn<T> => {
  const handler = elementRegistry.get(elementType)
  const decoder = handler?.decode
  if (!decoder) {
    throw new Error(`No decoder found for element type: ${elementType}`)
  }
  return decoder as DecoderFn<T>
}
