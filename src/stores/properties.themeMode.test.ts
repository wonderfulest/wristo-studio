// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePropertiesStore } from './properties'

describe('propertiesStore color theme ownership', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('updates themeMode only for color properties through an explicit action', () => {
    const store = usePropertiesStore()
    store.loadProperties({
      Accent: { type: 'color', title: 'Accent', value: '0xFFFFFF', themeMode: 'user' },
      Label: { type: 'text', title: 'Label', value: 'Text' },
    })

    store.setColorThemeMode('Accent', 'theme')
    store.setColorThemeMode('Label', 'theme')

    expect(store.properties.Accent.themeMode).toBe('theme')
    expect(store.properties.Label.themeMode).toBeUndefined()
  })
})
