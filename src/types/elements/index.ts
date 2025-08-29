/**
 * 元素配置类型聚合入口 - 按元素类型拆分后在此统一导出
 */

// base & common
export type { BaseElementConfig } from './base'
export type { TextElementConfig } from './text'
export type { ShapeElementConfig, CircleElementConfig, RectangleElementConfig, LineElementConfig } from './shape'
export type { RotationCenter, HandElementConfig } from './hand'

// time & date
export type { TimeElementConfig, DateElementConfig } from './time'

// metric related (legacy metricSymbol-based)
export type { IconElementConfig, DataElementConfig, IndicatorElementConfig } from './metric'

// goal related
export type { GoalElementConfig, GoalBarElementConfig, GoalArcElementConfig } from './goal'

// status related
export type { BatteryElementConfig, } from './battery'
export type { MoveBarElementConfig } from './status'

// charts are defined separately in charts.ts; keep legacy union compatibility via AnyElementConfig
export type { BarChartElementConfig, LineChartElementConfig } from './charts'

// tick/dials
export type { TickElementConfig } from './tick'

// 联合类型 - 所有可能的元素配置
import type { BaseElementConfig as _Base } from './base'
import type { TimeElementConfig as _Time, DateElementConfig as _Date } from './time'
import type { IconElementConfig as _Icon, DataElementConfig as _Data, IndicatorElementConfig as _Indicator } from './metric'
import type { ShapeElementConfig as _Shape } from './shape'
import type { GoalElementConfig as _Goal, GoalBarElementConfig as _GoalBar, GoalArcElementConfig as _GoalArc } from './goal'
import type { BarChartElementConfig as _BarChart, LineChartElementConfig as _LineChart } from './charts'
import type { BatteryElementConfig as _Battery } from './battery'
import type { MoveBarElementConfig as _MoveBar } from './status'

export type AnyElementConfig =
  | _Time
  | _Date
  | _Icon
  | _Data
  | _Indicator
  | _Shape
  | _Goal
  | _Base
  | _Battery
  | _MoveBar
  | _GoalBar
  | _GoalArc
  | _BarChart
  | _LineChart

// 类型映射 - 根据元素类型获取对应的配置类型
export interface ElementConfigMap {
  'time': _Time
  'date': _Date
  'icon': _Icon
  'data': _Data
  'indicator': _Indicator
  'shape': _Shape
  'goal': _Goal
  'goalBar': _GoalBar
  'goalArc': _GoalArc
  'barChart': _BarChart
  'lineChart': _LineChart
  [key: string]: _Base
}

// 根据元素类型获取配置类型的工具类型
export type ConfigForType<T extends string> = T extends keyof ElementConfigMap
  ? ElementConfigMap[T]
  : _Base