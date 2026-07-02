// Central element type exports for codecs and stores
import { FabricObject, TextProps } from 'fabric'
import type { AnyElementConfig } from './elements'
import type { ElementDisplayStates } from '@/utils/displayStates'

export type ElementType = string
export type ElementConfig = AnyElementConfig

// Represent runtime Fabric instances; allow optional custom properties
export type FabricElement = (FabricObject & Partial<TextProps>) & {
  id?: string
  left: number
  top: number
  eleType?: string
  metricSymbol?: string
  metricValue?: string
  dataProperty?: string
  goalProperty?: string
  displayStates?: ElementDisplayStates
  [key: string]: any
}
