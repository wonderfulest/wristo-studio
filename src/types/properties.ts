export type PropertyType =
  | 'color'
  | 'number'
  | 'string'
  | 'boolean'
  | 'date'
  | 'select'
  | 'goal'
  | 'data'

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
