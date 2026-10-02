import type { BaseElementConfig } from './base'
export interface ComplicationElementConfig extends BaseElementConfig {
  eleType: 'complication'
  complicationType: number
  complicationProperty?: string
  displayMode: 'value' | 'label' | 'shortcut' | 'icon' | 'iconValue' | 'progress'
  displayWidth?: number
  displayHeight?: number
  iconSource?: 'auto' | 'custom'
  customIcon?: string
  iconSize?: number
  iconGap?: number
  backgroundShape?: 'none' | 'circle' | 'rounded'
  backgroundColor?: string
  progressRange?: 'source' | 'custom'
  progressMin?: number
  progressMax?: number
  progressThickness?: number
  progressTrackColor?: string
  touchMode?: 'auto' | 'custom'
  touchShape?: 'rectangle' | 'circle'
  touchPadding?: number
  touchOffsetX?: number
  touchOffsetY?: number
  touchWidth: number
  touchHeight: number
  launchOnPress: boolean
  fillProperty?: string | null
}
