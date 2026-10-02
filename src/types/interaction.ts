export interface ElementInteraction {
  action: 'none' | 'complication'
  target?: 'element' | 'fixed' | 'property'
  complicationType?: number
  complicationProperty?: string
  touchMode?: 'auto' | 'custom'
  touchShape?: 'rectangle' | 'circle'
  touchPadding?: number
  touchWidth?: number
  touchHeight?: number
  touchOffsetX?: number
  touchOffsetY?: number
  bounds?: { centerOffsetX: number; centerOffsetY: number; width: number; height: number }
}
