export type FontItem = {
  label: string
  value: string
  family: string
  src?: string
  alias?: string
}

export type Section = {
  label: string
  name: string
  fonts: FontItem[]
}
