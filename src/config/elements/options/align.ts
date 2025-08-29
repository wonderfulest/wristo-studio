import type { OptionFormat, HorizontalAlign } from '@/types/settings'

// Horizontal align options
export const originXOptions: OptionFormat<HorizontalAlign>[] = [
  { value: 'left', label: 'Align Left', example: 'Align Left' },
  { value: 'center', label: 'Align Center', example: 'Align Center' },
  { value: 'right', label: 'Align Right', example: 'Align Right' },
]
