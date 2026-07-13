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
  value: unknown
}

export interface PropertyItem {
  type: PropertyType
  title: string
  options?: PropertyOption[]
  value: unknown
  prompt?: string
  errorMessage?: string
  dialMode?: 'goal' | 'range'
}

export type PropertiesMap = Record<string, PropertyItem>
