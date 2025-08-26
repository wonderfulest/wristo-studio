export type HorizontalAlign = 'left' | 'center' | 'right'
export type VerticalAlign = 'top' | 'center' | 'bottom'

export interface AlignOption<T extends string> {
  value: T
  label: string
  icon: string
}

export interface TimeFormatOption {
  value: number
  label: string
  example: string
}

export interface DateFormatOption {
  value: number
  label: string
  example: string
}

export interface LayoutOption {
  value: string
  label: string
  icon: string
}

export interface EnLabel {
  short: string
  medium: string
  long: string
}

export interface DataTypeOption {
  labelCn: string
  metricSymbol: string
  value: number
  defaultValue: string
  icon: string
  unit?: string
  label: string
  enLabel: EnLabel
}

export interface HandOption {
  name: string
  url: string
}
