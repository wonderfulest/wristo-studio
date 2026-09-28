import type { DynamicImageElementConfig, DynamicImageItem } from '@/types/elements/dynamicImage'

export function usesGoalProgress(config: Pick<DynamicImageElementConfig, 'selectionMode' | 'goalProperty'>): boolean {
  return config.selectionMode === 'goalProgress' || (!config.selectionMode && Boolean(config.goalProperty))
}

export function initializeGoalStages(items: DynamicImageItem[]): DynamicImageItem[] {
  return items.map((item, index) => ({ ...item, minProgress: item.minProgress ?? Math.round(index * 100 / Math.max(1, items.length - 1)) / 100 }))
}

export function nextGoalThreshold(items: DynamicImageItem[]): number | undefined {
  const used = new Set(items.map(item => Math.round(Number(item.minProgress) * 100)))
  for (let percent = 0; percent <= 100; percent += 20) if (!used.has(percent)) return percent / 100
  for (let percent = 0; percent <= 100; percent++) if (!used.has(percent)) return percent / 100
}
