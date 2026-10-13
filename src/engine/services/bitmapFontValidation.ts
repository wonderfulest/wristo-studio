import type { BitmapFontAssetRelationVO } from '@/api/wristo/bitmapFont'

/** A character record without its source image cannot be packaged. */
export function hasBitmapFontColon(chars: BitmapFontAssetRelationVO[] | null | undefined): boolean {
  return Boolean(chars?.some(char => char.charValue === ':' && char.image?.url?.trim()))
}
