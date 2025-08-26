export type FontItem = {
  label: string
  value: string
  family: string
  src?: string
  alias?: string
  // Optional metadata for precise filtering
  isMonospace?: boolean
  italic?: boolean
}

export type Section = {
  label: string
  name: string
  fonts: FontItem[]
}
