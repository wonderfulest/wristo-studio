export type DesignOriginalType = 'original' | 'non_original'
export type DesignSourcePlatform = 'ai' | 'facer' | 'wfb' | 'google_play'

export const DESIGN_SOURCE_PLATFORM_OPTIONS: Array<{ value: DesignSourcePlatform; label: string }> = [
  { value: 'ai', label: 'AI' },
  { value: 'facer', label: 'Facer' },
  { value: 'wfb', label: 'WFB' },
  { value: 'google_play', label: 'Google Play' },
]

export const requiresDesignSourceId = (platform?: DesignSourcePlatform | '') => Boolean(platform && platform !== 'ai')
