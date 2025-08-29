// Central element type exports for codecs and stores
import { FabricText } from 'fabric'
import type { AnyElementConfig, ElementConfigMap } from './elements'

export type ElementType = keyof ElementConfigMap
export type ElementConfig = AnyElementConfig

// Represent runtime Fabric instances; allow optional custom properties
export type FabricElement = FabricText & {
  id?: string
  eleType?: string
  metricSymbol?: string
  metricValue?: string
}
