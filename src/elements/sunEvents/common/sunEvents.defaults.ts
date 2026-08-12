import defaultIndicatorSvg from '@/assets/elements/sun-events-current-time-indicator.svg?raw'
import type { SunEventIndicatorBase } from '@/types/elements/sunEvents'

export const DEFAULT_SUN_EVENT_INDICATOR_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(defaultIndicatorSvg.trim())}`

export function normalizeSunEventIndicator<T extends Partial<SunEventIndicatorBase>>(
  indicator: T | null | undefined,
): T & SunEventIndicatorBase {
  const current = indicator ?? ({} as T)
  const hasSource = Boolean(String(current.imageSvg ?? '').trim() || String(current.imageUrl ?? '').trim())
  return {
    width: 16,
    height: 16,
    ...current,
    ...(hasSource ? {} : {
      imageSvg: DEFAULT_SUN_EVENT_INDICATOR_SVG,
      imageUrl: DEFAULT_SUN_EVENT_INDICATOR_SVG,
    }),
  } as T & SunEventIndicatorBase
}
