import type { SubDialContentConfig, SubDialContentKey, SubDialRangeMode } from '@/types/elements/subDial'
import { applySubDialLayoutPreset, type SubDialLayoutPreset } from './subDial.layout'

export function buildContentItemPatch(
  content: SubDialContentConfig,
  key: SubDialContentKey,
  next: Partial<SubDialContentConfig[SubDialContentKey]>,
) {
  return { content: { ...content, [key]: { ...content[key], ...next } } as SubDialContentConfig }
}

export function buildLayoutPresetPatch(content: SubDialContentConfig, preset: SubDialLayoutPreset) {
  return { content: applySubDialLayoutPreset(content, preset) }
}

export function buildSubDialRangePatch(
  rangeMode: SubDialRangeMode,
  minValue: number,
  maxValue: number,
) {
  if (rangeMode === 'percentage') {
    return { rangeMode, minValue: 0, maxValue: 100 }
  }
  if (![minValue, maxValue].every(Number.isFinite) || maxValue <= minValue) {
    throw new Error('Maximum must be greater than minimum')
  }
  return { rangeMode, minValue, maxValue }
}

export function buildSubDialPointerAssetPatch(
  fallbackUrl: string,
  asset: { id?: string | number; file?: { url?: string | null; previewUrl?: string | null } } | null | undefined,
) {
  const imageUrl = String(asset?.file?.url || asset?.file?.previewUrl || fallbackUrl || '')
  return {
    style: 'image' as const,
    assetId: asset?.id == null ? null : String(asset.id),
    imageUrl,
  }
}
