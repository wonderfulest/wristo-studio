// Base element shared config

import { TOriginX, TOriginY } from "fabric"

export interface BaseElementConfig {
  id: string
  eleType: string
  left: number
  top: number
  originX: TOriginX
  originY: TOriginY
  fill?: string
  fontFamily?: string
  fontSize?: number
}
