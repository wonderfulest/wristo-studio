export type HorizontalAlign = 'left' | 'center' | 'right'
export type VerticalAlign = 'top' | 'center' | 'bottom'

export interface OptionFormat<T> {
  value: T
  label: string
  labelCn?: string
  example: string
  format?: string
}

export interface LayoutOption {
  value: string
  label: string
  icon: string
}

export interface DataTypeOption {
  labelCn: string
  metricSymbol: string
  value: number
  defaultValue: string
  icon: string
  unit?: string
  label: string
  enLabel: string
}

export interface HandOption {
  name: string
  url: string
}
