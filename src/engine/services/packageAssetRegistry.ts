import type { DesignFontVO } from '@/types/font'
import type { BitmapFontAssetRelationVO } from '@/api/wristo/bitmapFont'

/** Package-owned bytes survive library unavailability and are replaced when another project opens. */
export const packageFonts = new Map<string, DesignFontVO>()
export const packageFontBuildFiles = new Map<string, Map<string, Blob>>()
export const packageBitmapChars = new Map<number, BitmapFontAssetRelationVO[]>()

export const packageArchiveExtras: {
  productImages: import('./marketingAssetBundle').MarketingImageManifest[]
  files: Map<string, Blob>
  preview?: { path: string; sha256: string }
} = { productImages: [], files: new Map() }
