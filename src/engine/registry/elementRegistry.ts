import type { ElementType, FabricElement } from '@/types/element'
import type { AnyElementConfig } from '@/types/elements'
import { normalizeFontSizeFields } from '@/utils/fontSize'
import { normalizeDisplayStates } from '@/utils/displayStates'

// 统一的元素处理器：负责元素的增删改查编解码
export type ElementHandler = {
  // 根据业务配置创建 FabricElement；config.eleType 必须与注册类型一致
  add: (config: AnyElementConfig) => Promise<FabricElement> | FabricElement

  // 可选的增量更新逻辑，由具体元素自行决定 patch 结构
  update?: (element: FabricElement, patch: Partial<AnyElementConfig>) => void

  // 运行时实例 -> 业务配置
  encode?: (element: FabricElement) => AnyElementConfig | null

  // 业务配置 -> 运行时实例附加属性（局部字段），通常用于还原运行时额外信息
  decode?: (config: AnyElementConfig) => Partial<FabricElement>
}

const elementRegistry = new Map<ElementType, ElementHandler>()

// 注册元素处理器
export const registerElement = (elementType: ElementType, handler: ElementHandler) => {
  elementRegistry.set(elementType, handler)
}

// 获取元素处理器：未注册时抛错，方便尽早发现问题
export const getElementHandler = (elementType: ElementType): ElementHandler => {
  const handler = elementRegistry.get(elementType)
  if (!handler) {
    throw new Error(`Element handler not found: ${elementType}`)
  }
  return handler
}

// 统一编码入口：根据元素上的 eleType 从注册表中找到对应的 encoder 并执行
export const encodeElementByRegistry = (
  element: FabricElement,
): AnyElementConfig | null => {
  const eleType = (element as any).eleType as ElementType | undefined
  if (!eleType) return null

  const handler = elementRegistry.get(eleType)
  const encoder = handler?.encode
  if (!encoder) return null

  const encoded = encoder(element)
  if (!encoded) return null

  const normalized = normalizeFontSizeFields(encoded as unknown as Record<string, unknown>) as unknown as AnyElementConfig
  ;(normalized as any).displayStates = normalizeDisplayStates((element as any).displayStates ?? (encoded as any).displayStates)
  return normalized
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
    const normalized = normalizeFontSizeFields(config as unknown as Record<string, unknown>) as unknown as AnyElementConfig
    ;(normalized as any).displayStates = normalizeDisplayStates((config as any).displayStates)
    return normalized
  }

  const partial = decoder(config)
  const normalized = normalizeFontSizeFields({
    ...config,
    ...(partial as object),
  } as Record<string, unknown>) as unknown as AnyElementConfig
  ;(normalized as any).displayStates = normalizeDisplayStates((partial as any)?.displayStates ?? (config as any).displayStates)
  return normalized
}
