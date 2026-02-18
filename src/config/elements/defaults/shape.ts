import type { RectangleElementConfig, CircleElementConfig, LineElementConfig } from '@/types/elements'
import { DEFAULT_SHAPE_CONFIG, EDITOR_ELEMENT } from './base'

export const DEFAULT_RECTANGLE_CONFIG: RectangleElementConfig & EDITOR_ELEMENT = Object.assign({
  icon: 'mdi:rectangle',
  label: 'Rectangle',
  eleType: 'rectangle' as const,
}, DEFAULT_SHAPE_CONFIG, {
  eleType: 'rectangle' as const,
  width: 100,
  height: 50,
  fill: 'transparent',
  stroke: '#FFFFFF',
  strokeWidth: 2,
  borderRadius: 5,
})

export const DEFAULT_CIRCLE_CONFIG: CircleElementConfig & EDITOR_ELEMENT = Object.assign({
  icon: 'mdi:circle',
  label: 'Circle',
  eleType: 'circle' as const,
}, DEFAULT_SHAPE_CONFIG, {
  eleType: 'circle' as const,
  radius: 50,
  fill: 'transparent',
  stroke: '#FFFFFF',
  strokeWidth: 2,
})

export const DEFAULT_LINE_CONFIG: LineElementConfig & EDITOR_ELEMENT = Object.assign({
  icon: 'mdi:vector-line',
  label: 'Line',
}, DEFAULT_SHAPE_CONFIG, {
  eleType: 'line' as const,
  width: 100,
  height: 5,
  stroke: '#FFFFFF',
  strokeWidth: 2,
  x1: 202,
  y1: 227,
  x2: 252,
  y2: 227,
})
