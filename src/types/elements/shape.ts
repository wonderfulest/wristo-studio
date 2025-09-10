import type { BaseElementConfig } from './base'

export interface ShapeElementConfig extends BaseElementConfig {
  eleType: 'rectangle' | 'circle' | 'line'
  fill?: string
  stroke: string
  strokeWidth: number
  opacity?: number
}

export interface CircleElementConfig extends ShapeElementConfig {
  eleType: 'circle'
  radius: number
}

export interface RectangleElementConfig extends ShapeElementConfig {
  eleType: 'rectangle'
  width: number
  height: number
  borderRadius: number
}

export interface LineElementConfig extends ShapeElementConfig {
  eleType: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
}
