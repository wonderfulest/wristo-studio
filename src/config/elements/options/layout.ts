import { layoutIcons } from '../../icons.ts'
import type { LayoutOption } from '@/types/settings'

export const LayoutOptions: LayoutOption[] = [
  { value: ':LAYOUT_TYPES_CENTER', label: 'Align Center Horizontally', icon: layoutIcons[':LAYOUT_TYPES_CENTER'] },
  { value: ':LAYOUT_TYPES_LEFT', label: 'Align Left Horizontally', icon: layoutIcons[':LAYOUT_TYPES_LEFT'] },
  { value: ':LAYOUT_TYPES_RIGHT', label: 'Align Right Horizontally', icon: layoutIcons[':LAYOUT_TYPES_RIGHT'] },
]
