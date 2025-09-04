// Central element type exports for codecs and stores
import { FabricObject, TextProps } from 'fabric'
import type { AnyElementConfig, ElementConfigMap } from './elements'

export type ElementType = keyof ElementConfigMap
export type ElementConfig = AnyElementConfig

// Represent runtime Fabric instances; allow optional custom properties
<<<<<<< HEAD
export type FabricElement = FabricText & {
  id: string
  eleType?: string
  metricSymbol?: string
  metricValue?: string
  formatter?: number
  dataProperty?: string
  goalProperty?: string
  fill?: string
=======
export type FabricElement = (FabricObject & Partial<TextProps>) & {
  id?: string
  eleType: string
  metricSymbol?: string
  metricValue?: string
  dataProperty?: string
  goalProperty?: string
  [key: string]: any
>>>>>>> f520c53 (设计平台更新)
}
