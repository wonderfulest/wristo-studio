export type FontItem = {
  id?: number
  label: string
  value: string
  family: string
  src?: string
  alias?: string
  // Optional metadata for precise filtering
  isMonospace?: boolean
  italic?: boolean
  isSystem?: boolean
  styleTags?: string | string[]
  searchKeywords?: string
  weightClass?: number
  widthClass?: number
  favoriteWeight?: number | null
}

export type Section = {
  label: string
  name: string
  fonts: FontItem[]
}
