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

export interface ElementConfigItem extends ElementAttribute {
  icon: string
  label: string
  type?: string
  size?: number
}

export interface ElementConfigs {
  dials: Record<string, ElementConfigItem>
  hands: Record<string, ElementConfigItem>
  status: Record<string, ElementConfigItem>
  time: Record<string, ElementConfigItem>
  metric: Record<string, ElementConfigItem>
  indicator: Record<string, ElementConfigItem>
  shape: Record<string, ElementConfigItem>
  goal: Record<string, ElementConfigItem>
  chart: Record<string, ElementConfigItem>
}
