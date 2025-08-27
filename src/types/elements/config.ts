export interface ElementAttribute {
  left: number
  top: number
  width?: number
  height?: number
  originX?: 'left' | 'center' | 'right'
  originY?: 'top' | 'center' | 'bottom'
  fill?: string
  bgColor?: string
  backgroundColor?: string
  fontFamily?: string
  color?: string
  fontSize?: number
  iconSize?: number
  selectable?: boolean
  hasControls?: boolean
  hasBorders?: boolean
  lockMovementX?: boolean
  lockMovementY?: boolean
  lockRotation?: boolean
  lockScalingX?: boolean
  lockScalingY?: boolean
  lockUniScaling?: boolean
  evented?: boolean
  xPadding?: number
  yPadding?: number
  stroke?: string
  strokeWidth?: number
  borderRadius?: number
  badgeType?: number
  textColor?: string
  metricSymbol?: string
  iconFontFamily?: string
  startAngle?: number
  endAngle?: number
  counterClockwise?: boolean
  radius?: number
  formatter?: number | string
  dateFormatter?: number | string
  varName?: string
  // shape specific
  opacity?: number
  // line specific
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  // goal specific
  progress?: number
  // chart specific
  pointCount?: number
  showXLabels?: boolean
  showYLabels?: boolean
  xLabelColor?: string
  yLabelColor?: string
  xFont?: string
  yFont?: string
  fillMissing?: boolean
  targetHeight?: number
}

import type { AnyElementConfig } from '@/types/elementConfig'

export interface ElementConfigs {
  dials: Record<string, AnyElementConfig>
  hands: Record<string, AnyElementConfig>
  status: Record<string, AnyElementConfig>
  time: Record<string, AnyElementConfig>
  metric: Record<string, AnyElementConfig>
  indicator: Record<string, AnyElementConfig>
  shape: Record<string, AnyElementConfig>
  goal: Record<string, AnyElementConfig>
  chart: Record<string, AnyElementConfig>
}
