import type { BaseElementConfig } from './base'

export interface ShapeElementConfig extends BaseElementConfig {
  eleType: 'rectangle' | 'circle' | 'line' | 'polygon'
  fill?: string
  stroke: string
  strokeWidth: number
  opacity?: number
}

export type ShapeGradientDirection =
  | 'leftToRight'
  | 'rightToLeft'
  | 'topToBottom'
  | 'bottomToTop'

export interface ShapeGradientConfig {
  gradientEnabled?: boolean
  gradientStartColor?: string
  gradientEndColor?: string
  gradientDirection?: ShapeGradientDirection
}

export interface CircleElementConfig extends ShapeElementConfig, ShapeGradientConfig {
  eleType: 'circle'
  radius: number
}

export type RectangleGradientDirection = ShapeGradientDirection

export interface RectangleElementConfig extends ShapeElementConfig, ShapeGradientConfig {
  eleType: 'rectangle'
  width: number
  height: number
  borderRadius: number
}

export interface PolygonElementConfig extends ShapeElementConfig, ShapeGradientConfig {
  eleType: 'polygon'
  width: number
  height: number
  polygonPoints: Array<{ x: number; y: number }>
}

export interface LineElementConfig extends ShapeElementConfig {
  eleType: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
}
