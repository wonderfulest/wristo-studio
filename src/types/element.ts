/**
 * Element type definitions used by the editor runtime and codec.
 * Keep minimal but accurate to avoid breaking when backend schema evolves.
 */

import { FabricObject } from "fabric"

// Fabric.js element type with our custom properties
export type FabricElement = FabricObject & {
  id?: string
  eleType: string
  color: string
  bgColor: string
  formatter?: string | number
  fontFamily?: string
  fontSize?: number
  iconFontFamily?: string
  dataProperty?: string
  goalProperty?: string
  pointCount?: number
  fillMissing?: boolean
  minY?: number
  maxY?: number
  barWidth?: number
  chartProperty?: string
  showGrid?: boolean
  gridColor?: string
  gridYCount?: number
  showXAxis?: boolean
  showYAxis?: boolean
  xAxisColor?: string
  yAxisColor?: string
  showXLabels?: boolean
  showYLabels?: boolean
  xLabelColor?: string
  yLabelColor?: string
  xFont?: string
  yFont?: string
  xFontSize?: number
  yFontSize?: number
}

export type ElementType = string

export interface ElementConfig {
  id?: string
  type: ElementType
  eleType: string
  left: number
  top: number
  fill: string
  originX: string
  originY: string
  fontFamily?: string
  fontSize?: number
  iconFontFamily?: string
  dataProperty?: string
  goalProperty?: string
  [key: string]: any
}
