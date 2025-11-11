export interface IconAssetVO {
  id: number
  iconId: number
  sourceType: string
  format: string
  displayType: string
  svgContent?: string
  imageUrl?: string
  previewUrl?: string
  author?: string
  license?: string
  tags?: string
  version?: number
  isActive?: number
}

export interface WeatherConditionAssetsVO {
  condition: string
  iconUnicode?: string
  iconId?: number
  asset?: IconAssetVO
}
