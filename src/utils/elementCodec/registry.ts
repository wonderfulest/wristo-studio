import { ref, type Ref } from 'vue'
import type { ElementType, FabricElement } from '@/types/element'
import type { AnyElementConfig, ElementConfigMap } from '@/types/elementConfig'

// 泛型化的类型定义
export type AddElementFn<T extends ElementType = ElementType> = 
  (elementType: T, config: ElementConfigMap[T]) => Promise<FabricElement> | FabricElement

export type EncoderFn<T extends ElementType = ElementType> = 
  (element: FabricElement) => ElementConfigMap[T] | null

export type DecoderFn<T extends ElementType = ElementType> = 
  (config: ElementConfigMap[T]) => Partial<FabricElement>

// 泛型化的注册表
const addElementRegistry: Ref<Map<ElementType, AddElementFn>> = ref(new Map())
const encoderRegistry: Ref<Map<ElementType, EncoderFn>> = ref(new Map())
const decoderRegistry: Ref<Map<ElementType, DecoderFn>> = ref(new Map())

// 泛型化的注册函数
export const registerAddElement = <T extends ElementType>(elementType: T, addElement: AddElementFn<T>) => {
  addElementRegistry.value.set(elementType, addElement as AddElementFn)
}

export const registerEncoder = <T extends ElementType>(elementType: T, encoder: EncoderFn<T>) => {
  encoderRegistry.value.set(elementType, encoder as EncoderFn)
}

export const registerDecoder = <T extends ElementType>(elementType: T, decoder: DecoderFn<T>) => {
  decoderRegistry.value.set(elementType, decoder as DecoderFn)
}

// 泛型化的获取函数
export const getAddElement = <T extends ElementType>(elementType: T): AddElementFn<T> => {
  const addElement = addElementRegistry.value.get(elementType)
  if (!addElement) {
    throw new Error(`No add-element handler found for element type: ${elementType}`)
  }
  return addElement as AddElementFn<T>
}

export const getEncoder = <T extends ElementType>(elementType: T): EncoderFn<T> => {
  const encoder = encoderRegistry.value.get(elementType)
  if (!encoder) {
    throw new Error(`No encoder found for element type: ${elementType}`)
  }
  return encoder as EncoderFn<T>
}

export const getDecoder = <T extends ElementType>(elementType: T): DecoderFn<T> => {
  const decoder = decoderRegistry.value.get(elementType)
  if (!decoder) {
    throw new Error(`No decoder found for element type: ${elementType}`)
  }
  return decoder as DecoderFn<T>
}
