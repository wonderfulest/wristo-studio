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

export interface PropertyOption {
  label: string
  value: string
}

export interface PropertyItem {
  type: PropertyType
  title: string
  options?: PropertyOption[]
  value: string
  prompt?: string
  errorMessage?: string
}

export type PropertiesMap = Record<string, PropertyItem>
