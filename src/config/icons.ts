export type AlignmentIconKey = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
export type LayoutIconKey = ':LAYOUT_TYPES_CENTER' | ':LAYOUT_TYPES_LEFT' | ':LAYOUT_TYPES_RIGHT'

export const alignmentIcons: Record<AlignmentIconKey, string> = {
  left: 'mdi:format-align-left',
  center: 'mdi:format-align-center',
  right: 'mdi:format-align-right',
  top: 'mdi:format-align-top',
  middle: 'mdi:format-align-middle',
  bottom: 'mdi:format-align-bottom',
}

export const layoutIcons: Record<LayoutIconKey, string> = {
  ':LAYOUT_TYPES_CENTER': 'mdi:format-horizontal-align-center',
  ':LAYOUT_TYPES_LEFT': 'mdi:format-horizontal-align-left',
  ':LAYOUT_TYPES_RIGHT': 'mdi:format-horizontal-align-right',
}

export const allIconsList: string[] = [
  ...Object.values(alignmentIcons),
  ...Object.values(layoutIcons),
]
