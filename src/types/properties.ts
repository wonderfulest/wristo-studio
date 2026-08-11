import type { ThemeMode } from '@/types/visualTheme'
import type { DataTypeOption } from '@/types/dataCatalog'

export type PropertyType =
  | 'color'
  | 'number'
  | 'text'
  | 'boolean'
  | 'date'
  | 'select'
  | 'goal'
  | 'data'
  | 'chart'
  | 'dial'

export interface PropertyOption {
  label: string
  labelCn?: string
  value: unknown
}

export interface PropertyItem {
  type: PropertyType
  title: string
  titleCn?: string
  options?: PropertyOption[]
  value: unknown
  prompt?: string
  errorMessage?: string
  dialMode?: 'goal' | 'range'
  themeMode?: ThemeMode
  metricSymbols?: string[]
}

export type PropertiesMap = Record<string, PropertyItem>
export type DataOptionsMap = Record<string, DataTypeOption>
