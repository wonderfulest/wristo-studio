export interface ParsedFontInfo {
  fullName?: string
  postscriptName?: string
  family?: string
  subfamily?: string
  version?: string
  copyright?: string
  unitsPerEm?: number
  glyphCount: number

  // extra
  languageCodes?: string[]
  isMonospace?: boolean
  italic?: boolean
  weightClass?: number
  widthClass?: number
  ascent?: number
  descent?: number
  lineGap?: number
  capHeight?: number
  xHeight?: number
}
