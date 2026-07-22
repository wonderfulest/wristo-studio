import JSZip from 'jszip'
import type { Image } from '@/types/api/image'
import type { ProductImageType } from '@/types/product'
import {
  resolveBackendImageRecord,
  writeImageVariants,
  type ImageVariantManifest,
} from './imageVariantBundle'
import {
  createGalleryMarketingAssetPlan,
  createMarketingAssetInputs,
  createScalarMarketingAssetPlan,
  enumerateMarketingVariantSources,
} from '@/engine/services/marketingAssetPlan.mjs'

export {
  createGalleryMarketingAssetPlan,
  createMarketingAssetInputs,
  createScalarMarketingAssetPlan,
  enumerateMarketingVariantSources,
}

export type MarketingImageManifest = {
  imageId: number | string
  relationId?: number
  type: 'product' | 'social'
  sourceType?: ProductImageType
  name: string
  variants: Record<string, ImageVariantManifest>
}

const toVariantMap = (items: ImageVariantManifest[]): Record<string, ImageVariantManifest> => {
  return Object.fromEntries(items.map((item) => [item.name, item]))
}

export const addScalarMarketingImage = async (
  zip: JSZip,
  input: { type: 'hero' | 'raw' | 'banner'; source?: string | null },
): Promise<MarketingImageManifest | null> => {
  const source = String(input.source || '').trim()
  if (!source) return null
  const record = await resolveBackendImageRecord(source)
  const plan = createScalarMarketingAssetPlan(input, record)
  if (!plan) return null
  const variants = await writeImageVariants(zip, {
    imageId: plan.imageId,
    basePath: plan.basePath,
    image: plan.image,
  })
  return {
    imageId: plan.imageId,
    type: plan.type,
    name: plan.name,
    variants: toVariantMap(variants),
  }
}

export const addGalleryMarketingImage = async (
  zip: JSZip,
  input: {
    relationId?: number
    imageId: number
    type: ProductImageType
    name?: string
    image: Image
  },
): Promise<MarketingImageManifest> => {
  const plan = createGalleryMarketingAssetPlan(input as any)
  const variants = await writeImageVariants(zip, {
    imageId: plan.imageId,
    basePath: plan.basePath,
    image: plan.image,
  })
  return {
    imageId: plan.imageId,
    relationId: plan.relationId,
    type: plan.type,
    sourceType: plan.sourceType,
    name: plan.name,
    variants: toVariantMap(variants),
  }
}
