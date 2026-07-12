import type { AnalogAssetType } from '@/types/api/analog-asset'

const editableSvgAssetTypes = new Set<AnalogAssetType>([
  'image',
  'hour',
  'minute',
  'second',
  'center_cap',
  'tick12',
  'tick60',
])

const isSvgSource = (value?: string): boolean =>
  String(value || '').split('?')[0].toLowerCase().endsWith('.svg')

export const isEditableSvgAssetSource = (
  assetType: AnalogAssetType,
  url?: string,
  name?: string,
): boolean => editableSvgAssetTypes.has(assetType) && (isSvgSource(url) || isSvgSource(name))
