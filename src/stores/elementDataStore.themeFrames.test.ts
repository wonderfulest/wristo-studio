// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useElementDataStore } from './elementDataStore'
import { useVisualThemeStore } from './visualThemeStore'

beforeEach(() => { setActivePinia(createPinia()) })
it.each(['patch', 'replace', 'remove'])('prunes frame overrides after base %s', (operation) => {
  const elements = useElementDataStore(), themes = useVisualThemeStore()
  elements.upsertElement({ id: 'animal', eleType: 'dynamicImage', items: [{ id: 'a' }, { id: 'b' }] } as any)
  themes.hydrate({ version: 1, enabled: true, selectionMode: 'user', defaultThemeId: 'blue', themes: [
    { id: 'blue', name: 'Blue', assets: {}, dynamicImages: { animal: { a: { assetId: 1, imageUrl: 'a' }, b: { assetId: 2, imageUrl: 'b' } } } },
  ] })
  if (operation === 'patch') elements.patchElement('animal', { items: [{ id: 'b' }] } as any)
  else if (operation === 'replace') elements.upsertElement({ id: 'animal', eleType: 'dynamicImage', items: [{ id: 'b' }] } as any)
  else elements.removeElement('animal')
  expect(themes.themes[0].dynamicImages).toEqual(operation === 'remove' ? undefined : { animal: { b: { assetId: 2, imageUrl: 'b' } } })
})
