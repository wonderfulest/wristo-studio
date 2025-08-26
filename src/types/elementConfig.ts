/**
 * 元素配置类型定义 - 使用继承结构优化类型安全
 */

import type { ElementType } from './element'


// 基础元素配置 - 父类
export interface BaseElementConfig {
  id?: string
  type: ElementType
  x: number
  y: number
  originX?: string
  originY?: string
  fill?: string
  fontFamily?: string
  fontSize?: number
  width?: number
  height?: number
}

// 时间元素配置 - 子类
export interface TimeElementConfig extends BaseElementConfig {
  type: 'time'
  formatter: number
}

// 日期元素配置 - 子类
export interface DateElementConfig extends BaseElementConfig {
  type: 'date'
  dateFormatter: number
}

// 图标元素配置 - 子类
export interface IconElementConfig extends BaseElementConfig {
  type: 'icon'
  metricSymbol?: string
  iconSize?: number
}

// 数据元素配置 - 子类
export interface DataElementConfig extends BaseElementConfig {
  type: 'data'
  metricSymbol?: string
  formatter?: string
}

// 指标元素配置 - 子类
export interface IndicatorElementConfig extends BaseElementConfig {
  type: 'indicator'
  metricSymbol?: string
}

// 形状元素配置 - 子类
export interface ShapeElementConfig extends BaseElementConfig {
  type: 'shape'
  shapeType?: 'rectangle' | 'circle' | 'line'
  stroke?: string
  strokeWidth?: number
  radius?: number
  borderRadius?: number
}

// 目标元素配置 - 子类
export interface GoalElementConfig extends BaseElementConfig {
  type: 'goal'
  goalType?: 'bar' | 'arc'
  color?: string
  bgColor?: string
  progress?: number
  radius?: number
  strokeWidth?: number
}

// 图表元素配置 - 子类
export interface ChartElementConfig extends BaseElementConfig {
  type: 'chart'
  chartType?: 'bar' | 'line'
  bgColor?: string
  pointCount?: number
  showXLabels?: boolean
  showYLabels?: boolean
}

// 联合类型 - 所有可能的元素配置
export type AnyElementConfig = 
  | TimeElementConfig
  | DateElementConfig
  | IconElementConfig
  | DataElementConfig
  | IndicatorElementConfig
  | ShapeElementConfig
  | GoalElementConfig
  | ChartElementConfig
  | BaseElementConfig

// 类型映射 - 根据元素类型获取对应的配置类型
export interface ElementConfigMap {
  'time': TimeElementConfig
  'date': DateElementConfig
  'icon': IconElementConfig
  'data': DataElementConfig
  'indicator': IndicatorElementConfig
  'shape': ShapeElementConfig
  'goal': GoalElementConfig
  'chart': ChartElementConfig
  [key: string]: BaseElementConfig
}

// 根据元素类型获取配置类型的工具类型
export type ConfigForType<T extends ElementType> = T extends keyof ElementConfigMap 
  ? ElementConfigMap[T] 
  : BaseElementConfig