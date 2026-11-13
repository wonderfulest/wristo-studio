import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useVisualThemeStore } from '@/stores/visualThemeStore'
import type { PropertiesMap } from '@/types/properties'
import { decodeThemeColorCode, encodeThemeColorCode } from './themeColorCode'

const properties = {
  blue: { type: 'color', title: 'Color', value: '#00f', sortOrder: 9 },
  red: { type: 'color', title: 'Color', value: 'rgb(255, 0, 0)', sortOrder: 1 },
  text: { type: 'text', title: 'Text', value: 'ignored' },
} as PropertiesMap

describe('theme color code', () => {
  it('uses packaging order and preserves black, leading zeros and lowercase input', () => {
    expect(encodeThemeColorCode(properties)).toBe('FF00000000FF')
    expect(decodeThemeColorCode('000000aabbcc', properties)).toEqual({ red: '0x000000', blue: '0xAABBCC' })
    expect(encodeThemeColorCode(properties, { red: '0x000000' })).toBe('0000000000FF')
    expect(encodeThemeColorCode(properties, { red: '-1' })).toBe('')
  })
  it('rejects the entire invalid code rather than partially applying it', () => {
    for (const code of ['', 'FF0000', 'FF00000000FG', '#FF00000000FF', 'FF0000-0000FF', ' FF00000000FF']) {
      expect(decodeThemeColorCode(code, properties)).toBeNull()
    }
  })
  it('persists applied and randomized colors on the selected theme through hydration', () => {
    setActivePinia(createPinia())
    const store = useVisualThemeStore()
    store.hydrate({ version: 1, enabled: true, selectionMode: 'user', defaultThemeId: 'one', themes: [
      { id: 'one', name: 'One', assets: {}, colors: { red: '0xFF0000', blue: '0x0000FF' } },
      { id: 'two', name: 'Two', assets: {}, colors: { red: '0xFFFFFF', blue: '0xFFFFFF' } },
    ] })
    expect(store.applyColorCode('one', '000000aabbcc', properties)).toBe(true)
    expect(store.requireTheme('one').colors).toEqual({ red: '0x000000', blue: '0xAABBCC' })
    expect(store.applyColorCode('one', 'FFFFFF12345Z', properties)).toBe(false)
    expect(store.requireTheme('one').colors?.red).toBe('0x000000')
    expect(store.requireTheme('two').colors?.red).toBe('0xFFFFFF')
    store.randomizeColors('one', () => 0.4)
    const code = encodeThemeColorCode(properties, store.requireTheme('one').colors)
    expect(code).toMatch(/^[0-9A-F]{12}$/)
    store.hydrate(JSON.parse(JSON.stringify(store.config)))
    expect(encodeThemeColorCode(properties, store.requireTheme('one').colors)).toBe(code)
  })
})
