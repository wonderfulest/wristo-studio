import { describe, expect, it } from 'vitest'
import { normalizeVisualThemesConfig } from './visualThemeService'
import { projectDefaultVisualThemeForLoad, restoreVisualThemeBaseFieldsForPersistence } from './defaultVisualThemeLoadService'
import { createVisualThemePreviewController } from './visualThemePreviewService'

describe('center cap theme geometry', () => {
  it('roundtrips overrides, switches to inherited geometry and restores the base', async () => {
    const base = { id: 'cap', eleType: 'centerCap', imageUrl: 'base.svg', assetId: 1, left: 227, top: 227, targetSize: 30 }
    const themes: any = { version: 1, enabled: true, defaultThemeId: 'custom', selectionMode: 'user', themes: [
      { id: 'custom', name: 'Custom', assets: { centerCap: { assetId: 2, imageUrl: 'theme.svg', left: 0, top: 100, targetSize: 40 } } },
      { id: 'inherited', name: 'Inherited', assets: { centerCap: { assetId: 3, imageUrl: 'other.svg' } } },
    ] }
    const normalized = normalizeVisualThemesConfig(JSON.parse(JSON.stringify(themes)))
    expect(normalized.themes[0].assets.centerCap).toEqual(themes.themes[0].assets.centerCap)
    const source: any = { elements: [base], properties: {}, visualThemes: normalized }
    const display = projectDefaultVisualThemeForLoad(source)
    expect(display.elements[0]).toMatchObject({ left: 0, top: 100, targetSize: 40 })
    expect(restoreVisualThemeBaseFieldsForPersistence(display.elements, source.elements)).toEqual([base])
    const live = { ...base }
    const preview = createVisualThemePreviewController({
      getBaseElements: () => [base], getCanvasElements: () => [live],
      applyElement: async (_, patch) => { Object.assign(live, patch) }, requestRender: () => {},
    })
    await preview.preview(normalized, 'custom')
    expect(live).toMatchObject({ left: 0, top: 100, targetSize: 40 })
    await preview.preview(normalized, 'inherited')
    expect(live).toMatchObject({ left: 227, top: 227, targetSize: 30, imageUrl: 'other.svg' })
    await preview.restore()
    expect(live).toEqual(base)
  })
})
