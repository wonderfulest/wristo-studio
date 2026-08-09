export type HorizontalAlign = 'left' | 'center' | 'right'
export type VerticalAlign = 'top' | 'center' | 'bottom'

export interface OptionFormat<T> {
  value: T
  label: string
  zhsLabel?: string
  example: string
  format?: string
}

export interface LayoutOption {
  value: string
  label: string
  icon: string
}

export type DialProgressMode = 'goal' | 'range'

export interface HandOption {
  name: string
  url: string
}
