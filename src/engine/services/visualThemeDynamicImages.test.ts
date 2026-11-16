import { expect, it } from 'vitest'
import { normalizeVisualThemesConfig, validateVisualThemes } from './visualThemeService'
import { createVisualThemePreviewController } from './visualThemePreviewService'
import { projectDefaultVisualThemeForLoad, restoreVisualThemeBaseFieldsForPersistence } from './defaultVisualThemeLoadService'
import { validateWrtCapabilities } from './wrtCapabilities'

const elements = [{ id: 'turtle', eleType: 'dynamicImage', left: 20, active: true, items: [
  { id: 'paddle', imageUrl: 'base.png', assetId: 42, expression: { type: 'literal', value: true } },
  { id: 'rest', imageUrl: 'rest.png', expression: { type: 'literal', value: true } },
] }]
const visualThemes: any = { version: 1, enabled: true, selectionMode: 'user', defaultThemeId: 'mint', themes: [
  { id: 'mint', name: 'Mint', assets: {}, colors: {}, dynamicImages: { turtle: { paddle: { assetId: 91, imageUrl: 'mint.png' } } } },
  { id: 'base', name: 'Base', assets: {}, colors: {} },
] }

it('preserves independent theme frame references during normalization', () => {
  const result: any = normalizeVisualThemesConfig(visualThemes)
  expect(result.themes[0].dynamicImages).toEqual(visualThemes.themes[0].dynamicImages)
  result.themes[0].dynamicImages.turtle.paddle.imageUrl = 'changed'
  expect(visualThemes.themes[0].dynamicImages.turtle.paddle.imageUrl).toBe('mint.png')
})

it('previews theme frames, inherits missing frames and restores base without changing rules', async () => {
  const live = structuredClone(elements)
  const preview = createVisualThemePreviewController({
    getBaseElements: () => elements, getCanvasElements: () => live,
    applyElement: async (element, patch, context) => { expect(context.persist).toBe(false); Object.assign(element, patch) },
    requestRender: () => {},
  })
  await preview.preview(visualThemes, 'mint')
  expect(live[0].items[0]).toMatchObject({ imageUrl: 'mint.png', assetId: 91, expression: elements[0].items[0].expression })
  expect(live[0].items[1]).toEqual(elements[0].items[1])
  await preview.preview(visualThemes, 'base')
  expect(live).toEqual(elements)
  await preview.preview(visualThemes, 'mint')
  await preview.restore()
  expect(live).toEqual(elements)
})

it('projects default theme and persists original frame assets', () => {
  const config: any = { elements, visualThemes, properties: {} }
  const projected = projectDefaultVisualThemeForLoad(config)
  expect((projected.elements[0] as any).items[0].imageUrl).toBe('mint.png')
  expect(restoreVisualThemeBaseFieldsForPersistence(projected.elements, elements as any)).toEqual(elements)
  expect(config.elements).toEqual(elements)
})

it('rejects dangling frame IDs and invalid asset references', () => {
  expect(validateVisualThemes(visualThemes, elements)).toEqual([])
  for (const dynamicImages of [
    { missing: { paddle: { assetId: 1, imageUrl: 'x' } } },
    { turtle: { missing: { assetId: 1, imageUrl: 'x' } } },
    { turtle: { paddle: { assetId: -1, imageUrl: 'x' } } },
    { turtle: { paddle: { assetId: null, imageUrl: null } } },
    { turtle: { paddle: { assetId: null, imageUrl: 'blob:unpersisted' } } },
  ]) {
    const config = structuredClone(visualThemes)
    config.themes[0].dynamicImages = dynamicImages
    expect(validateVisualThemes(config, elements).length).toBeGreaterThan(0)
  }
})

it('requires a v3 capability declaration for dynamic theme frames', () => {
  const config = { elements, visualThemes }
  expect(validateWrtCapabilities({ version: 2 }, config).length).toBeGreaterThan(0)
  expect(validateWrtCapabilities({ version: 3 }, config).length).toBeGreaterThan(0)
  expect(validateWrtCapabilities({ version: 3, requiredFeatures: ['visual-theme-dynamic-images-v1'] }, config)).toEqual([])
})
