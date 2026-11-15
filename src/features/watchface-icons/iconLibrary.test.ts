import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
vi.mock('@/utils/amoledIconCandidates', () => ({ getAmoledIconCandidateFromElement: () => null }))
import { collectAvailableIcons } from './watchfaceIcons'
import { useDesignStore } from '@/stores/designStore'

beforeEach(() => {
  setActivePinia(createPinia())
})
it('lists unused catalog icons, deduplicates shared glyphs and keeps custom references separate', () => {
  const options = [
    { iconUnicode: '0063', settingsLabel: { eng: 'Heart', zhs: '心率' }, metricSymbol: 'HR' },
    { iconUnicode: '0063', settingsLabel: { eng: 'Resting heart', zhs: '静息心率' }, metricSymbol: 'RHR' },
    { iconUnicode: '0064', settingsLabel: { eng: 'Battery', zhs: '电量' }, metricSymbol: 'BAT' }
  ] as any
  const assets = [{ id: 'custom:1', name: 'Smile', imageUrl: 'data:image/png;base64,a', kind: 'custom' }] as any
  const elements = [{ id: 'a', eleType: 'icon', config: { iconUnicode: '0063', customIconId: 'custom:1' } }] as any
  const result = collectAvailableIcons(elements, options, assets, 'wristo-icon', 'zh')
  expect(result).toHaveLength(3)
  expect(result.find((i) => i.unicode === '0063')?.elements).toHaveLength(0)
  expect(result.find((i) => i.key === 'custom:1')?.elements).toHaveLength(1)
  expect(result.some((i) => i.label.includes('静息心率'))).toBe(true)
})
it('hydrates an independent library and clears it when opening an older project', () => {
  const store = useDesignStore()
  const assets = [{ id: 'custom:1', kind: 'custom', name: 'Smile', imageUrl: 'data:image/png;base64,a' }]
  store.setWatchfaceIcons(assets)
  assets[0].name = 'Changed'
  expect(store.watchfaceIcons[0].name).toBe('Smile')
  store.setWatchfaceIcons(undefined)
  expect(store.watchfaceIcons).toEqual([])
})
