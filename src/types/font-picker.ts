export type FontItem = {
  id?: number
  userId?: number
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
  language?: string
  type?: string
  bitmapRecipe?: import('@/features/bitmap-font-maker/contracts').BitmapFontRecipe
    | import('@/features/bitmap-font-maker/svgIconPackageBuilder').SvgIconBitmapFontRecipe
    | string
    | null
  bitmapPreviewSize?: number | null
  bitmapPreviewAtlasUrl?: string | null
  bitmapPreviewDescriptorUrl?: string | null
  bitmapCanvasPreviewSize?: number | null
  bitmapCanvasPreviewAtlasUrl?: string | null
  bitmapCanvasPreviewDescriptorUrl?: string | null
}

export type Section = {
  label: string
  name: string
  fonts: FontItem[]
}
