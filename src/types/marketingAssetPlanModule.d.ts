declare module '@/engine/services/marketingAssetPlan.mjs' {
  import type { Image, ImageBase } from '@/types/api/image'
  import type { ProductImageItem, ProductImageType } from '@/types/product'

  export type ScalarMarketingInput = {
    type: 'hero' | 'raw' | 'banner'
    source?: string | null
  }

  export type MarketingAssetPlan = {
    imageId: number | string
    relationId?: number
    type: 'product' | 'social'
    sourceType?: ProductImageType
    name: string
    basePath: string
    image: ImageBase
  }

  export function createMarketingAssetInputs(product?: {
    garminImageUrl?: string | null
    heroImageUrl?: string | null
    rawImageUrl?: string | null
    bannerImageUrl?: string | null
    productImages?: ProductImageItem[]
  }): { scalars: ScalarMarketingInput[]; gallery: ProductImageItem[] }

  export function createScalarMarketingAssetPlan(
    input: ScalarMarketingInput,
    resolvedRecord?: Image | null,
  ): MarketingAssetPlan | null

  export function createGalleryMarketingAssetPlan(item: ProductImageItem): MarketingAssetPlan

  export function enumerateMarketingVariantSources(image: ImageBase): Array<{
    name: string
    value: { url: string; width?: number; height?: number; mime?: string }
  }>

  export function inferMarketingImageFormat(mimeType: string, source: string, fallback?: string): string
}
