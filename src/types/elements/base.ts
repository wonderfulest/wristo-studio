// Base element shared config

import { TOriginX, TOriginY } from "fabric"
import type { FabricFill } from "@/types/fabric"

export interface BaseElementConfig {
  id: string
  eleType: string
  left: number
  top: number
  originX: TOriginX
  originY: TOriginY
  fill?: FabricFill
  fontFamily?: string
  fontSize?: number
}
