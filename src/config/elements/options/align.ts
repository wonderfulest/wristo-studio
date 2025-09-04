import type { OptionFormat, HorizontalAlign } from '@/types/settings'

type AlignOption = OptionFormat<HorizontalAlign> & { icon: string }

// Horizontal align options
export const originXOptions: AlignOption[] = [
  { value: 'left' as const, label: 'Align Left', example: 'Align Left', icon: 'mdi:format-align-left' },
  { value: 'center' as const, label: 'Align Center', example: 'Align Center', icon: 'mdi:format-align-center' },
  { value: 'right' as const, label: 'Align Right', example: 'Align Right', icon: 'mdi:format-align-right' },
]
