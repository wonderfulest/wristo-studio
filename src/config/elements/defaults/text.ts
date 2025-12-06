import type { TextElementConfig } from '@/types/elements'
import { DEFAULT_TEXT_CONFIG, type EDITOR_ELEMENT } from './base'

export const DEFAULT_TEXT_ELEMENT_CONFIG: TextElementConfig & EDITOR_ELEMENT = Object.assign(
  {
    icon: 'mdi:format-text',
    label: 'Text',
    eleType: 'text' as const,
  },
  DEFAULT_TEXT_CONFIG,
  {

  }
)

export const DEFAULT_SCROLLABLE_TEXT_ELEMENT_CONFIG: TextElementConfig & EDITOR_ELEMENT =
  Object.assign(
    {
      icon: 'mdi:format-text-rotation-none-variant',
      label: 'Scrollable Text',
      eleType: 'scrollableText' as const,
    },
    DEFAULT_TEXT_CONFIG,
  )

export const DEFAULT_ANGLED_TEXT_ELEMENT_CONFIG: TextElementConfig & EDITOR_ELEMENT = Object.assign(
  {
    icon: 'mdi:format-text-rotation-down',
    label: 'Angled Text',
    eleType: 'angledText' as const,
  },
  DEFAULT_TEXT_CONFIG,
)

export const DEFAULT_RADIAL_TEXT_ELEMENT_CONFIG: TextElementConfig & EDITOR_ELEMENT = Object.assign(
  {
    icon: 'mdi:alpha-r-circle-outline',
    label: 'Radial Text',
    eleType: 'radialText' as const,
  },
  DEFAULT_TEXT_CONFIG,
  {
    fill: '#FFFFFF',
  }
)