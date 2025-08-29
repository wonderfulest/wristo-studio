// Base element shared config

export interface BaseElementConfig {
  id: string
  eleType: string
  left: number
  top: number
  originX: 'center' | 'left' | 'right'
  originY: 'center' | 'top' | 'bottom'
  fill: string
  fontFamily?: string
  fontSize?: number
}
