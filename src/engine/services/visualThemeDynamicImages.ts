import type { VisualTheme } from '@/types/visualTheme'

/** Replace only frame resources; timing, order, geometry and visibility belong to the base. */
export function resolveDynamicImagePatch(
  base: Record<string, any>, theme: VisualTheme,
): Record<string, unknown> {
  if (base.eleType !== 'dynamicImage' || !Array.isArray(base.items)) return {}
  const overrides = theme.dynamicImages?.[String(base.id)]
  return {
    items: base.items.map((item: Record<string, any>) => {
      const copy = JSON.parse(JSON.stringify(item))
      const asset = overrides?.[String(item.id)]
      if (!asset) return copy
      return { ...copy, imageUrl: asset.imageUrl, assetId: asset.assetId ?? undefined }
    }),
  }
}
