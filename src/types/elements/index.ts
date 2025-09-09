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
export type { BatteryElementConfig, MoveBarElementConfig } from './status'

// charts are defined separately in charts.ts; keep legacy union compatibility via AnyElementConfig
export type { BarChartElementConfig, LineChartElementConfig } from './charts'

// tick/dials
export type { TickElementConfig } from './tick'

// 联合类型 - 所有可能的元素配置
import type { BaseElementConfig as _Base } from './base'
import type { TimeElementConfig as _Time, DateElementConfig as _Date } from './time'
import type { IconElementConfig as _Icon, IndicatorElementConfig as _Indicator } from './metric'
import type { DataElementConfig as _DataText } from './data'
import type { ShapeElementConfig as _Shape, CircleElementConfig as _Circle, RectangleElementConfig as _Rectangle, LineElementConfig as _Line } from './shape'
import type { GoalElementConfig as _Goal, GoalBarElementConfig as _GoalBar, GoalArcElementConfig as _GoalArc } from './goal'
import type { BarChartElementConfig as _BarChart, LineChartElementConfig as _LineChart } from './charts'
import type { BatteryElementConfig as _Battery, MoveBarElementConfig as _MoveBar } from './status'
import type { HandElementConfig as _Hand } from './hand'
import type { TickElementConfig as _Tick } from './tick'

export type AnyElementConfig =
  | _Time
  | _Date
  | _Icon
  | _DataText
  | _Indicator
  | _Hand
  | _Shape
  | _Goal
  | _Base
  | _Battery
  | _MoveBar
  | _Tick
  | _GoalBar
  | _GoalArc
  | _BarChart
  | _LineChart

// 类型映射 - 根据元素类型获取对应的配置类型
export interface ElementConfigMap {
  'time': _Time
  'date': _Date
  'icon': _Icon
  'data': _DataText
  'indicator': _Indicator
  'bluetooth': _Indicator
  'alarms': _Indicator
  'disturb': _Indicator
  'notification': _Indicator
  'shape': _Shape
  'circle': _Circle
  'rectangle': _Rectangle
  'line': _Line
  'hourHand': _Hand
  'minuteHand': _Hand
  'secondHand': _Hand
  'romans': _Tick
  'tick12': _Tick
  'tick60': _Tick
  'goal': _Goal
  'goalBar': _GoalBar
  'goalArc': _GoalArc
  'barChart': _BarChart
  'lineChart': _LineChart
  'battery': _Battery
  'moveBar': _MoveBar
  [key: string]: _Base
}

// 根据元素类型获取配置类型的工具类型
export type ConfigForType<T extends string> = T extends keyof ElementConfigMap
  ? ElementConfigMap[T]
  : _Base