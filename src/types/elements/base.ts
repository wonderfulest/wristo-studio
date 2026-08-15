// Base element shared config

import { TOriginX, TOriginY } from "fabric"
import type { FabricFill } from "@/types/fabric"
import type { ElementDisplayStates } from '@/utils/displayStates'
import type { DynamicValue } from '@/engine/expression/types'

export interface BaseElementConfig {
  id: string
  eleType: string
  layerName?: string
  left: number
  top: number
  originX: TOriginX
  originY: TOriginY
  fill?: FabricFill
  fontFamily?: string
  fontSize?: number
  topBase?: number
  displayStates?: ElementDisplayStates
  visibility?: DynamicValue<boolean>
}
